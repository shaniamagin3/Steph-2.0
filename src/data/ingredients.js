/**
 * Ingredient reference table.
 *
 * ACCURACY NOTE: these are approximate reference values for generic supermarket
 * products, of the kind published in food composition tables. Brands vary,
 * sometimes by 15-20% on fat in particular. If you weigh and track a specific
 * product, that product's label beats this table every time.
 *
 * Macro convention:
 *   - `per` is the reference quantity: grams, millilitres, or 'unit' (one item).
 *   - `carbs` is TOTAL carbohydrate INCLUDING fibre (the convention used in
 *     Australia, the UK and the EU). US labels list available carbohydrate
 *     separately, so numbers will not line up with a US label exactly.
 *   - `kcal` is the table's own energy figure, not a back-calculation, which is
 *     why it does not always equal 4/4/9 arithmetic exactly.
 *
 * `aisle` drives shopping-list grouping. `negligible` marks flavourings whose
 * macros round to nothing in the quantities used - they still appear on the
 * shopping list, they just do not move the numbers.
 */

/** @typedef {{id:string,name:string,aisle:string,per:number|'unit',unit:string,kcal:number,protein:number,carbs:number,fat:number,fibre:number,negligible?:boolean,tags?:string[]}} Ingredient */

const I = (id, name, aisle, per, unit, kcal, protein, carbs, fat, fibre, extra = {}) =>
  ({ id, name, aisle, per, unit, kcal, protein, carbs, fat, fibre, ...extra });

