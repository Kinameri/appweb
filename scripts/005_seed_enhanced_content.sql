-- Add enhanced seed data with better recipes, ingredients and content

-- Clear existing data to avoid conflicts
DELETE FROM public.recipe_ingredients WHERE recipe_id IN (SELECT id FROM public.recipes WHERE is_public = true);
DELETE FROM public.recipe_steps WHERE recipe_id IN (SELECT id FROM public.recipes WHERE is_public = true);
DELETE FROM public.recipes WHERE is_public = true;

-- Insert enhanced public recipes with full details
INSERT INTO public.recipes (user_id, title, description, image_url, prep_time, cook_time, servings, calories_per_serving, is_public)
VALUES
  (NULL, 'Creamy Mushroom Risotto', 'Authentic Italian risotto with fresh mushrooms and Parmesan', '/placeholder.svg?height=300&width=300', 15, 25, 4, 380, TRUE),
  (NULL, 'Grilled Salmon with Asparagus', 'Pan-seared salmon fillet with roasted asparagus and lemon butter', '/placeholder.svg?height=300&width=300', 10, 15, 2, 420, TRUE),
  (NULL, 'Vegetable Stir Fry with Tofu', 'Quick and healthy Asian-style stir fry with crispy tofu', '/placeholder.svg?height=300&width=300', 15, 12, 3, 280, TRUE),
  (NULL, 'Chicken Teriyaki with Rice', 'Glazed chicken with teriyaki sauce, served over jasmine rice', '/placeholder.svg?height=300&width=300', 20, 20, 4, 540, TRUE),
  (NULL, 'Mediterranean Greek Salad', 'Fresh Mediterranean salad with feta cheese, olives, and vinaigrette', '/placeholder.svg?height=300&width=300', 15, 0, 2, 220, TRUE),
  (NULL, 'Margherita Pizza', 'Classic pizza with fresh mozzarella, basil, and tomato sauce', '/placeholder.svg?height=300&width=300', 30, 20, 4, 350, TRUE),
  (NULL, 'Thai Green Curry', 'Aromatic Thai curry with coconut milk and fresh herbs', '/placeholder.svg?height=300&width=300', 15, 20, 4, 380, TRUE),
  (NULL, 'Spaghetti Bolognese', 'Classic Italian pasta with rich meat sauce', '/placeholder.svg?height=300&width=300', 20, 30, 4, 520, TRUE),
  (NULL, 'Buddha Bowl', 'Nutritious bowl with quinoa, roasted vegetables, and tahini dressing', '/placeholder.svg?height=300&width=300', 25, 15, 2, 420, TRUE),
  (NULL, 'Beef Tacos', 'Delicious Mexican-style tacos with seasoned ground beef and fresh toppings', '/placeholder.svg?height=300&width=300', 10, 15, 4, 380, TRUE);

-- Get recipe IDs for ingredient insertion
WITH recipe_ids AS (
  SELECT id, title FROM public.recipes WHERE is_public = true
)
INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, category_id)
SELECT 
  CASE 
    WHEN r.title = 'Creamy Mushroom Risotto' THEN r.id
    WHEN r.title = 'Grilled Salmon with Asparagus' THEN r.id
    WHEN r.title = 'Vegetable Stir Fry with Tofu' THEN r.id
    WHEN r.title = 'Chicken Teriyaki with Rice' THEN r.id
    WHEN r.title = 'Mediterranean Greek Salad' THEN r.id
    WHEN r.title = 'Margherita Pizza' THEN r.id
    WHEN r.title = 'Thai Green Curry' THEN r.id
    WHEN r.title = 'Spaghetti Bolognese' THEN r.id
    WHEN r.title = 'Buddha Bowl' THEN r.id
    WHEN r.title = 'Beef Tacos' THEN r.id
  END,
  ingredient.name,
  ingredient.qty,
  ingredient.u,
  (SELECT id FROM public.ingredient_categories WHERE name = ingredient.category LIMIT 1)
