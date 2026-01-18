-- Add missing RLS policies for recipe_steps and shopping_list_items
-- Fix RLS policies for recipe_steps - allow INSERT/UPDATE/DELETE for recipe owner
CREATE POLICY "Users can insert steps for their recipes" ON public.recipe_steps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update steps of their recipes" ON public.recipe_steps FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete steps of their recipes" ON public.recipe_steps FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

-- Fix RLS policies for shopping_list_items - allow DELETE for shopping list owner
CREATE POLICY "Users can delete items in their shopping lists" ON public.shopping_list_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.shopping_lists WHERE id = shopping_list_id AND user_id = auth.uid())
);

-- Add missing RLS policies for recipe_ingredients
CREATE POLICY "Users can insert ingredients for their recipes" ON public.recipe_ingredients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update ingredients of their recipes" ON public.recipe_ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete ingredients of their recipes" ON public.recipe_ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

-- Add RLS policies for recipe_tags
CREATE POLICY "Users can insert tags for their recipes" ON public.recipe_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete tags from their recipes" ON public.recipe_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