/** @type {Ingredient[]} */
export const INGREDIENTS = [
  // ---- Protein: meat, fish, eggs -------------------------------------------
  I('chicken_breast', 'Chicken breast (raw, skinless)', 'Meat & seafood', 100, 'g', 120, 23, 0, 2.6, 0, { tags: ['animal'] }),
  I('chicken_thigh', 'Chicken thigh (raw, skinless)', 'Meat & seafood', 100, 'g', 155, 19.7, 0, 8.2, 0, { tags: ['animal'] }),
  I('turkey_mince', 'Turkey mince (lean)', 'Meat & seafood', 100, 'g', 150, 21, 0, 7, 0, { tags: ['animal'] }),
  I('beef_mince_lean', 'Beef mince (5% fat)', 'Meat & seafood', 100, 'g', 136, 21.5, 0, 5.4, 0, { tags: ['animal', 'iron'] }),
  I('salmon_fillet', 'Salmon fillet (raw)', 'Meat & seafood', 100, 'g', 208, 20, 0, 13, 0, { tags: ['animal', 'fish', 'omega3'] }),
  I('white_fish', 'White fish fillet (barramundi / cod)', 'Meat & seafood', 100, 'g', 92, 20, 0, 1, 0, { tags: ['animal', 'fish'] }),
  I('prawns', 'Prawns (raw, peeled)', 'Meat & seafood', 100, 'g', 85, 18, 0.9, 1, 0, { tags: ['animal', 'fish'] }),
  I('tuna_canned', 'Tuna in springwater (drained)', 'Pantry', 100, 'g', 116, 26, 0, 1, 0, { tags: ['animal', 'fish', 'pantry-staple'] }),
  I('salmon_smoked', 'Smoked salmon', 'Meat & seafood', 100, 'g', 142, 22, 0, 6, 0, { tags: ['animal', 'fish', 'omega3'] }),
  I('egg', 'Eggs (large)', 'Dairy & eggs', 'unit', 'egg', 72, 6.3, 0.4, 5, 0, { tags: ['vegetarian'] }),
  I('egg_whites', 'Egg whites (carton)', 'Dairy & eggs', 100, 'ml', 52, 11, 0.7, 0.2, 0, { tags: ['vegetarian'] }),

  // ---- Protein: dairy & powders --------------------------------------------
  I('greek_yoghurt', 'Greek yoghurt (0% fat)', 'Dairy & eggs', 100, 'g', 59, 10, 3.6, 0.4, 0, { tags: ['vegetarian', 'probiotic'] }),
  I('greek_yoghurt_full', 'Greek yoghurt (full fat)', 'Dairy & eggs', 100, 'g', 97, 9, 3.9, 5, 0, { tags: ['vegetarian', 'probiotic'] }),
  I('cottage_cheese', 'Cottage cheese (low fat)', 'Dairy & eggs', 100, 'g', 72, 11, 3.5, 1.5, 0, { tags: ['vegetarian'] }),
  I('ricotta', 'Ricotta (light)', 'Dairy & eggs', 100, 'g', 138, 11, 3, 8, 0, { tags: ['vegetarian'] }),
  I('whey_protein', 'Protein powder (whey or plant)', 'Pantry', 'unit', 'scoop (30g)', 118, 24, 2, 1.5, 0.5, { tags: ['vegetarian', 'pantry-staple'] }),
  I('protein_isolate', 'Protein powder (whey isolate or plant)', 'Pantry', 'unit', 'scoop (30g)', 115, 25, 1, 1, 0.5, { tags: ['vegetarian', 'lactose-free', 'pantry-staple'] }),
  I('feta', 'Feta', 'Dairy & eggs', 100, 'g', 264, 14, 4, 21, 0, { tags: ['vegetarian'] }),
  I('halloumi', 'Halloumi', 'Dairy & eggs', 100, 'g', 321, 22, 2.2, 25, 0, { tags: ['vegetarian'] }),
  I('parmesan', 'Parmesan', 'Dairy & eggs', 100, 'g', 402, 36, 3.2, 27, 0, { tags: ['vegetarian'] }),
  I('mozzarella_light', 'Mozzarella (light, shredded)', 'Dairy & eggs', 100, 'g', 254, 24, 3, 16, 0, { tags: ['vegetarian'] }),
  I('cheddar_light', 'Cheddar (reduced fat, grated)', 'Dairy & eggs', 100, 'g', 273, 27, 1, 18, 0, { tags: ['vegetarian'] }),
  I('milk_skim', 'Milk (skim)', 'Dairy & eggs', 100, 'ml', 35, 3.4, 5, 0.1, 0, { tags: ['vegetarian'] }),
  I('almond_milk', 'Almond milk (unsweetened)', 'Dairy & eggs', 100, 'ml', 13, 0.5, 0.3, 1.1, 0.3, { tags: ['vegan', 'dairy-free'] }),
  I('soy_milk', 'Soy milk (unsweetened)', 'Dairy & eggs', 100, 'ml', 33, 3.3, 1.2, 1.8, 0.5, { tags: ['vegan', 'dairy-free'] }),

  // ---- Protein: plant -------------------------------------------------------
  I('tofu_firm', 'Firm tofu', 'Fridge', 100, 'g', 130, 15, 3, 6.5, 1, { tags: ['vegan'] }),
  I('tempeh', 'Tempeh', 'Fridge', 100, 'g', 195, 19, 8, 9.5, 5, { tags: ['vegan'] }),
  I('lentils_cooked', 'Lentils (cooked / tinned, drained)', 'Pantry', 100, 'g', 116, 9, 20, 0.4, 8, { tags: ['vegan', 'low-gi', 'pantry-staple'] }),
  I('chickpeas', 'Chickpeas (tinned, drained)', 'Pantry', 100, 'g', 164, 8.9, 27, 2.6, 7.6, { tags: ['vegan', 'low-gi', 'pantry-staple'] }),
  I('black_beans', 'Black beans (tinned, drained)', 'Pantry', 100, 'g', 132, 8.9, 23.7, 0.5, 8.7, { tags: ['vegan', 'low-gi', 'pantry-staple'] }),
  I('edamame', 'Edamame (shelled, frozen)', 'Freezer', 100, 'g', 121, 12, 8.9, 5, 5, { tags: ['vegan'] }),

  // ---- Carbohydrate ---------------------------------------------------------
  I('oats', 'Rolled oats', 'Pantry', 100, 'g', 389, 16.9, 66, 6.9, 10.6, { tags: ['vegan', 'low-gi', 'pantry-staple'] }),
  I('basmati_rice', 'Basmati rice (cooked)', 'Pantry', 100, 'g', 130, 2.7, 28, 0.3, 0.4, { tags: ['vegan'] }),
  I('brown_rice', 'Brown rice (cooked)', 'Pantry', 100, 'g', 123, 2.7, 25.6, 1, 1.6, { tags: ['vegan', 'low-gi'] }),
  I('quinoa', 'Quinoa (cooked)', 'Pantry', 100, 'g', 120, 4.4, 21, 1.9, 2.8, { tags: ['vegan', 'low-gi'] }),
  I('sweet_potato', 'Sweet potato', 'Fruit & veg', 100, 'g', 86, 1.6, 20, 0.1, 3, { tags: ['vegan', 'low-gi'] }),
  I('potato', 'Potato', 'Fruit & veg', 100, 'g', 77, 2, 17, 0.1, 2.2, { tags: ['vegan'] }),
  I('wholemeal_bread', 'Wholemeal bread', 'Bakery', 'unit', 'slice', 93, 4.5, 15, 1.2, 2.4, { tags: ['vegetarian', 'low-gi'] }),
  I('sourdough', 'Sourdough', 'Bakery', 'unit', 'slice', 130, 4.5, 25, 0.8, 1.5, { tags: ['vegetarian'] }),
  I('wholemeal_wrap', 'Wholemeal wrap', 'Bakery', 'unit', 'wrap', 180, 6, 29, 4, 3.5, { tags: ['vegetarian'] }),
  I('pasta_wholemeal', 'Wholemeal pasta (cooked)', 'Pantry', 100, 'g', 124, 5, 25, 1.1, 3.9, { tags: ['vegan', 'low-gi'] }),
  I('chickpea_pasta', 'Chickpea pasta (cooked)', 'Pantry', 100, 'g', 150, 9, 22, 2.5, 5, { tags: ['vegan', 'low-gi', 'gluten-free'] }),
  I('rice_cakes', 'Rice cakes', 'Pantry', 'unit', 'cake', 35, 0.8, 7.3, 0.2, 0.3, { tags: ['vegan'] }),

  // ---- Vegetables -----------------------------------------------------------
  I('broccoli', 'Broccoli', 'Fruit & veg', 100, 'g', 34, 2.8, 4.5, 0.4, 2.6, { tags: ['vegan', 'cruciferous'] }),
  I('spinach', 'Baby spinach', 'Fruit & veg', 100, 'g', 23, 2.9, 3.6, 0.4, 2.2, { tags: ['vegan', 'iron'] }),
  I('salad_leaves', 'Mixed salad leaves', 'Fruit & veg', 100, 'g', 17, 1.4, 1.8, 0.2, 1.5, { tags: ['vegan'] }),
  I('capsicum', 'Capsicum', 'Fruit & veg', 100, 'g', 31, 1, 6, 0.3, 2.1, { tags: ['vegan'] }),
  I('zucchini', 'Zucchini', 'Fruit & veg', 100, 'g', 17, 1.2, 3.1, 0.3, 1, { tags: ['vegan'] }),
  I('cherry_tomatoes', 'Cherry tomatoes', 'Fruit & veg', 100, 'g', 18, 0.9, 3.9, 0.2, 1.2, { tags: ['vegan'] }),
  I('cucumber', 'Cucumber', 'Fruit & veg', 100, 'g', 15, 0.7, 3.6, 0.1, 0.5, { tags: ['vegan'] }),
  I('red_onion', 'Red onion', 'Fruit & veg', 100, 'g', 40, 1.1, 9.3, 0.1, 1.7, { tags: ['vegan'] }),
  I('mushrooms', 'Mushrooms', 'Fruit & veg', 100, 'g', 22, 3.1, 3.3, 0.3, 1, { tags: ['vegan'] }),
  I('carrot', 'Carrot', 'Fruit & veg', 100, 'g', 41, 0.9, 9.6, 0.2, 2.8, { tags: ['vegan'] }),
  I('green_beans', 'Green beans', 'Fruit & veg', 100, 'g', 31, 1.8, 7, 0.1, 2.7, { tags: ['vegan'] }),
  I('cauliflower', 'Cauliflower', 'Fruit & veg', 100, 'g', 25, 1.9, 5, 0.3, 2, { tags: ['vegan', 'cruciferous'] }),
  I('asparagus', 'Asparagus', 'Fruit & veg', 100, 'g', 20, 2.2, 3.9, 0.1, 2.1, { tags: ['vegan'] }),
  I('kale', 'Kale', 'Fruit & veg', 100, 'g', 35, 2.9, 4.4, 1.5, 4.1, { tags: ['vegan', 'cruciferous'] }),
  I('cabbage_slaw', 'Slaw mix (cabbage & carrot)', 'Fruit & veg', 100, 'g', 28, 1.3, 6, 0.2, 2.5, { tags: ['vegan', 'cruciferous'] }),
  I('avocado', 'Avocado', 'Fruit & veg', 100, 'g', 160, 2, 8.5, 14.7, 6.7, { tags: ['vegan', 'healthy-fat'] }),
  I('rocket', 'Rocket', 'Fruit & veg', 100, 'g', 25, 2.6, 3.7, 0.7, 1.6, { tags: ['vegan'] }),
  I('roast_veg_mix', 'Roasting veg mix (pumpkin, capsicum, onion)', 'Fruit & veg', 100, 'g', 45, 1.2, 9.5, 0.2, 2.2, { tags: ['vegan'] }),

  // ---- Fruit ----------------------------------------------------------------
  I('blueberries', 'Blueberries', 'Fruit & veg', 100, 'g', 57, 0.7, 14, 0.3, 2.4, { tags: ['vegan', 'low-gi'] }),
  I('raspberries', 'Raspberries', 'Fruit & veg', 100, 'g', 52, 1.2, 12, 0.7, 6.5, { tags: ['vegan', 'low-gi', 'high-fibre'] }),
  I('strawberries', 'Strawberries', 'Fruit & veg', 100, 'g', 32, 0.7, 7.7, 0.3, 2, { tags: ['vegan', 'low-gi'] }),
  I('frozen_berries', 'Mixed berries (frozen)', 'Freezer', 100, 'g', 50, 0.9, 11, 0.3, 3, { tags: ['vegan', 'low-gi'] }),
  I('banana', 'Banana', 'Fruit & veg', 'unit', 'banana', 105, 1.3, 27, 0.4, 3.1, { tags: ['vegan'] }),
  I('apple', 'Apple', 'Fruit & veg', 'unit', 'apple', 95, 0.5, 25, 0.3, 4.4, { tags: ['vegan', 'low-gi'] }),
  I('kiwi', 'Kiwifruit', 'Fruit & veg', 'unit', 'kiwi', 42, 0.8, 10, 0.4, 2.1, { tags: ['vegan', 'low-gi'] }),
  I('orange', 'Orange', 'Fruit & veg', 'unit', 'orange', 62, 1.2, 15, 0.2, 3.1, { tags: ['vegan', 'low-gi'] }),

  // ---- Fats, nuts, seeds ----------------------------------------------------
  I('olive_oil', 'Extra virgin olive oil', 'Pantry', 100, 'ml', 884, 0, 0, 100, 0, { tags: ['vegan', 'healthy-fat', 'pantry-staple'] }),
  I('almonds', 'Almonds', 'Pantry', 100, 'g', 579, 21, 22, 50, 12.5, { tags: ['vegan', 'healthy-fat'] }),
  I('walnuts', 'Walnuts', 'Pantry', 100, 'g', 654, 15, 14, 65, 6.7, { tags: ['vegan', 'healthy-fat', 'omega3'] }),
  I('peanut_butter', 'Natural peanut butter', 'Pantry', 100, 'g', 588, 25, 20, 50, 6, { tags: ['vegan', 'healthy-fat'] }),
  I('peanut_powder', 'Powdered peanut butter (PB2 style)', 'Pantry', 100, 'g', 375, 42, 33, 12.5, 13, { tags: ['vegan'] }),
  I('chia_seeds', 'Chia seeds', 'Pantry', 100, 'g', 486, 17, 42, 31, 34, { tags: ['vegan', 'high-fibre', 'omega3'] }),
  I('flaxseed', 'Ground flaxseed', 'Pantry', 100, 'g', 534, 18, 29, 42, 27, { tags: ['vegan', 'high-fibre', 'omega3'] }),
  I('pumpkin_seeds', 'Pumpkin seeds', 'Pantry', 100, 'g', 559, 30, 11, 49, 6, { tags: ['vegan', 'healthy-fat', 'zinc'] }),
  I('tahini', 'Tahini', 'Pantry', 100, 'g', 595, 17, 21, 54, 9, { tags: ['vegan', 'healthy-fat'] }),
  I('hummus', 'Hummus', 'Fridge', 100, 'g', 166, 8, 14, 10, 6, { tags: ['vegan'] }),

  // ---- Flavour, sauces, baking ---------------------------------------------
  I('tomato_passata', 'Tomato passata', 'Pantry', 100, 'g', 35, 1.6, 6.5, 0.2, 1.5, { tags: ['vegan', 'pantry-staple'] }),
  I('salsa', 'Salsa', 'Pantry', 100, 'g', 36, 1.5, 7, 0.2, 1.8, { tags: ['vegan'] }),
  I('coconut_milk_light', 'Light coconut milk', 'Pantry', 100, 'ml', 73, 0.8, 2.8, 6.8, 0, { tags: ['vegan'] }),
  I('cacao_powder', 'Raw cacao / cocoa powder', 'Pantry', 100, 'g', 228, 20, 58, 14, 33, { tags: ['vegan', 'high-fibre'] }),
  I('dark_chocolate', 'Dark chocolate (85%)', 'Pantry', 100, 'g', 592, 10, 24, 50, 12, { tags: ['vegetarian'] }),
  I('honey', 'Honey', 'Pantry', 100, 'g', 304, 0.3, 82, 0, 0.2, { tags: ['vegetarian'] }),
  I('nutritional_yeast', 'Nutritional yeast', 'Pantry', 100, 'g', 385, 50, 36, 5, 20, { tags: ['vegan'] }),
  I('sugar_free_jelly', 'Sugar-free jelly (prepared)', 'Pantry', 100, 'g', 6, 1, 0.4, 0, 0, { tags: ['vegetarian'] }),
  I('gelatine', 'Gelatine powder', 'Pantry', 100, 'g', 335, 84, 0, 0.1, 0, { tags: [] }),


  // ---- Lactose-free dairy ---------------------------------------------------
  // Lactose-free products are ordinary dairy with the lactase enzyme added, so
  // the macros match their normal counterparts closely. They are not dairy-free.
  I('lf_greek_yoghurt', 'Lactose-free Greek yoghurt (0% fat)', 'Dairy & eggs', 100, 'g', 59, 10, 3.6, 0.4, 0, { tags: ['vegetarian', 'lactose-free', 'probiotic'] }),
  I('lf_milk', 'Lactose-free milk (skim)', 'Dairy & eggs', 100, 'ml', 35, 3.4, 5, 0.1, 0, { tags: ['vegetarian', 'lactose-free'] }),
  I('lf_cream_cheese', 'Lactose-free cream cheese', 'Dairy & eggs', 100, 'g', 175, 6, 4, 15, 0, { tags: ['vegetarian', 'lactose-free'] }),
  I('coconut_yoghurt', 'Coconut yoghurt (unsweetened)', 'Dairy & eggs', 100, 'g', 130, 1.5, 6, 11, 1, { tags: ['vegan', 'dairy-free', 'lactose-free'] }),

  // ---- Her preferred proteins -----------------------------------------------
  I('lamb_leg', 'Lamb leg steak (lean, raw)', 'Meat & seafood', 100, 'g', 143, 21, 0, 6.2, 0, { tags: ['animal', 'iron'] }),
  I('lamb_mince', 'Lamb mince (lean)', 'Meat & seafood', 100, 'g', 165, 20, 0, 9.4, 0, { tags: ['animal', 'iron'] }),
  I('pork_loin', 'Pork loin steak (lean, raw)', 'Meat & seafood', 100, 'g', 130, 22, 0, 4.5, 0, { tags: ['animal'] }),
  I('pork_mince', 'Pork mince (lean)', 'Meat & seafood', 100, 'g', 143, 21, 0, 6.4, 0, { tags: ['animal'] }),
  I('beef_rump', 'Beef rump steak (lean, raw)', 'Meat & seafood', 100, 'g', 133, 22, 0, 5, 0, { tags: ['animal', 'iron'] }),

  // ---- Gluten-free staples --------------------------------------------------
  I('gf_bread', 'Gluten-free bread', 'Bakery', 'unit', 'slice', 90, 2.5, 15, 2.2, 1.5, { tags: ['vegetarian', 'gluten-free'] }),
  I('gf_wrap', 'Gluten-free wrap', 'Bakery', 'unit', 'wrap', 165, 3, 29, 4, 2.5, { tags: ['vegetarian', 'gluten-free'] }),
  I('gf_pasta', 'Gluten-free pasta (cooked)', 'Pantry', 100, 'g', 130, 3, 27, 0.9, 1.8, { tags: ['vegan', 'gluten-free'] }),
  I('buckwheat_noodles', 'Buckwheat (100%) soba noodles, cooked', 'Pantry', 100, 'g', 99, 5.1, 21, 0.1, 1.8, { tags: ['vegan', 'gluten-free'] }),

  // ---- Anti-inflammatory staples --------------------------------------------
  I('turmeric', 'Turmeric (ground or fresh)', 'Pantry', 100, 'g', 312, 9.7, 67, 3.3, 22.7, { negligible: true, tags: ['vegan', 'pantry-staple'] }),
  I('green_tea', 'Green tea', 'Pantry', 100, 'ml', 1, 0, 0, 0, 0, { negligible: true, tags: ['vegan'] }),
  I('beetroot', 'Beetroot', 'Fruit & veg', 100, 'g', 43, 1.6, 10, 0.2, 2.8, { tags: ['vegan'] }),
  I('red_cabbage', 'Red cabbage', 'Fruit & veg', 100, 'g', 31, 1.4, 7.4, 0.2, 2.1, { tags: ['vegan', 'cruciferous'] }),
  I('pomegranate', 'Pomegranate seeds', 'Fruit & veg', 100, 'g', 83, 1.7, 19, 1.2, 4, { tags: ['vegan'] }),
  I('mint', 'Fresh mint', 'Fruit & veg', 100, 'g', 44, 3.3, 8.4, 0.7, 6.8, { negligible: true, tags: ['vegan'] }),

  // ---- Negligible flavourings ----------------------------------------------
  I('garlic', 'Garlic', 'Fruit & veg', 100, 'g', 149, 6.4, 33, 0.5, 2.1, { negligible: true, tags: ['vegan'] }),
  I('ginger', 'Fresh ginger', 'Fruit & veg', 100, 'g', 80, 1.8, 18, 0.8, 2, { negligible: true, tags: ['vegan'] }),
  I('lemon', 'Lemon', 'Fruit & veg', 'unit', 'lemon', 17, 0.6, 5.4, 0.2, 1.6, { negligible: true, tags: ['vegan'] }),
  I('lime', 'Lime', 'Fruit & veg', 'unit', 'lime', 20, 0.5, 7, 0.1, 1.9, { negligible: true, tags: ['vegan'] }),
  I('soy_sauce', 'Soy sauce (or tamari)', 'Pantry', 100, 'ml', 53, 8, 5, 0.1, 0.8, { negligible: true, tags: ['vegan'] }),
  I('dijon', 'Dijon mustard', 'Pantry', 100, 'g', 66, 4, 6, 3.3, 3, { negligible: true, tags: ['vegan'] }),
  I('balsamic', 'Balsamic vinegar', 'Pantry', 100, 'ml', 88, 0.5, 17, 0, 0, { negligible: true, tags: ['vegan'] }),
  I('sriracha', 'Sriracha / chilli sauce', 'Pantry', 100, 'g', 93, 1.9, 19, 0.9, 2.2, { negligible: true, tags: ['vegan'] }),
  I('herbs_fresh', 'Fresh herbs (coriander, parsley, basil)', 'Fruit & veg', 100, 'g', 23, 2.1, 3.7, 0.5, 2.8, { negligible: true, tags: ['vegan'] }),
  I('spice_mix', 'Spices (cumin, paprika, chilli, curry powder)', 'Pantry', 100, 'g', 300, 12, 50, 10, 25, { negligible: true, tags: ['vegan', 'pantry-staple'] }),
  I('cinnamon', 'Cinnamon', 'Pantry', 100, 'g', 247, 4, 81, 1.2, 53, { negligible: true, tags: ['vegan', 'pantry-staple'] }),
  I('vanilla', 'Vanilla extract', 'Pantry', 100, 'ml', 288, 0.1, 13, 0.1, 0, { negligible: true, tags: ['vegan', 'pantry-staple'] }),
  I('baking_powder', 'Baking powder', 'Pantry', 100, 'g', 53, 0, 28, 0, 0.2, { negligible: true, tags: ['vegan', 'pantry-staple'] }),
  I('stock', 'Stock (salt-reduced)', 'Pantry', 100, 'ml', 4, 0.5, 0.4, 0.1, 0, { negligible: true, tags: ['pantry-staple'] }),
  I('sweetener', 'Granulated sweetener (erythritol / monk fruit)', 'Pantry', 100, 'g', 20, 0, 5, 0, 0, { negligible: true, tags: ['vegan', 'pantry-staple'] }),
];