FROM recipe_ids r,
LATERAL (
  -- Risotto ingredients
  SELECT 'Arborio Rice' as name, 300 as qty, 'g' as u, 'Grains' as category WHERE r.title = 'Creamy Mushroom Risotto'
  UNION ALL
  SELECT 'Mushrooms', 400, 'g', 'Vegetables' WHERE r.title = 'Creamy Mushroom Risotto'
  UNION ALL
  SELECT 'Vegetable Broth', 1, 'l', 'Liquids' WHERE r.title = 'Creamy Mushroom Risotto'
  UNION ALL
  SELECT 'White Wine', 200, 'ml', 'Liquids' WHERE r.title = 'Creamy Mushroom Risotto'
  UNION ALL
  SELECT 'Parmesan Cheese', 100, 'g', 'Dairy' WHERE r.title = 'Creamy Mushroom Risotto'
  UNION ALL
  SELECT 'Onion', 1, 'pcs', 'Vegetables' WHERE r.title = 'Creamy Mushroom Risotto'
  UNION ALL
  -- Salmon ingredients
  SELECT 'Salmon Fillet', 2, 'pcs', 'Proteins' WHERE r.title = 'Grilled Salmon with Asparagus'
  UNION ALL
  SELECT 'Asparagus', 400, 'g', 'Vegetables' WHERE r.title = 'Grilled Salmon with Asparagus'
  UNION ALL
  SELECT 'Lemon', 2, 'pcs', 'Fruits' WHERE r.title = 'Grilled Salmon with Asparagus'
  UNION ALL
  SELECT 'Butter', 50, 'g', 'Dairy' WHERE r.title = 'Grilled Salmon with Asparagus'
  UNION ALL
  SELECT 'Olive Oil', 30, 'ml', 'Oils & Condiments' WHERE r.title = 'Grilled Salmon with Asparagus'
  UNION ALL
  -- Stir fry ingredients
  SELECT 'Tofu', 400, 'g', 'Proteins' WHERE r.title = 'Vegetable Stir Fry with Tofu'
  UNION ALL
  SELECT 'Bell Peppers', 2, 'pcs', 'Vegetables' WHERE r.title = 'Vegetable Stir Fry with Tofu'
  UNION ALL
  SELECT 'Broccoli', 300, 'g', 'Vegetables' WHERE r.title = 'Vegetable Stir Fry with Tofu'
  UNION ALL
  SELECT 'Soy Sauce', 50, 'ml', 'Oils & Condiments' WHERE r.title = 'Vegetable Stir Fry with Tofu'
  UNION ALL
  SELECT 'Ginger', 20, 'g', 'Spices' WHERE r.title = 'Vegetable Stir Fry with Tofu'
  UNION ALL
  SELECT 'Garlic', 3, 'cloves', 'Vegetables' WHERE r.title = 'Vegetable Stir Fry with Tofu'
) ingredient
WHERE ingredient.name IS NOT NULL;

-- Add recipe steps for Risotto
INSERT INTO public.recipe_steps (recipe_id, step_number, instruction)
SELECT id, 1, 'Heat broth in a pot and keep it warm'
FROM public.recipes WHERE title = 'Creamy Mushroom Risotto' AND is_public = true
UNION ALL
SELECT id, 2, 'Sauté mushrooms and onions in a pan with olive oil'
FROM public.recipes WHERE title = 'Creamy Mushroom Risotto' AND is_public = true
UNION ALL
SELECT id, 3, 'Add rice and stir for 2 minutes until lightly toasted'
FROM public.recipes WHERE title = 'Creamy Mushroom Risotto' AND is_public = true
UNION ALL
SELECT id, 4, 'Add white wine and stir until absorbed'
FROM public.recipes WHERE title = 'Creamy Mushroom Risotto' AND is_public = true
UNION ALL
SELECT id, 5, 'Gradually add warm broth, stirring constantly for 18-20 minutes'
FROM public.recipes WHERE title = 'Creamy Mushroom Risotto' AND is_public = true
UNION ALL
SELECT id, 6, 'Finish with butter and Parmesan cheese'
FROM public.recipes WHERE title = 'Creamy Mushroom Risotto' AND is_public = true;
