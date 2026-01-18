-- Create recipe categories table
CREATE TABLE IF NOT EXISTS public.recipe_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create recipe tags junction table
CREATE TABLE IF NOT EXISTS public.recipe_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipe_id, tag_name)
);

-- Add category_id to recipes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.recipe_categories(id) ON DELETE SET NULL;

-- Add is_favorite column
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create ingredient categories table
CREATE TABLE IF NOT EXISTS public.ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add category to recipe_ingredients
ALTER TABLE public.recipe_ingredients ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.ingredient_categories(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "Users can view their own categories" ON public.recipe_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create categories" ON public.recipe_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.recipe_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.recipe_categories FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for tags
CREATE POLICY "Users can view tags of accessible recipes" ON public.recipe_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND (user_id = auth.uid() OR is_public = TRUE))
);

-- RLS policies for ingredient categories
CREATE POLICY "Anyone can view ingredient categories" ON public.ingredient_categories FOR SELECT USING (TRUE);

-- Seed ingredient categories
INSERT INTO public.ingredient_categories (name) VALUES
  ('Vegetables'),
  ('Fruits'),
  ('Proteins'),
  ('Grains'),
  ('Dairy'),
  ('Spices'),
  ('Oils & Condiments'),
  ('Canned & Packaged'),
  ('Frozen'),
  ('Beverages')
ON CONFLICT DO NOTHING;
