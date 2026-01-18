-- Update existing recipes with categories and tags
DO $$
DECLARE
  v_recipe_id UUID;
  v_category_id UUID;
BEGIN
  -- Get Breakfast category
  SELECT id INTO v_category_id FROM public.recipe_categories 
  WHERE user_id IS NULL AND name = 'Breakfast' LIMIT 1;
  
  IF v_category_id IS NULL THEN
    -- Create default categories if they don't exist
    INSERT INTO public.recipe_categories (user_id, name) VALUES (NULL, 'Breakfast') RETURNING id INTO v_category_id;
  END IF;

  -- Update recipes with categories and tags
  FOR v_recipe_id IN 
    SELECT id FROM public.recipes WHERE is_public = true LIMIT 10
  LOOP
    -- Insert tags for each recipe
    INSERT INTO public.recipe_tags (recipe_id, tag_name) VALUES 
      (v_recipe_id, 'Healthy'),
      (v_recipe_id, 'Quick'),
      (v_recipe_id, 'Vegetarian')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