/**
 * Ingredients where Atwater 4/4/9 arithmetic cannot reproduce the published
 * energy figure, for reasons that are properties of the food rather than typos.
 * The data test exempts these explicitly instead of loosening its tolerance for
 * everything.
 *
 *   cacao_powder  - very high fibre plus food-specific Atwater factors; general
 *                   factors over-predict cocoa's energy substantially.
 *   vanilla       - most of its energy is ethanol (~7 kcal/g), which the
 *                   protein/carb/fat model does not represent at all.
 *   baking_powder - its carbohydrate is largely non-digestible mineral salts.
 *
 * All three are used in gram quantities, so the absolute error in any real
 * portion is a few kcal.
 */
export const ATWATER_EXEMPT = new Set(['cacao_powder', 'vanilla', 'baking_powder']);

/**
 * Dietary classification.
 *
 * Kept as lookup tables rather than extra arguments on every entry: almost all
 * foods are naturally free of both lactose and gluten, so listing only the
 * exceptions is both shorter and much harder to get wrong.
 *
 * LACTOSE, 0-3. The ordering here is well established: milk is highest;
 * fermentation in yoghurt breaks down part of it; and aged hard cheeses
 * (parmesan, mature cheddar) retain very little, because lactose is drained off
 * with the whey and what remains is largely consumed during ageing.
 *   0 none      - no lactose, or lactase already added
 *   1 low       - aged hard cheese, butter. Tolerated by most people who are
 *                 lactose intolerant, though tolerance genuinely varies.
 *   2 moderate  - yoghurt, soft and fresh cheeses
 *   3 high      - milk, cream
 *
 * GLUTEN, 0-2.
 *   0 none      - naturally gluten free
 *   1 trace     - naturally gluten free but routinely cross-contaminated in
 *                 processing (oats are the main one). Buy the labelled
 *                 gluten-free version.
 *   2 contains  - wheat, barley or rye
 */
