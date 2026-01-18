"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { generateShoppingList } from "@/lib/shopping-list-generator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
}

interface MealPlan {
  id: string
  name: string
  start_date: string
  end_date: string
}

const mealTypes = [
  { type: "breakfast", emoji: "🌅" },
  { type: "lunch", emoji: "🍽️" },
  { type: "dinner", emoji: "🌙" },
  { type: "snack", emoji: "🥜" },
]

export default function WeeklyPlannerTab() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [planName, setPlanName] = useState("")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedMealType, setSelectedMealType] = useState<string>("")
  const [selectedRecipeId, setSelectedRecipeId] = useState("")
  const [servings, setServings] = useState("1")
  const [searchRecipe, setSearchRecipe] = useState("")
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchMealPlan()
    fetchRecipes()
  }, [])

  useEffect(() => {
    if (mealPlan) {
      fetchMeals()
    }
  }, [mealPlan])

  useEffect(() => {
    if (searchRecipe.trim()) {
      const filtered = recipes.filter((r) => r.title.toLowerCase().includes(searchRecipe.toLowerCase()))
      setFilteredRecipes(filtered)
    } else {
      setFilteredRecipes(recipes)
    }
  }, [searchRecipe, recipes])

  const fetchMealPlan = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("start_date", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code === "PGRST116") {
        setShowCreatePlan(true)
      } else if (error) {
        throw error
      } else {
        setMealPlan(data)
      }
    } catch (error) {
      console.error("Error fetching meal plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMeals = async () => {
    if (!mealPlan) return

    try {
      const { data, error } = await supabase
        .from("meal_plan_entries")
        .select("*, recipes(title)")
        .eq("meal_plan_id", mealPlan.id)
        .gte("meal_date", mealPlan.start_date)
        .lte("meal_date", mealPlan.end_date)

      if (error && error.code !== "PGRST116") throw error
      setMeals(
        data?.map((item: any) => ({
          ...item,
          recipe_title: item.recipes?.title,
        })) || [],
      )
    } catch (error) {
      console.error("Error fetching meals:", error)
    }
  }

  const fetchRecipes = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data, error } = await supabase
        .from("recipes")
        .select("id, title")
        .or(`is_public.eq.true,user_id.eq.${authData.user.id}`)
        .order("title")

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error fetching recipes:", error)
    }
  }

  const createNewMealPlan = async () => {
    if (!planName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a plan name",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const today = new Date()
      const startDate = today.toISOString().split("T")[0]
      const endDate = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("meal_plans")
        .insert({
          user_id: authData.user.id,
          name: planName,
          start_date: startDate,
          end_date: endDate,
        })
        .select()
        .single()

      if (error) throw error

      setMealPlan(data)
      setPlanName("")
      setShowCreatePlan(false)
      toast({
        title: "Success",
        description: "Meal plan created",
      })
    } catch (error) {
      console.error("Error creating meal plan:", error)
      toast({
        title: "Error",
        description: "Failed to create meal plan",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addMeal = async () => {
    if (!selectedRecipeId || !selectedDate || !selectedMealType) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("meal_plan_entries").insert({
        meal_plan_id: mealPlan?.id,
        recipe_id: selectedRecipeId,
        meal_date: selectedDate,
        meal_type: selectedMealType,
        servings: Number.parseInt(servings) || 1,
      })

      if (error) throw error

      toast({ title: "Success", description: "Meal added to plan" })
      setSelectedRecipeId("")
      setSelectedDate("")
      setSelectedMealType("")
      setServings("1")
      setIsDialogOpen(false)
      setSearchRecipe("")
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
      const { error } = await supabase.from("meal_plan_entries").delete().eq("id", id)

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

  const generateShoppingListFromPlan = async () => {
    if (!mealPlan) return

    setIsGenerating(true)
    try {
      const result = await generateShoppingList(mealPlan.id, mealPlan.start_date, mealPlan.end_date)
      toast({
        title: "Success",
        description: `Shopping list created with ${result.itemCount} items`,
      })
    } catch (error) {
      console.error("Error generating shopping list:", error)
      toast({
        title: "Error",
        description: "Failed to generate shopping list",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading meal plan...</div>
  }

  if (showCreatePlan) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Create Your First Meal Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              placeholder="e.g., Weekly Meal Plan"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreatePlan(false)}>
              Cancel
            </Button>
            <Button onClick={createNewMealPlan} disabled={isSaving} className="bg-primary text-primary-foreground">
              {isSaving ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getDateRange = () => {
    if (!mealPlan) return []
    const dates = []
    const current = new Date(mealPlan.start_date)
    while (current <= new Date(mealPlan.end_date)) {
      dates.push(current.toISOString().split("T")[0])
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">{mealPlan?.name}</h2>
          <p className="text-muted-foreground">
            {new Date(mealPlan?.start_date || "").toLocaleDateString()} -{" "}
            {new Date(mealPlan?.end_date || "").toLocaleDateString()}
          </p>
        </div>
        <Button
          onClick={generateShoppingListFromPlan}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground"
        >
          {isGenerating ? "Generating..." : "Generate Shopping List"}
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meal to Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meal-date">Date</Label>
              <select
                id="meal-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Select date</option>
                {getDateRange().map((date) => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meal-type">Meal Type</Label>
              <select
                id="meal-type"
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Select meal type</option>
                {mealTypes.map((mt) => (
                  <option key={mt.type} value={mt.type}>
                    {mt.emoji} {mt.type.charAt(0).toUpperCase() + mt.type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meal-recipe-search">Search Recipe</Label>
              <Input
                id="meal-recipe-search"
                placeholder="Search recipes..."
                value={searchRecipe}
                onChange={(e) => setSearchRecipe(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meal-recipe">Select Recipe</Label>
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
              <Label htmlFor="meal-servings">Servings</Label>
              <Input
                id="meal-servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min="1"
                max="10"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addMeal} className="bg-primary text-primary-foreground">
                Add Meal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {getDateRange().map((date) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-lg">
                {new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mealTypes.map((mt) => {
                  const meal = meals.find((m) => m.meal_date === date && m.meal_type === mt.type)

                  return (
                    <div
                      key={`${date}-${mt.type}`}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm">
                          {mt.emoji} {mt.type.charAt(0).toUpperCase() + mt.type.slice(1)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDate(date)
                            setSelectedMealType(mt.type)
                            setIsDialogOpen(true)
                          }}
                        >
                          +
                        </Button>
                      </div>
                      {meal ? (
                        <div className="text-sm space-y-1">
                          <p>{meal.recipe_title}</p>
                          <p className="text-xs text-muted-foreground">{meal.servings} servings</p>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeMeal(meal.id)}
                            className="w-full"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Empty</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
