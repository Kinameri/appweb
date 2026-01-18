-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  diet_type TEXT DEFAULT 'omnivore',
  allergies TEXT[] DEFAULT '{}',
  calorie_goal INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RECIPES
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER DEFAULT 1,
  calories_per_serving INTEGER,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MEAL PLANS
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meal_plan_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  servings INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SHOPPING LISTS
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  is_purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- FAVORITES (без is_favorite в recipes)
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- BASIC CATEGORIES (упрощённо)
CREATE TABLE IF NOT EXISTS public.ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RECIPES RLS
CREATE POLICY "Users can view recipes"
  ON public.recipes FOR SELECT
  USING (user_id = auth.uid() OR is_public = TRUE);

CREATE POLICY "Users can create recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recipes"
  ON public.recipes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recipes"
  ON public.recipes FOR DELETE
  USING (user_id = auth.uid());

-- RECIPE INGREDIENTS RLS
CREATE POLICY "Users can view ingredients of accessible recipes"
  ON public.recipe_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id
        AND (user_id = auth.uid() OR is_public = TRUE)
    )
  );

CREATE POLICY "Users can insert ingredients for their recipes"
  ON public.recipe_ingredients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ingredients of their recipes"
  ON public.recipe_ingredients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ingredients of their recipes"
  ON public.recipe_ingredients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = auth.uid()
    )
  );

-- RECIPE STEPS RLS
CREATE POLICY "Users can view steps of accessible recipes"
  ON public.recipe_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id
        AND (user_id = auth.uid() OR is_public = TRUE)
    )
  );

CREATE POLICY "Users can insert steps for their recipes"
  ON public.recipe_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps of their recipes"
  ON public.recipe_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete steps of their recipes"
  ON public.recipe_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE id = recipe_id AND user_id = auth.uid()
    )
  );

-- MEAL PLANS RLS
CREATE POLICY "Users can view their own meal plans"
  ON public.meal_plans FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create meal plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own meal plans"
  ON public.meal_plans FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own meal plans"
  ON public.meal_plans FOR DELETE
  USING (user_id = auth.uid());

-- MEAL PLAN ENTRIES RLS
CREATE POLICY "Users can view entries of their meal plans"
  ON public.meal_plan_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create entries in their meal plans"
  ON public.meal_plan_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update entries in their meal plans"
  ON public.meal_plan_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete entries in their meal plans"
  ON public.meal_plan_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans
      WHERE id = meal_plan_id AND user_id = auth.uid()
    )
  );

-- SHOPPING LISTS RLS
CREATE POLICY "Users can view their own shopping lists"
  ON public.shopping_lists FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create shopping lists"
  ON public.shopping_lists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own shopping lists"
  ON public.shopping_lists FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own shopping lists"
  ON public.shopping_lists FOR DELETE
  USING (user_id = auth.uid());

-- SHOPPING LIST ITEMS RLS
CREATE POLICY "Users can view items in their shopping lists"
  ON public.shopping_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists
      WHERE id = shopping_list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items in their shopping lists"
  ON public.shopping_list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shopping_lists
      WHERE id = shopping_list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their shopping lists"
  ON public.shopping_list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists
      WHERE id = shopping_list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in their shopping lists"
  ON public.shopping_list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_lists
      WHERE id = shopping_list_id AND user_id = auth.uid()
    )
  );

-- FAVORITES RLS
CREATE POLICY "Users can view their own favorites"
  ON public.favorites FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own favorites"
  ON public.favorites FOR DELETE
  USING (user_id = auth.uid());

-- INGREDIENT CATEGORIES RLS (read-only public)
CREATE POLICY "Anyone can view ingredient categories"
  ON public.ingredient_categories FOR SELECT
  USING (TRUE);

-- SIMPLE SEED (опционально)
INSERT INTO public.ingredient_categories (name)
VALUES
  ('Vegetables'),
  ('Fruits'),
  ('Proteins'),
  ('Grains'),
  ('Dairy'),
  ('Spices'),
  ('Oils & Condiments')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.recipes (user_id, title, description, image_url, prep_time, cook_time, servings, calories_per_serving, is_public)
VALUES
  (NULL, 'Mediterranean Salad', 'Fresh salad with vegetables and feta cheese', '/placeholder.svg?height=300&width=300', 10, 0, 2, 220, TRUE),
  (NULL, 'Quick Veggie Stir-Fry', 'Mixed vegetables sautéed in a light soy sauce', '/placeholder.svg?height=300&width=300', 10, 10, 2, 250, TRUE)
ON CONFLICT DO NOTHING;