export const LACTOSE = {
  milk_skim: 3,
  greek_yoghurt: 2, greek_yoghurt_full: 2, cottage_cheese: 2, ricotta: 2,
  feta: 2, mozzarella_light: 2, halloumi: 2,
  parmesan: 1, cheddar_light: 1,
  // Whey concentrate carries some lactose; isolate and plant proteins do not.
  // Treated as low, with the swap called out in the app.
  whey_protein: 1,
};

export const GLUTEN = {
  wholemeal_bread: 2, sourdough: 2, wholemeal_wrap: 2, pasta_wholemeal: 2,
  soy_sauce: 2,   // ordinary soy sauce is wheat-brewed; tamari is not
  oats: 1,
  spice_mix: 1,   // blends and stock powders are a common hidden source
  stock: 1,
};

/**
 * Components commonly associated with an anti-inflammatory pattern of eating.
 *
 * Read docs/NUTRITION.md before relying on this. The short version: the
 * evidence supports a whole dietary PATTERN - largely unprocessed, plenty of
 * plants, olive oil, oily fish, not much refined sugar - far better than it
 * supports any individual food doing something measurable to your inflammation.
 * This tag exists to steer the plan toward that pattern, not to make a claim
 * about any one ingredient.
 */
export const ANTI_INFLAMMATORY = new Set([
  'salmon_fillet', 'salmon_smoked', 'white_fish',
  'olive_oil', 'avocado', 'walnuts', 'almonds', 'pumpkin_seeds', 'chia_seeds', 'flaxseed', 'tahini',
  'spinach', 'kale', 'broccoli', 'cauliflower', 'rocket', 'salad_leaves', 'capsicum',
  'cherry_tomatoes', 'tomato_passata', 'carrot', 'beetroot', 'red_cabbage', 'cabbage_slaw',
  'blueberries', 'raspberries', 'strawberries', 'frozen_berries', 'pomegranate', 'orange', 'kiwi',
  'turmeric', 'ginger', 'garlic', 'green_tea', 'herbs_fresh', 'mint', 'cinnamon',
  'lentils_cooked', 'chickpeas', 'black_beans', 'edamame', 'quinoa', 'oats',
  'cacao_powder', 'dark_chocolate',
]);

