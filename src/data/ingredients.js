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

export const BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

export const AISLE_ORDER = ['Fruit & veg', 'Meat & seafood', 'Dairy & eggs', 'Fridge', 'Freezer', 'Bakery', 'Pantry'];

export function getIngredient(id) {
  const ing = BY_ID[id];
  if (!ing) throw new RangeError(`Unknown ingredient id: ${id}`);
  return ing;
}
