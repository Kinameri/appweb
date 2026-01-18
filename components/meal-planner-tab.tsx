"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface MealEntry {
  id: string
  meal_type: string
  recipe_id: string | null
  recipe_title?: string
  servings: number
  meal_date: string
}

interface Recipe {
  id: string
  title: string
  user_id?: string | null
}

const mealTypes = [
  { type: "breakfast", emoji: "🌅", title: "Breakfast" },
  { type: "lunch", emoji: "🍽️", title: "Lunch" },
  { type: "dinner", emoji: "🌙", title: "Dinner" },
  { type: "snack", emoji: "🥜", title: "Snack" },
]

export default function MealPlannerTab() {
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState("")
  const [searchRecipe, setSearchRecipe] = useState("")
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [servings, setServings] = useState("1")
  const supabase = createClient()
  const { toast } = useToast()

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  useEffect(() => {
    fetchMeals()
    fetchRecipes()
  }, [])

  useEffect(() => {
    if (searchRecipe.trim()) {
      const filtered = recipes.filter((r) => r.title.toLowerCase().includes(searchRecipe.toLowerCase()))
      setFilteredRecipes(filtered)
    } else {
      setFilteredRecipes(recipes)
    }
  }, [searchRecipe, recipes])

  const fetchMeals = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const today = new Date().toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("meal_plan_entries")
        .select("*, recipes(title)")
        .eq("meal_date", today)

      if (error && error.code !== "PGRST116") throw error
      setMeals(
        data?.map((item: any) => ({
          ...item,
          recipe_title: item.recipes?.title,
        })) || [],
      )
    } catch (error) {
      console.error("Error fetching meals:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRecipes = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, user_id")
        .or(`is_public.eq.true,user_id.eq.${authData.user.id}`)
        .order("title")

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error fetching recipes:", error)
    }
  }

  const getOrCreateDefaultMealPlan = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return null

      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())

      const { data: existing } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("user_id", authData.user.id)
        .gte("start_date", startOfWeek.toISOString().split("T")[0])
        .single()

      if (existing) return existing.id

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const { data: newPlan, error } = await supabase
        .from("meal_plans")
        .insert({
          user_id: authData.user.id,
          name: `Weekly Plan - ${startOfWeek.toLocaleDateString()}`,
          start_date: startOfWeek.toISOString().split("T")[0],
          end_date: endOfWeek.toISOString().split("T")[0],
        })
        .select("id")
        .single()

      if (error) throw error
      return newPlan?.id
    } catch (error) {
      console.error("Error getting meal plan:", error)
      return null
    }
  }

  const addMeal = async (mealType: string) => {
    if (!selectedRecipeId) {
      toast({
        title: "Error",
        description: "Please select a recipe",
        variant: "destructive",
      })
      return
    }

    try {
      const mealPlanId = await getOrCreateDefaultMealPlan()
      if (!mealPlanId) throw new Error("Could not create meal plan")

      const today = new Date().toISOString().split("T")[0]

      const { error } = await supabase.from("meal_plan_entries").insert({
        meal_plan_id: mealPlanId,
        meal_type: mealType,
        meal_date: today,
        recipe_id: selectedRecipeId,
        servings: Number.parseInt(servings) || 1,
      })

      if (error) throw error

      toast({ title: "Success", description: `${mealType} meal added` })

      setSelectedRecipeId("")
      setSearchRecipe("")
      setServings("1")
      setOpenDialog(null)
      await fetchMeals()
    } catch (error) {
      console.error("Error adding meal:", error)
      toast({
        title: "Error",
        description: "Failed to add meal",
        variant: "destructive",
      })
    }
  }

const removeMeal = async (id: string) => {
  try {
    const { error, data } = await supabase
      .from("meal_plan_entries")
      .delete()
      .eq("id", id)
      .select()

    console.log("delete result", { error, data })

    if (error) throw error

    toast({ title: "Success", description: "Meal removed" })
    await fetchMeals()
  } catch (error) {
    console.error("Error removing meal:", error)
    toast({
      title: "Error",
      description: "Failed to remove meal",
      variant: "destructive",
    })
  }
}


  if (isLoading) {
    return <div className="text-center py-12">Loading meals...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Today's Meals</h2>
        <p className="text-muted-foreground">{today}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {mealTypes.map(({ type, emoji, title }) => {
          const mealEntry = meals.find((m) => m.meal_type === type)

          return (
            <Card key={type} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{emoji}</span>
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={openDialog === type} onOpenChange={(open) => setOpenDialog(open ? type : null)}>
                  <DialogTrigger asChild>
                    <div className="min-h-24 p-3 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                      {mealEntry ? (
                        <div className="space-y-2">
                          <p className="font-medium">{mealEntry.recipe_title}</p>
                          <p className="text-sm text-muted-foreground">Servings: {mealEntry.servings}</p>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeMeal(mealEntry.id)
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">Click to add meal</p>
                        </div>
                      )}
                    </div>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add {title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`recipe-search-${type}`}>Search Recipe</Label>
                        <Input
                          id={`recipe-search-${type}`}
                          placeholder="Search recipes..."
                          value={searchRecipe}
                          onChange={(e) => setSearchRecipe(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`recipe-${type}`}>Select Recipe</Label>
                        <div className="max-h-48 overflow-y-auto border border-input rounded-md">
                          {filteredRecipes.map((recipe) => (
                            <div
                              key={recipe.id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border last:border-b-0"
                              onClick={() => setSelectedRecipeId(recipe.id)}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`recipe-${type}`}
                                  checked={selectedRecipeId === recipe.id}
                                  onChange={() => setSelectedRecipeId(recipe.id)}
                                />
                                <span>{recipe.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`servings-${type}`}>Servings</Label>
                        <Input
                          id={`servings-${type}`}
                          type="number"
                          value={servings}
                          onChange={(e) => setServings(e.target.value)}
                          min="1"
                          max="10"
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setOpenDialog(null)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => addMeal(type)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Add {title}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