// Attach the classification to every ingredient.
for (const ing of INGREDIENTS) {
  ing.lactose = LACTOSE[ing.id] ?? 0;
  ing.gluten = GLUTEN[ing.id] ?? 0;
  ing.antiInflammatory = ANTI_INFLAMMATORY.has(ing.id);
}

/**
 * Is this ingredient acceptable under a dietary restriction?
 * @param {object} ing
 * @param {'lactose-free'|'gluten-free'|'dairy-free'|'vegetarian'|'vegan'} restriction
 * @param {{allowLowLactose?:boolean}} [opts]
 */
export function ingredientAllowed(ing, restriction, { allowLowLactose = false } = {}) {
  switch (restriction) {
    case 'lactose-free':
      return ing.lactose === 0 || (allowLowLactose && ing.lactose === 1);
    case 'gluten-free':
      return ing.gluten < 2;   // 'trace' is allowed; the app says to buy the GF version
    case 'dairy-free':
      return !['Dairy & eggs'].includes(ing.aisle) || (ing.tags ?? []).includes('dairy-free') || ing.id === 'egg' || ing.id === 'egg_whites';
    case 'vegetarian':
      return !(ing.tags ?? []).includes('animal');
    case 'vegan':
      return (ing.tags ?? []).includes('vegan') || (ing.tags ?? []).includes('dairy-free') && !(ing.tags ?? []).includes('animal');
    default:
      return true;
  }
}

