-- Insert sample public recipes for the recipe library
INSERT INTO public.recipes (user_id, title, description, image_url, prep_time, cook_time, servings, calories_per_serving, is_public)
VALUES
  (NULL, 'Classic Spaghetti Carbonara', 'Traditional Italian pasta with creamy sauce', '/placeholder.svg?height=300&width=300', 10, 20, 4, 450, TRUE),
  (NULL, 'Grilled Salmon with Lemon', 'Fresh salmon fillet with herbs and lemon', '/placeholder.svg?height=300&width=300', 15, 15, 2, 380, TRUE),
  (NULL, 'Vegetable Stir Fry', 'Quick and healthy mixed vegetables', '/placeholder.svg?height=300&width=300', 10, 12, 3, 220, TRUE),
  (NULL, 'Chicken Teriyaki Bowl', 'Glazed chicken with rice and vegetables', '/placeholder.svg?height=300&width=300', 20, 25, 4, 520, TRUE),
  (NULL, 'Greek Salad', 'Fresh Mediterranean salad with feta', '/placeholder.svg?height=300&width=300', 15, 0, 2, 180, TRUE);
