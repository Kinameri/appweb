"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface RecipeStep {
  id?: string
  step_number: number
  instruction: string
}

interface RecipeIngredient {
  id?: string
  ingredient_name: string
  quantity: number
  unit: string
  category_id?: string
}

interface RecipeTag {
  id?: string
  tag_name: string
}

interface IngredientCategory {
  id: string
  name: string
}

interface RecipeCategory {
  id: string
  name: string
}

interface RecipeEditorProps {
  recipeId: string
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export default function RecipeEditor({ recipeId, isOpen, onClose, onSave }: RecipeEditorProps) {
  const [recipe, setRecipe] = useState<any>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [steps, setSteps] = useState<RecipeStep[]>([])
  const [tags, setTags] = useState<RecipeTag[]>([])
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([])
  const [recipeCategories, setRecipeCategories] = useState<RecipeCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [ingredientSearch, setIngredientSearch] = useState("")
  const [filteredIngredients, setFilteredIngredients] = useState<string[]>([])
  const [newIngredient, setNewIngredient] = useState<RecipeIngredient>({
    ingredient_name: "",
    quantity: 1,
    unit: "pcs",
    category_id: "",
  })
  const [newStep, setNewStep] = useState("")
  const [newTag, setNewTag] = useState("")
  const [newRecipeCategory, setNewRecipeCategory] = useState("")
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, recipeId])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch recipe details
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", recipeId)
        .single()

      if (recipeError && recipeError.code !== "PGRST116") throw recipeError
      setRecipe(recipeData)

      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipeId)

      if (ingredientsError) throw ingredientsError

      const { data: stepsData, error: stepsError } = await supabase
        .from("recipe_steps")
        .select("*")
        .eq("recipe_id", recipeId)
        .order("step_number")

      if (stepsError) throw stepsError

      const { data: tagsData, error: tagsError } = await supabase
        .from("recipe_tags")
        .select("*")
        .eq("recipe_id", recipeId)

      if (tagsError) throw tagsError

      const { data: ingredientCatsData, error: ingredientCatsError } = await supabase
        .from("ingredient_categories")
        .select("*")

      if (ingredientCatsError) throw ingredientCatsError

      const { data: authData } = await supabase.auth.getUser()
      const { data: recipeCatsData, error: recipeCatsError } = await supabase
        .from("recipe_categories")
        .select("*")
        .or(`user_id.is.null,user_id.eq.${authData.user?.id}`)

      if (recipeCatsError) throw recipeCatsError

      setIngredients(ingredientsData || [])
      setSteps(stepsData || [])
      setTags(tagsData || [])
      setIngredientCategories(ingredientCatsData || [])
      setRecipeCategories(recipeCatsData || [])
    } catch (error) {
      console.error("Error fetching recipe data:", error)
      toast({
        title: "Error",
        description: "Failed to load recipe data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (ingredientSearch.trim().length > 0) {
      const uniqueIngredients = new Set<string>()
      ingredients.forEach((i) => uniqueIngredients.add(i.ingredient_name))

      const matches = [
        "Tomato",
        "Onion",
        "Garlic",
        "Bell Pepper",
        "Carrot",
        "Broccoli",
        "Spinach",
        "Mushroom",
        "Chicken Breast",
        "Ground Beef",
        "Salmon",
        "Pasta",
        "Rice",
        "Flour",
        "Olive Oil",
        "Butter",
        "Milk",
        "Cheese",
        "Egg",
        "Lemon",
        "Salt",
        "Pepper",
        "Soy Sauce",
        "Ginger",
        "Basil",
      ].filter((item) => item.toLowerCase().includes(ingredientSearch.toLowerCase()) && !uniqueIngredients.has(item))

      setFilteredIngredients(matches)
    } else {
      setFilteredIngredients([])
    }
  }, [ingredientSearch, ingredients])

  const addIngredient = async () => {
    if (!newIngredient.ingredient_name.trim()) {
      toast({
        title: "Error",
        description: "Please enter ingredient name",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("recipe_ingredients").insert({
        recipe_id: recipeId,
        ingredient_name: newIngredient.ingredient_name,
        quantity: newIngredient.quantity,
        unit: newIngredient.unit,
        category_id: newIngredient.category_id || null,
      })

      if (error) throw error

      toast({ title: "Success", description: "Ingredient added" })
      setNewIngredient({ ingredient_name: "", quantity: 1, unit: "pcs", category_id: "" })
      await fetchData()
    } catch (error) {
      console.error("Error adding ingredient:", error)
      toast({
        title: "Error",
        description: "Failed to add ingredient",
        variant: "destructive",
      })
    }
  }

  const removeIngredient = async (id: string) => {
    try {
      const { error } = await supabase.from("recipe_ingredients").delete().eq("id", id)
      if (error) throw error
      toast({ title: "Success", description: "Ingredient removed" })
      await fetchData()
    } catch (error) {
      console.error("Error removing ingredient:", error)
      toast({
        title: "Error",
        description: "Failed to remove ingredient",
        variant: "destructive",
      })
    }
  }

  const addStep = async () => {
    if (!newStep.trim()) {
      toast({
        title: "Error",
        description: "Please enter step description",
        variant: "destructive",
      })
      return
    }

    try {
      const stepNumber = (steps.length || 0) + 1
      const { error } = await supabase.from("recipe_steps").insert({
        recipe_id: recipeId,
        step_number: stepNumber,
        instruction: newStep,
      })

      if (error) throw error
      toast({ title: "Success", description: "Step added" })
      setNewStep("")
      await fetchData()
    } catch (error) {
      console.error("Error adding step:", error)
      toast({
        title: "Error",
        description: "Failed to add step",
        variant: "destructive",
      })
    }
  }

  const removeStep = async (id: string) => {
    try {
      const { error } = await supabase.from("recipe_steps").delete().eq("id", id)
      if (error) throw error
      toast({ title: "Success", description: "Step removed" })
      await fetchData()
    } catch (error) {
      console.error("Error removing step:", error)
      toast({
        title: "Error",
        description: "Failed to remove step",
        variant: "destructive",
      })
    }
  }

  const addTag = async () => {
    if (!newTag.trim()) {
      toast({
        title: "Error",
        description: "Please enter tag name",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("recipe_tags").insert({
        recipe_id: recipeId,
        tag_name: newTag,
      })

      if (error) throw error
      toast({ title: "Success", description: "Tag added" })
      setNewTag("")
      await fetchData()
    } catch (error) {
      console.error("Error adding tag:", error)
      toast({
        title: "Error",
        description: "Failed to add tag",
        variant: "destructive",
      })
    }
  }

  const removeTag = async (id: string) => {
    try {
      const { error } = await supabase.from("recipe_tags").delete().eq("id", id)
      if (error) throw error
      toast({ title: "Success", description: "Tag removed" })
      await fetchData()
    } catch (error) {
      console.error("Error removing tag:", error)
      toast({
        title: "Error",
        description: "Failed to remove tag",
        variant: "destructive",
      })
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12">Loading recipe data...</div>
        ) : (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="bg-primary/20 text-primary px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                  >
                    {tag.tag_name}
                    <button onClick={() => removeTag(tag.id!)} className="text-xs hover:text-primary/70">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag (e.g., Vegetarian, Quick, Healthy)"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                />
                <Button onClick={addTag} className="bg-primary text-primary-foreground">
                  Add Tag
                </Button>
              </div>
            </div>

            {/* Ingredients Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
              <Card className="mb-4 p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="ingredient-name">Ingredient Name</Label>
                      <div className="relative">
                        <Input
                          id="ingredient-name"
                          placeholder="e.g., Tomato"
                          value={newIngredient.ingredient_name}
                          onChange={(e) => {
                            setNewIngredient((prev) => ({ ...prev, ingredient_name: e.target.value }))
                            setIngredientSearch(e.target.value)
                          }}
                        />
                        {filteredIngredients.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-card border border-input rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredIngredients.map((item) => (
                              <button
                                key={item}
                                onClick={() => {
                                  setNewIngredient((prev) => ({ ...prev, ingredient_name: item }))
                                  setIngredientSearch("")
                                  setFilteredIngredients([])
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.1"
                        value={newIngredient.quantity}
                        onChange={(e) =>
                          setNewIngredient((prev) => ({ ...prev, quantity: Number.parseFloat(e.target.value) || 1 }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <select
                        id="unit"
                        value={newIngredient.unit}
                        onChange={(e) => setNewIngredient((prev) => ({ ...prev, unit: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="pcs">pcs</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                        <option value="cup">cup</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        value={newIngredient.category_id || ""}
                        onChange={(e) => setNewIngredient((prev) => ({ ...prev, category_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="">Select category</option>
                        {ingredientCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button onClick={addIngredient} className="w-full bg-primary text-primary-foreground">
                    Add Ingredient
                  </Button>
                </div>
              </Card>

              <div className="space-y-2">
                {ingredients.map((ingredient) => (
                  <div key={ingredient.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{ingredient.ingredient_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ingredient.quantity} {ingredient.unit}
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeIngredient(ingredient.id!)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Instructions</h3>
              <Card className="mb-4 p-4">
                <div className="space-y-2">
                  <Label htmlFor="instruction">Add Step</Label>
                  <textarea
                    id="instruction"
                    placeholder="Describe the step..."
                    value={newStep}
                    onChange={(e) => setNewStep(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    rows={3}
                  />
                  <Button onClick={addStep} className="w-full bg-primary text-primary-foreground">
                    Add Step
                  </Button>
                </div>
              </Card>

              <div className="space-y-2">
                {steps.map((step) => (
                  <div key={step.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">Step {step.step_number}</p>
                        <p className="text-sm">{step.instruction}</p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => removeStep(step.id!)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={() => {
                  onSave()
                  onClose()
                }}
                className="bg-primary text-primary-foreground"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