/** Lactose-free stand-ins, used to rewrite a meal rather than reject it. */
export const LACTOSE_SWAPS = {
  milk_skim: 'lf_milk',
  greek_yoghurt: 'lf_greek_yoghurt',
  greek_yoghurt_full: 'lf_greek_yoghurt',
};

/** Gluten-free stand-ins. */
export const GLUTEN_SWAPS = {
  wholemeal_bread: 'gf_bread',
  sourdough: 'gf_bread',
  wholemeal_wrap: 'gf_wrap',
  pasta_wholemeal: 'gf_pasta',
};

/**
 * Protein families.
 *
 * Chicken breast and chicken thigh are different ingredients but the same
 * animal, and a menu with one at lunch and the other at dinner is chicken
 * fourteen times a week. Grouping them lets the planner see that.
 *
 * Protein powders are deliberately absent: having a shake as a snack AND
 * protein in your smoothie is a normal, intentional way to hit a high target,
 * not monotony to be designed out.
 */
export const PROTEIN_FAMILY = {
  chicken_breast: 'chicken', chicken_thigh: 'chicken',
  beef_mince_lean: 'beef', beef_rump: 'beef',
  lamb_leg: 'lamb', lamb_mince: 'lamb',
  pork_loin: 'pork', pork_mince: 'pork',
  turkey_mince: 'turkey',
  salmon_fillet: 'salmon', salmon_smoked: 'salmon',
  white_fish: 'white fish', prawns: 'prawns', tuna_canned: 'tuna',
  egg: 'egg', egg_whites: 'egg',
  greek_yoghurt: 'yoghurt', greek_yoghurt_full: 'yoghurt', lf_greek_yoghurt: 'yoghurt', coconut_yoghurt: 'yoghurt',
  cottage_cheese: 'fresh cheese', ricotta: 'fresh cheese',
  feta: 'salty cheese', halloumi: 'salty cheese',
  tofu_firm: 'soy', tempeh: 'soy', edamame: 'soy',
  lentils_cooked: 'pulses', chickpeas: 'pulses', black_beans: 'pulses',
};

/** Ingredients exempt from repetition penalties, because repeating them is the point. */
export const REPETITION_EXEMPT = new Set(['whey_protein', 'protein_isolate', 'peanut_powder']);

export function proteinFamily(id) {
  return PROTEIN_FAMILY[id] ?? null;
}

export const BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

export const AISLE_ORDER = ['Fruit & veg', 'Meat & seafood', 'Dairy & eggs', 'Fridge', 'Freezer', 'Bakery', 'Pantry'];

export function getIngredient(id) {
  const ing = BY_ID[id];
  if (!ing) throw new RangeError(`Unknown ingredient id: ${id}`);
  return ing;
}
