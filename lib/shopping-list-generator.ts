import { createClient } from "@/lib/supabase/client"

interface RecipeIngredient {
  ingredient_name: string
  quantity: number
  unit: string
}

export async function generateShoppingList(mealPlanId: string, startDate: string, endDate: string) {
  const supabase = createClient()

  try {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new Error("Not authenticated")

    const { data: mealEntries, error: mealsError } = await supabase
      .from("meal_plan_entries")
      .select("recipe_id, servings")
      .eq("meal_plan_id", mealPlanId)
      .gte("meal_date", startDate)
      .lte("meal_date", endDate)

    if (mealsError) throw mealsError

    const ingredients: { [key: string]: { quantity: number; unit: string } } = {}

    for (const entry of mealEntries || []) {
      if (!entry.recipe_id) continue

      const { data: recipeIngredients, error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .select("ingredient_name, quantity, unit")
        .eq("recipe_id", entry.recipe_id)

      if (ingredientsError) throw ingredientsError

      for (const ingredient of recipeIngredients || []) {
        const key = `${ingredient.ingredient_name}|${ingredient.unit}`

        if (!ingredients[key]) {
          ingredients[key] = {
            quantity: 0,
            unit: ingredient.unit,
          }
        }

        ingredients[key].quantity += ingredient.quantity * entry.servings
      }
    }

    const shoppingListItems = Object.entries(ingredients).map(([key, value]) => {
      const [name, unit] = key.split("|")
      return {
        product_name: name,
        quantity: value.quantity,
        unit: value.unit,
        is_purchased: false,
      }
    })

    const { data: newList, error: createListError } = await supabase
      .from("shopping_lists")
      .insert({
        user_id: authData.user.id,
        meal_plan_id: mealPlanId,
        name: `Shopping List for ${startDate} to ${endDate}`,
      })
      .select("id")
      .single()

    if (createListError) throw createListError

    const itemsWithListId = shoppingListItems.map((item) => ({
      ...item,
      shopping_list_id: newList.id,
    }))

    const { error: insertError } = await supabase.from("shopping_list_items").insert(itemsWithListId)

    if (insertError) throw insertError

    return { success: true, listId: newList.id, itemCount: shoppingListItems.length }
  } catch (error) {
    console.error("Error generating shopping list:", error)
    throw error
  }
}
