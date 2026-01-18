"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RecipeEditor from "@/components/recipe-editor"

interface Recipe {
  id: string
  title: string
  description: string
  image_url: string
  prep_time: number
  cook_time: number
  servings: number
  calories_per_serving: number
  user_id?: string
  is_favorite?: boolean
}

interface RecipeWithDetails extends Recipe {
  ingredients?: Array<{ ingredient_name: string; quantity: number; unit: string; category_id?: string }>
  steps?: Array<{ step_number: number; instruction: string }>
}

interface NewRecipe {
  title: string
  description: string
  prep_time: string
  cook_time: string
  servings: string
  calories_per_serving: string
  image_url: string
}

interface FilterOptions {
  maxCalories: number
  maxPrepTime: number
  servings: number
}

interface UserProfile {
  diet_type: string
  allergies: string[]
  calorie_goal: number
}

export default function RecipesTab({ currentUserId }: { currentUserId: string }) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    maxCalories: 1000,
    maxPrepTime: 120,
    servings: 0,
  })
  const [newRecipe, setNewRecipe] = useState<NewRecipe>({
    title: "",
    description: "",
    prep_time: "",
    cook_time: "",
    servings: "",
    calories_per_serving: "",
    image_url: "",
  })
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithDetails | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [recipeTab, setRecipeTab] = useState<"base" | "mine">("base")
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string>("")
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  useEffect(() => {
    fetchRecipes()
  }, [searchQuery, filters, recipeTab])

  const fetchUserProfile = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("diet_type, allergies, calorie_goal")
        .eq("id", authData.user.id)
        .single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        setUserProfile(data)
        setFilters((prev) => ({
          ...prev,
          maxCalories: data.calorie_goal || 2000,
        }))
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
  }

  const fetchRecipes = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from("recipes").select("*").ilike("title", `%${searchQuery}%`)

      if (recipeTab === "base") {
        query = query.eq("is_public", true)
      } else {
        query = query.eq("user_id", currentUserId)
      }

      if (filters.maxCalories > 0) {
        query = query.lte("calories_per_serving", filters.maxCalories)
      }

      if (filters.maxPrepTime > 0) {
        query = query.lte("prep_time", filters.maxPrepTime)
      }

      if (filters.servings > 0) {
        query = query.gte("servings", filters.servings)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error fetching recipes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecipeDetails = async (recipeId: string) => {
    try {
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", recipeId)
        .single()

      if (recipeError) throw recipeError

      const { data: ingredients } = await supabase.from("recipe_ingredients").select("*").eq("recipe_id", recipeId)

      const { data: steps } = await supabase
        .from("recipe_steps")
        .select("*")
        .eq("recipe_id", recipeId)
        .order("step_number")

      setSelectedRecipe({
        ...recipe,
        ingredients: ingredients || [],
        steps: steps || [],
      })
      setIsDetailOpen(true)
    } catch (error) {
      console.error("Error loading recipe details:", error)
      toast({
        title: "Error",
        description: "Failed to load recipe details",
        variant: "destructive",
      })
    }
  }

  const handleAddRecipe = async () => {
    if (!newRecipe.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recipe title",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) throw new Error("Not authenticated")

      const { data: newRecipeData, error } = await supabase
        .from("recipes")
        .insert({
          title: newRecipe.title,
          description: newRecipe.description,
          prep_time: Number.parseInt(newRecipe.prep_time) || 0,
          cook_time: Number.parseInt(newRecipe.cook_time) || 0,
          servings: Number.parseInt(newRecipe.servings) || 1,
          calories_per_serving: Number.parseInt(newRecipe.calories_per_serving) || 0,
          image_url: newRecipe.image_url || "/placeholder.svg",
          is_public: false,
          user_id: authData.user.id,
        })
        .select()
        .single()

      if (error) throw error

      setEditingRecipeId(newRecipeData.id)
      setIsEditorOpen(true)

      toast({
        title: "Success",
        description: "Recipe created! Now add ingredients and steps.",
      })

      setNewRecipe({
        title: "",
        description: "",
        prep_time: "",
        cook_time: "",
        servings: "",
        calories_per_serving: "",
        image_url: "",
      })
      setIsOpen(false)
    } catch (error) {
      console.error("Error adding recipe:", error)
      toast({
        title: "Error",
        description: "Failed to create recipe",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteRecipe = async (recipeId: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return

    try {
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Recipe deleted",
      })

      setIsDetailOpen(false)
      await fetchRecipes()
    } catch (error) {
      console.error("Error deleting recipe:", error)
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      })
    }
  }

  const copyRecipeToMine = async (baseRecipe: Recipe) => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) throw new Error("Not authenticated")

      // Create a copy of the recipe for the user
      const { data: copiedRecipe, error } = await supabase
        .from("recipes")
        .insert({
          title: baseRecipe.title,
          description: baseRecipe.description,
          prep_time: baseRecipe.prep_time,
          cook_time: baseRecipe.cook_time,
          servings: baseRecipe.servings,
          calories_per_serving: baseRecipe.calories_per_serving,
          image_url: baseRecipe.image_url,
          is_public: false,
          user_id: authData.user.id,
        })
        .select()
        .single()

      if (error) throw error

      // Copy all ingredients
      const { data: ingredients } = await supabase.from("recipe_ingredients").select("*").eq("recipe_id", baseRecipe.id)

      if (ingredients && ingredients.length > 0) {
        const ingredientsToInsert = ingredients.map((ing) => ({
          recipe_id: copiedRecipe.id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          category_id: ing.category_id,
        }))

        await supabase.from("recipe_ingredients").insert(ingredientsToInsert)
      }

      // Copy all steps
      const { data: steps } = await supabase
        .from("recipe_steps")
        .select("*")
        .eq("recipe_id", baseRecipe.id)
        .order("step_number")

      if (steps && steps.length > 0) {
        const stepsToInsert = steps.map((step) => ({
          recipe_id: copiedRecipe.id,
          step_number: step.step_number,
          instruction: step.instruction,
        }))

        await supabase.from("recipe_steps").insert(stepsToInsert)
      }

      toast({
        title: "Success",
        description: "Recipe copied to your recipes",
      })

      setRecipeTab("mine")
      await fetchRecipes()
    } catch (error) {
      console.error("Error copying recipe:", error)
      toast({
        title: "Error",
        description: "Failed to copy recipe",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Recipe Library</h2>
          <p className="text-muted-foreground">Discover and manage your recipes</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Create Recipe</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Recipe Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Grilled Chicken Pasta"
                  value={newRecipe.title}
                  onChange={(e) => setNewRecipe((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  placeholder="Brief description of the recipe..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  rows={3}
                  value={newRecipe.description}
                  onChange={(e) => setNewRecipe((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prep-time">Prep Time (min)</Label>
                  <Input
                    id="prep-time"
                    type="number"
                    placeholder="15"
                    value={newRecipe.prep_time}
                    onChange={(e) => setNewRecipe((prev) => ({ ...prev, prep_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cook-time">Cook Time (min)</Label>
                  <Input
                    id="cook-time"
                    type="number"
                    placeholder="30"
                    value={newRecipe.cook_time}
                    onChange={(e) => setNewRecipe((prev) => ({ ...prev, cook_time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    type="number"
                    placeholder="4"
                    value={newRecipe.servings}
                    onChange={(e) => setNewRecipe((prev) => ({ ...prev, servings: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories per Serving</Label>
                  <Input
                    id="calories"
                    type="number"
                    placeholder="350"
                    value={newRecipe.calories_per_serving}
                    onChange={(e) => setNewRecipe((prev) => ({ ...prev, calories_per_serving: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  placeholder="https://example.com/image.jpg"
                  value={newRecipe.image_url}
                  onChange={(e) => setNewRecipe((prev) => ({ ...prev, image_url: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRecipe}
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSaving ? "Creating..." : "Create Recipe"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={recipeTab} onValueChange={(value) => setRecipeTab(value as "base" | "mine")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="base">Base Recipes</TabsTrigger>
          <TabsTrigger value="mine">My Recipes</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="space-y-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-primary text-primary-foreground" : ""}
              >
                Filters
              </Button>
            </div>

            {showFilters && (
              <Card className="p-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-calories">Max Calories</Label>
                    <Input
                      id="max-calories"
                      type="number"
                      value={filters.maxCalories}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, maxCalories: Number.parseInt(e.target.value) }))
                      }
                      min="0"
                      max="2000"
                      step="50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-prep-time">Max Prep Time (min)</Label>
                    <Input
                      id="max-prep-time"
                      type="number"
                      value={filters.maxPrepTime}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, maxPrepTime: Number.parseInt(e.target.value) }))
                      }
                      min="0"
                      max="240"
                      step="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="servings">Min Servings</Label>
                    <Input
                      id="servings"
                      type="number"
                      value={filters.servings}
                      onChange={(e) => setFilters((prev) => ({ ...prev, servings: Number.parseInt(e.target.value) }))}
                      min="0"
                      max="12"
                      step="1"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="pt-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => loadRecipeDetails(recipe.id)}
                >
                  <div className="relative h-48 bg-muted">
                    <Image
                      src={recipe.image_url || "/placeholder.svg"}
                      alt={recipe.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="pt-4 space-y-2">
                    <h3 className="font-semibold text-lg">{recipe.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
                    <div className="flex justify-between text-xs text-muted-foreground pt-2">
                      <span>⏱️ {recipe.prep_time + recipe.cook_time}min</span>
                      <span>🍽️ {recipe.servings} servings</span>
                      <span>🔥 {recipe.calories_per_serving} cal</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && recipes.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground mb-4">No recipes found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="pt-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => loadRecipeDetails(recipe.id)}
                >
                  <div className="relative h-48 bg-muted">
                    <Image
                      src={recipe.image_url || "/placeholder.svg"}
                      alt={recipe.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="pt-4 space-y-2">
                    <h3 className="font-semibold text-lg">{recipe.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
                    <div className="flex justify-between text-xs text-muted-foreground pt-2">
                      <span>⏱️ {recipe.prep_time + recipe.cook_time}min</span>
                      <span>🍽️ {recipe.servings} servings</span>
                      <span>🔥 {recipe.calories_per_serving} cal</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && recipes.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground mb-4">No recipes yet</p>
                <Button variant="outline" onClick={() => setIsOpen(true)}>
                  Create Your First Recipe
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Recipe Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader className="flex flex-row items-center justify-between">
                <DialogTitle>{selectedRecipe.title}</DialogTitle>
                <div className="flex gap-2">
                  {/* Only show edit for user's own recipes */}
                  {selectedRecipe.user_id === currentUserId && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingRecipeId(selectedRecipe.id)
                          setIsEditorOpen(true)
                        }}
                        size="sm"
                      >
                        Edit Recipe
                      </Button>
                      <Button variant="destructive" onClick={() => deleteRecipe(selectedRecipe.id)} size="sm">
                        Delete
                      </Button>
                    </>
                  )}
                  {/* Show copy button for base recipes */}
                  {!selectedRecipe.user_id && (
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => copyRecipeToMine(selectedRecipe)}
                      size="sm"
                    >
                      Add to My Recipes
                    </Button>
                  )}
                </div>
              </DialogHeader>
              <div className="space-y-6">
                <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={selectedRecipe.image_url || "/placeholder.svg"}
                    alt={selectedRecipe.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{selectedRecipe.description}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Prep Time</p>
                    <p className="font-semibold">{selectedRecipe.prep_time} min</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cook Time</p>
                    <p className="font-semibold">{selectedRecipe.cook_time} min</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Servings</p>
                    <p className="font-semibold">{selectedRecipe.servings}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Calories</p>
                    <p className="font-semibold">{selectedRecipe.calories_per_serving}</p>
                  </div>
                </div>

                {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Ingredients</h3>
                    <div className="space-y-2">
                      {selectedRecipe.ingredients.map((ingredient, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{ingredient.ingredient_name}</span>
                          <span className="text-muted-foreground">
                            {ingredient.quantity} {ingredient.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRecipe.steps && selectedRecipe.steps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Instructions</h3>
                    <div className="space-y-3">
                      {selectedRecipe.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                            {step.step_number}
                          </div>
                          <p className="text-sm">{step.instruction}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                    Close
                  </Button>
                  {selectedRecipe.user_id === currentUserId && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingRecipeId(selectedRecipe.id)
                          setIsEditorOpen(true)
                        }}
                      >
                        Edit Recipe
                      </Button>
                      <Button variant="destructive" onClick={() => deleteRecipe(selectedRecipe.id)}>
                        Delete Recipe
                      </Button>
                    </>
                  )}
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Add to Meal Plan</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RecipeEditor
        recipeId={editingRecipeId}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={() => fetchRecipes()}
      />
    </div>
  )
}
