/**
 * Meal library.
 *
 * Every meal is defined as ingredients + quantities. Macros are COMPUTED from
 * the ingredient table (src/data/ingredients.js), never hand-typed, so that
 * scaling a portion scales the numbers correctly and the shopping list always
 * matches what the plan actually asks you to eat.
 *
 * Quantity convention: for ingredients measured `per: 100`, qty is grams or
 * millilitres. For `per: 'unit'` ingredients, qty is a count of units
 * (2 eggs, 1.5 scoops, 0.5 banana).
 *
 * Design bias of this library, stated plainly so you can disagree with it:
 *   - Protein in every single meal, including snacks and dessert. Hitting a
 *     high daily protein target is far easier when it is spread across 5 eating
 *     occasions than when dinner has to carry 60g of it.
 *   - Fibre and slower-digesting carbohydrate sources are favoured over refined
 *     ones. This is the conventional approach where insulin resistance is a
 *     concern, which it commonly is in PCOS. See docs/NUTRITION.md.
 *   - Dessert is a planned, protein-containing item, not a cheat. A plan that
 *     forbids dessert is a plan you abandon in week 3.
 */

/** @typedef {{id:string,name:string,slot:string,prepMin:number,tags:string[],items:[string,number][],method:string,note:string}} Meal */

const M = (id, name, slot, prepMin, tags, items, method, note) =>
  ({ id, name, slot, prepMin, tags, items, method, note });

/** @type {Meal[]} */
export const MEALS = [
  // ============================ BREAKFAST ==================================
  M('brk-yoghurt-bowl', 'Greek Yoghurt & Berry Protein Bowl', 'breakfast', 5,
    ['vegetarian', 'no-cook', 'quick', 'low-gi', 'gluten-free'],
    [['greek_yoghurt', 200], ['whey_protein', 0.5], ['blueberries', 80], ['chia_seeds', 10], ['almonds', 12]],
    'Stir the protein powder through the yoghurt with a splash of water first so it goes smooth, not chalky. Top with berries, chia and chopped almonds.',
    'The fastest high-protein breakfast in the library. Chia adds fibre that slows the whole thing down.'),

  M('brk-savoury-scramble', 'Savoury Protein Scramble', 'breakfast', 12,
    ['vegetarian', 'savoury', 'low-gi'],
    [['egg', 2], ['egg_whites', 100], ['spinach', 60], ['mushrooms', 80], ['feta', 25], ['wholemeal_bread', 1], ['olive_oil', 5]],
    'Soft-scramble the eggs and whites over low heat. Wilt the spinach and mushrooms separately so the eggs do not go watery. Crumble feta over at the end.',
    'Whole eggs plus whites keeps the protein high without the fat climbing. A savoury breakfast blunts sweet cravings later in the day for a lot of people.'),

  M('brk-overnight-oats', 'High-Protein Overnight Oats', 'breakfast', 5,
    ['vegetarian', 'make-ahead', 'no-cook', 'low-gi'],
    [['oats', 45], ['greek_yoghurt', 150], ['whey_protein', 1], ['almond_milk', 100], ['chia_seeds', 8], ['frozen_berries', 80], ['cinnamon', 1]],
    'Combine everything in a jar the night before. It thickens a lot, so add more almond milk in the morning if you want it looser.',
    'Make three at once on Sunday. The mornings you do not have to think are the mornings you stay on plan.'),

  M('brk-cottage-salmon-toast', 'Cottage Cheese & Smoked Salmon Toast', 'breakfast', 6,
    ['savoury', 'quick', 'omega3'],
    [['wholemeal_bread', 2], ['cottage_cheese', 120], ['salmon_smoked', 70], ['rocket', 20], ['lemon', 0.25]],
    'Toast the bread, spread cottage cheese thickly, layer salmon and rocket, finish with lemon and cracked pepper.',
    'Around 40g of protein from something that takes six minutes and feels like a cafe order.'),

  M('brk-protein-pancakes', 'Protein Pancakes', 'breakfast', 15,
    ['vegetarian', 'sweet', 'weekend'],
    [['oats', 40], ['whey_protein', 1], ['egg_whites', 120], ['banana', 0.5], ['baking_powder', 3], ['greek_yoghurt', 80], ['raspberries', 60]],
    'Blitz oats, protein, whites, banana and baking powder to a batter. Cook small pancakes on medium-low - protein batter burns faster than you expect. Top with yoghurt and raspberries.',
    'The Sunday breakfast that keeps the week intact. Genuinely high protein, not a pancake with a scoop thrown in.'),

  M('brk-tofu-scramble', 'Turmeric Tofu Scramble', 'breakfast', 12,
    ['vegan', 'dairy-free', 'savoury', 'low-gi'],
    [['tofu_firm', 180], ['spinach', 60], ['cherry_tomatoes', 80], ['nutritional_yeast', 8], ['olive_oil', 7], ['spice_mix', 3], ['wholemeal_bread', 1]],
    'Crumble the tofu and press out moisture with paper towel - this is the step that decides whether it tastes good. Fry hard with turmeric and paprika until the edges catch.',
    'The plant-based option that actually holds its protein. Nutritional yeast does the savoury, cheesy work.'),

  M('brk-green-smoothie', 'Green Protein Smoothie', 'breakfast', 4,
    ['vegetarian', 'quick', 'no-cook', 'on-the-go'],
    [['whey_protein', 1.5], ['spinach', 50], ['banana', 0.5], ['almond_milk', 250], ['peanut_powder', 15], ['flaxseed', 10]],
    'Blend spinach with the milk first until no flecks remain, then add everything else. Ice optional.',
    'For mornings that got away from you. Flaxseed is doing real fibre work here - do not skip it.'),

  M('brk-shakshuka', 'Shakshuka-Style Baked Eggs', 'breakfast', 20,
    ['vegetarian', 'savoury', 'weekend', 'low-gi'],
    [['egg', 3], ['tomato_passata', 200], ['capsicum', 100], ['red_onion', 60], ['feta', 30], ['spice_mix', 4], ['olive_oil', 8], ['wholemeal_bread', 1], ['herbs_fresh', 10]],
    'Soften onion and capsicum, add passata and spices, simmer until thick. Make wells, crack in eggs, cover and cook until the whites set.',
    'A weekend breakfast that eats like a restaurant one. Leftover sauce reheats for a second day.'),

  M('brk-chia-pudding', 'Berry Protein Chia Pudding', 'breakfast', 5,
    ['vegetarian', 'make-ahead', 'no-cook', 'high-fibre', 'gluten-free'],
    [['chia_seeds', 30], ['almond_milk', 200], ['whey_protein', 1], ['greek_yoghurt', 100], ['strawberries', 100], ['vanilla', 3]],
    'Whisk chia into the milk and protein, wait five minutes, whisk again to break up clumps. Refrigerate overnight. Layer with yoghurt and berries.',
    'Roughly 12g of fibre before you have even counted the berries.'),

  M('brk-avo-egg-sourdough', 'Egg & Avocado Sourdough', 'breakfast', 10,
    ['vegetarian', 'savoury', 'quick'],
    [['sourdough', 1], ['egg', 2], ['avocado', 60], ['cherry_tomatoes', 80], ['pumpkin_seeds', 10], ['lemon', 0.25]],
    'Poach or fry the eggs. Smash the avocado with lemon and plenty of salt. Seeds on top for crunch.',
    'Lower protein than most breakfasts here, so pair it with a protein-forward snack. Kept because some mornings you want this and nothing else.'),

  M('brk-turkey-wrap', 'Turkey & Egg Breakfast Wrap', 'breakfast', 12,
    ['savoury', 'on-the-go', 'high-protein'],
    [['wholemeal_wrap', 1], ['egg', 2], ['turkey_mince', 80], ['spinach', 40], ['cheddar_light', 20], ['salsa', 40], ['olive_oil', 5]],
    'Brown the turkey with paprika and cumin. Scramble the eggs. Load the wrap, roll tight, then toast it seam-side down in the dry pan so it holds.',
    'Wraps and eats in the car. Makes the "no time" excuse redundant.'),

  M('brk-pb-banana-oats', 'Banana Peanut Protein Oats', 'breakfast', 8,
    ['vegetarian', 'sweet', 'warm'],
    [['oats', 50], ['milk_skim', 200], ['whey_protein', 1], ['banana', 0.5], ['peanut_butter', 15], ['cinnamon', 2]],
    'Cook the oats in the milk. Take off the heat BEFORE stirring the protein in - boiling it makes it grainy. Swirl peanut butter on top.',
    'The cold-morning one. Cinnamon is there for taste; do not expect it to do anything clinical.'),

  M('brk-halloumi-bake', 'Mushroom, Spinach & Halloumi Bake', 'breakfast', 22,
    ['vegetarian', 'savoury', 'make-ahead', 'gluten-free', 'low-gi'],
    [['egg', 3], ['egg_whites', 80], ['mushrooms', 100], ['spinach', 80], ['halloumi', 45], ['cherry_tomatoes', 80], ['olive_oil', 6]],
    'Bake at 180C in a small dish for about 20 minutes until just set. Cut into portions - this keeps four days in the fridge.',
    'Batch this on Sunday and breakfast is solved until Wednesday.'),

  M('brk-bircher', 'Apple Bircher with Greek Yoghurt', 'breakfast', 6,
    ['vegetarian', 'make-ahead', 'no-cook', 'low-gi', 'high-fibre'],
    [['oats', 40], ['greek_yoghurt', 180], ['apple', 0.5], ['whey_protein', 0.5], ['walnuts', 12], ['cinnamon', 2], ['almond_milk', 60]],
    'Grate the apple (skin on - that is where the fibre is), stir everything together, leave overnight.',
    'Grated apple beats chopped here: it distributes the sweetness so you need nothing added.'),

  // ============================ LUNCH ======================================
  M('lun-chicken-quinoa-bowl', 'Chicken, Quinoa & Roast Veg Bowl', 'lunch', 20,
    ['meal-prep', 'gluten-free', 'low-gi', 'high-protein'],
    [['chicken_breast', 150], ['quinoa', 120], ['roast_veg_mix', 150], ['spinach', 50], ['feta', 25], ['olive_oil', 8], ['lemon', 0.5], ['spice_mix', 3]],
    'Roast veg and chicken on one tray at 200C. Build over quinoa and spinach, dress with lemon and oil.',
    'The backbone meal-prep lunch. Roast a double batch of veg and it feeds two different lunches.'),

  M('lun-tuna-bean-salad', 'Tuna & White Bean Salad', 'lunch', 8,
    ['no-cook', 'quick', 'pantry', 'gluten-free', 'high-fibre'],
    [['tuna_canned', 150], ['chickpeas', 120], ['cherry_tomatoes', 100], ['cucumber', 80], ['red_onion', 30], ['olive_oil', 10], ['lemon', 0.5], ['herbs_fresh', 10]],
    'Drain everything well, dress hard with lemon and oil, let it sit ten minutes before eating so the beans absorb the dressing.',
    'Entirely from the pantry. The lunch for days when the fridge has failed you.'),

  M('lun-chicken-caesar', 'Chicken Caesar-Style Salad', 'lunch', 15,
    ['gluten-free', 'high-protein'],
    [['chicken_breast', 160], ['salad_leaves', 120], ['chickpeas', 90], ['greek_yoghurt', 80], ['parmesan', 20], ['egg', 1], ['dijon', 8], ['lemon', 0.5], ['olive_oil', 6], ['pumpkin_seeds', 10]],
    'Roast the drained chickpeas at 200C for 20 minutes until they crackle - they stand in for croutons and they are better. Dressing: Greek yoghurt, dijon, lemon, parmesan, black pepper.',
    'A yoghurt-based Caesar dressing gets you the flavour at a fraction of the calories of the bottled version, and crisped chickpeas bring the fibre up to where the rest of the library sits.'),

  M('lun-burrito-bowl', 'Beef & Black Bean Burrito Bowl', 'lunch', 18,
    ['meal-prep', 'gluten-free', 'high-fibre', 'iron'],
    [['beef_mince_lean', 130], ['black_beans', 120], ['brown_rice', 120], ['capsicum', 80], ['salsa', 60], ['avocado', 50], ['cheddar_light', 20], ['spice_mix', 5]],
    'Brown the mince hard with cumin, paprika and a little chilli. Layer everything cold or warm - it works both ways.',
    'Beans and brown rice together do serious fibre work, and red meat here is a useful iron source.'),

  M('lun-prawn-rice-bowl', 'Prawn & Avocado Rice Bowl', 'lunch', 15,
    ['gluten-free', 'omega3'],
    [['prawns', 160], ['basmati_rice', 130], ['avocado', 60], ['cucumber', 80], ['edamame', 70], ['soy_sauce', 12], ['sriracha', 10], ['pumpkin_seeds', 10]],
    'Sear the prawns two minutes a side, no longer. Assemble cold rice, prawns, veg, and a soy-sriracha drizzle.',
    'Edamame quietly adds 8g of protein most people forget to count.'),

  M('lun-lentil-feta-salad', 'Lentil, Feta & Roast Veg Salad', 'lunch', 12,
    ['vegetarian', 'gluten-free', 'high-fibre', 'low-gi'],
    [['lentils_cooked', 200], ['feta', 45], ['roast_veg_mix', 150], ['rocket', 50], ['walnuts', 15], ['balsamic', 12], ['olive_oil', 8]],
    'Warm the lentils slightly - they take dressing far better warm than straight from the fridge.',
    'Around 14g of fibre. A vegetarian lunch that still lands near 25g of protein.'),

  M('lun-chicken-wrap', 'Chicken & Slaw Wrap', 'lunch', 10,
    ['quick', 'on-the-go'],
    [['wholemeal_wrap', 1], ['chicken_breast', 140], ['cabbage_slaw', 100], ['greek_yoghurt', 60], ['dijon', 8], ['spinach', 30], ['olive_oil', 5]],
    'Yoghurt and dijon make the slaw dressing. Roll tight and cut on the diagonal so it holds together.',
    'Yoghurt-dressed slaw instead of mayo saves roughly 150 kcal and adds protein.'),

  M('lun-salmon-sweet-potato', 'Salmon & Sweet Potato Salad', 'lunch', 25,
    ['gluten-free', 'omega3', 'low-gi'],
    [['salmon_fillet', 130], ['sweet_potato', 200], ['asparagus', 100], ['salad_leaves', 60], ['tahini', 15], ['lemon', 0.5], ['pumpkin_seeds', 10]],
    'Roast sweet potato cubes at 200C for 25 minutes; add salmon and asparagus for the last 10. Tahini thinned with lemon and water makes the dressing.',
    'Oily fish twice a week is a standard dietary recommendation and this is an easy place to bank one of them.'),

  M('lun-tofu-buddha-bowl', 'Tofu Buddha Bowl', 'lunch', 20,
    ['vegan', 'dairy-free', 'gluten-free', 'high-fibre', 'low-gi'],
    [['tofu_firm', 200], ['quinoa', 120], ['broccoli', 120], ['carrot', 80], ['edamame', 70], ['tahini', 18], ['soy_sauce', 12], ['lemon', 0.5]],
    'Press the tofu, cube it, toss in cornflour-free spice and roast at 200C for 22 minutes until crisp. Tahini-lemon-soy dressing.',
    'Fully plant-based and still clears 35g of protein.'),

  M('lun-turkey-meatball-box', 'Turkey Meatball Salad Box', 'lunch', 25,
    ['meal-prep', 'gluten-free', 'high-protein'],
    [['turkey_mince', 170], ['oats', 15], ['egg', 0.5], ['salad_leaves', 80], ['cherry_tomatoes', 100], ['cucumber', 80], ['carrot', 80], ['hummus', 45], ['greek_yoghurt', 60], ['herbs_fresh', 12], ['olive_oil', 6]],
    'Bind mince with blitzed oats and egg, roll into balls, bake 20 minutes at 200C. Yoghurt with herbs and lemon as the dip, hummus and carrot sticks alongside.',
    'Makes a double batch easily. Meatballs freeze and reheat better than sliced chicken.'),

  M('lun-chicken-chickpea-curry', 'Chicken & Chickpea Curry Bowl', 'lunch', 10,
    ['leftovers', 'gluten-free', 'high-fibre', 'warm'],
    [['chicken_breast', 140], ['chickpeas', 130], ['tomato_passata', 150], ['spinach', 60], ['coconut_milk_light', 60], ['basmati_rice', 110], ['spice_mix', 6], ['garlic', 8]],
    'Built to be the reheated half of the curry dinner. Add the spinach when reheating so it does not go grey.',
    'Deliberately overlaps with the curry dinner - cook once, eat twice.'),

  M('lun-halloumi-chickpea-salad', 'Halloumi, Rocket & Chickpea Salad', 'lunch', 12,
    ['vegetarian', 'gluten-free', 'quick'],
    [['halloumi', 80], ['chickpeas', 150], ['rocket', 60], ['cherry_tomatoes', 100], ['red_onion', 30], ['olive_oil', 8], ['balsamic', 12], ['pumpkin_seeds', 10]],
    'Dry-fry the halloumi in a hot non-stick pan - it releases enough of its own fat. Assemble while still warm.',
    'Halloumi is high in both protein and fat, so the portion is deliberately modest. Chickpeas carry the rest.'),

  M('lun-protein-box', 'Egg & Cottage Cheese Protein Box', 'lunch', 12,
    ['vegetarian', 'no-cook', 'make-ahead', 'gluten-free', 'high-protein'],
    [['egg', 3], ['cottage_cheese', 150], ['cherry_tomatoes', 100], ['cucumber', 100], ['carrot', 80], ['hummus', 50], ['almonds', 15]],
    'Boil the eggs 8 minutes for a set-but-not-chalky yolk. Assemble as a snack box.',
    'No cooking at the point of eating. Good for a day of back-to-back calls.'),

  M('lun-tempeh-satay', 'Tempeh Satay Bowl', 'lunch', 18,
    ['vegan', 'dairy-free', 'high-fibre', 'low-gi'],
    [['tempeh', 150], ['brown_rice', 120], ['cabbage_slaw', 100], ['carrot', 60], ['peanut_powder', 25], ['soy_sauce', 12], ['lime', 0.5], ['sriracha', 10]],
    'Steam the tempeh 8 minutes before frying - it removes the bitterness people blame on tempeh itself. Satay sauce: peanut powder, soy, lime, hot water.',
    'Powdered peanut butter makes a genuine satay sauce for roughly a third of the calories of the real thing.'),

  // ============================ DINNER =====================================
  M('din-garlic-chicken-veg', 'Garlic Chicken with Roast Veg', 'dinner', 30,
    ['gluten-free', 'low-gi', 'family', 'high-protein'],
    [['chicken_breast', 180], ['sweet_potato', 180], ['broccoli', 150], ['capsicum', 100], ['olive_oil', 10], ['garlic', 12], ['herbs_fresh', 10]],
    'One tray, 200C. Veg in first for 15 minutes, chicken on top for the next 18. Garlic and herbs over everything at the end, not the start, or the garlic burns.',
    'The default dinner. Simple enough to cook tired, which is the only test that matters on a Wednesday.'),

  M('din-salmon-asparagus', 'Salmon, Asparagus & Sweet Potato', 'dinner', 28,
    ['gluten-free', 'omega3', 'low-gi'],
    [['salmon_fillet', 160], ['asparagus', 120], ['sweet_potato', 200], ['green_beans', 80], ['olive_oil', 8], ['lemon', 0.5], ['garlic', 8]],
    'Sweet potato wedges 25 minutes at 200C. Salmon skin-side down in a hot pan for 4 minutes, then 2 minutes off the heat.',
    'Your second oily-fish serve for the week if you had the salmon salad at lunch earlier.'),

  M('din-beef-stirfry', 'Beef & Vegetable Stir-Fry', 'dinner', 20,
    ['quick', 'iron', 'high-protein'],
    [['beef_mince_lean', 160], ['brown_rice', 130], ['broccoli', 120], ['capsicum', 100], ['carrot', 70], ['soy_sauce', 15], ['ginger', 10], ['garlic', 10], ['olive_oil', 8]],
    'Pan hot enough to sear, not steam. Beef first and remove it, veg next, everything back together for 60 seconds.',
    'Red meat once or twice a week is worth keeping for iron, which matters more if your periods are heavy.'),

  M('din-chicken-chickpea-curry', 'Chicken & Chickpea Curry', 'dinner', 35,
    ['batch-cook', 'gluten-free', 'high-fibre', 'family'],
    [['chicken_thigh', 180], ['chickpeas', 150], ['tomato_passata', 200], ['coconut_milk_light', 80], ['spinach', 80], ['basmati_rice', 120], ['spice_mix', 8], ['garlic', 12], ['ginger', 10], ['red_onion', 70]],
    'Bloom the spices in oil for 30 seconds before anything else goes in - this is the single step that separates good curry from beige curry. Simmer 25 minutes.',
    'Deliberately makes extra for the curry lunch. Chicken thigh over breast here because it does not dry out on reheating.'),

  M('din-turkey-bolognese', 'Turkey Bolognese', 'dinner', 30,
    ['batch-cook', 'family', 'high-fibre'],
    [['turkey_mince', 170], ['pasta_wholemeal', 140], ['tomato_passata', 200], ['mushrooms', 100], ['carrot', 70], ['red_onion', 60], ['parmesan', 20], ['olive_oil', 8], ['garlic', 10]],
    'Grate the carrot and mushroom finely into the sauce - it doubles the vegetable content without anyone noticing.',
    'Freezes in portions. A sauce in the freezer is worth more than willpower on a bad night.'),

  M('din-baked-fish-greens', 'Baked White Fish with Lemon & Greens', 'dinner', 25,
    ['gluten-free', 'light', 'low-gi', 'quick'],
    [['white_fish', 200], ['potato', 200], ['green_beans', 120], ['spinach', 80], ['olive_oil', 10], ['lemon', 0.75], ['garlic', 10], ['herbs_fresh', 10]],
    'Bake the fish in foil with lemon and garlic - 15 minutes at 190C, no more. Crush the potatoes rather than mashing them.',
    'The leanest dinner in the library. Useful on a day when lunch ran heavy.'),

  M('din-prawn-chickpea-pasta', 'Prawn & Zucchini Chickpea Pasta', 'dinner', 22,
    ['gluten-free', 'high-fibre', 'high-protein'],
    [['prawns', 180], ['chickpea_pasta', 150], ['zucchini', 150], ['cherry_tomatoes', 120], ['olive_oil', 10], ['garlic', 12], ['parmesan', 15], ['herbs_fresh', 10], ['lemon', 0.5]],
    'Chickpea pasta goes from firm to mush fast - set a timer and pull it a minute early. Prawns in for the last two minutes only.',
    'Chickpea pasta roughly doubles the protein and fibre of wheat pasta for a similar calorie load.'),

  M('din-tofu-broccoli-stirfry', 'Crispy Tofu & Broccoli Stir-Fry', 'dinner', 25,
    ['vegan', 'dairy-free', 'high-fibre', 'low-gi'],
    [['tofu_firm', 220], ['broccoli', 150], ['brown_rice', 130], ['capsicum', 80], ['edamame', 70], ['soy_sauce', 15], ['sriracha', 12], ['ginger', 10], ['olive_oil', 10]],
    'Press the tofu for 15 minutes under something heavy. Crisp it in the pan undisturbed - moving it early is why tofu falls apart.',
    'Tofu plus edamame gets a vegan dinner to 45g of protein.'),

  M('din-chicken-fajita-tray', 'Chicken Fajita Tray Bake', 'dinner', 30,
    ['family', 'one-pan', 'gluten-free'],
    [['chicken_breast', 180], ['capsicum', 150], ['red_onion', 80], ['black_beans', 120], ['salsa', 60], ['avocado', 50], ['cheddar_light', 25], ['spice_mix', 6], ['olive_oil', 8]],
    'Everything on one tray at 210C for 25 minutes. Avocado and salsa added cold at the table.',
    'One tray, one wash-up. Serve with wraps for anyone else at the table and keep yours as a bowl.'),

  M('din-lentil-dahl', 'Lentil & Vegetable Dahl', 'dinner', 35,
    ['vegan', 'dairy-free', 'batch-cook', 'high-fibre', 'low-gi'],
    [['lentils_cooked', 250], ['tomato_passata', 180], ['coconut_milk_light', 100], ['spinach', 100], ['carrot', 80], ['basmati_rice', 110], ['spice_mix', 8], ['garlic', 12], ['ginger', 12], ['red_onion', 70]],
    'Long, slow simmer. Dahl improves for a full 30 minutes past the point it looks done.',
    'Close to 20g of fibre in one bowl. Batch it - the second day is better than the first.'),

  M('din-beef-kofta', 'Beef Kofta with Tzatziki', 'dinner', 28,
    ['gluten-free', 'iron', 'family'],
    [['beef_mince_lean', 170], ['quinoa', 120], ['greek_yoghurt', 120], ['cucumber', 100], ['salad_leaves', 60], ['cherry_tomatoes', 100], ['spice_mix', 6], ['garlic', 10], ['olive_oil', 8], ['herbs_fresh', 12]],
    'Mix mince with cumin, coriander, garlic and mint, then rest it 10 minutes before shaping or the koftas crack. Tzatziki: grated cucumber squeezed dry, yoghurt, garlic, lemon.',
    'Squeezing the cucumber dry is not optional unless you want soup.'),

  M('din-salmon-poke', 'Sesame Salmon Poke Bowl', 'dinner', 20,
    ['gluten-free', 'omega3', 'no-cook-option'],
    [['salmon_fillet', 150], ['basmati_rice', 130], ['edamame', 80], ['cucumber', 100], ['avocado', 50], ['carrot', 60], ['soy_sauce', 15], ['sriracha', 10], ['pumpkin_seeds', 10]],
    'Sear the salmon rare in the middle, or bake it through if raw-ish fish is not your thing. Dress the warm rice with a splash of vinegar.',
    'Eats light, lands at around 40g of protein.'),

  M('din-chicken-souvlaki', 'Chicken Souvlaki Plate', 'dinner', 30,
    ['gluten-free', 'family', 'high-protein'],
    [['chicken_breast', 190], ['greek_yoghurt', 100], ['potato', 180], ['salad_leaves', 70], ['cherry_tomatoes', 100], ['red_onion', 40], ['feta', 30], ['olive_oil', 10], ['lemon', 0.75], ['spice_mix', 5]],
    'Marinate the chicken in yoghurt, lemon, garlic and oregano for at least 30 minutes - the yoghurt tenderises it properly. Grill hot.',
    'A yoghurt marinade is the reliable way to keep chicken breast from going dry.'),

  M('din-stuffed-capsicums', 'Mexican Turkey Stuffed Capsicums', 'dinner', 40,
    ['gluten-free', 'batch-cook', 'high-fibre'],
    [['turkey_mince', 180], ['capsicum', 220], ['black_beans', 120], ['brown_rice', 90], ['salsa', 60], ['mozzarella_light', 40], ['spice_mix', 6], ['red_onion', 60], ['olive_oil', 8]],
    'Par-bake the halved capsicums 10 minutes before stuffing, otherwise the filling is ready and the shells are still raw.',
    'Reheats well and looks like effort for very little effort.'),

  M('din-thai-fish-curry', 'Thai Green Fish Curry', 'dinner', 25,
    ['gluten-free', 'dairy-free', 'quick', 'light'],
    [['white_fish', 200], ['coconut_milk_light', 150], ['green_beans', 100], ['capsicum', 80], ['basmati_rice', 120], ['spice_mix', 8], ['ginger', 10], ['lime', 0.5], ['herbs_fresh', 12]],
    'White fish needs six minutes in the simmering sauce, not fifteen. Lime and coriander go in off the heat.',
    'Light coconut milk keeps this at a sane calorie load. Full-fat would add roughly 200 kcal.'),

  M('din-cauli-chicken-bowl', 'Chicken & Cauliflower Rice Bowl', 'dinner', 25,
    ['gluten-free', 'low-carb', 'low-gi', 'light'],
    [['chicken_breast', 200], ['cauliflower', 250], ['broccoli', 100], ['mushrooms', 100], ['avocado', 50], ['olive_oil', 10], ['garlic', 10], ['soy_sauce', 12], ['pumpkin_seeds', 12]],
    'Blitz cauliflower to rice and dry-fry it first to drive off moisture before anything else goes in the pan.',
    'The lower-carbohydrate dinner for a day when breakfast and lunch already used the carbs. Not because carbs are the enemy - they are not - just for balance.'),

  M('din-halloumi-traybake', 'Halloumi, Chickpea & Roast Veg Traybake', 'dinner', 30,
    ['vegetarian', 'gluten-free', 'one-pan', 'high-fibre', 'low-gi'],
    [['halloumi', 75], ['chickpeas', 180], ['roast_veg_mix', 150], ['spinach', 60], ['greek_yoghurt', 80], ['olive_oil', 7], ['lemon', 0.5], ['spice_mix', 5], ['garlic', 10]],
    'Chickpeas and veg on the tray at 200C for 20 minutes, halloumi added for the last 8 so it colours without going rubbery. Spinach wilted through at the end, lemon-yoghurt spooned over.',
    'Roasting the chickpeas rather than tipping them in cold is what makes this a dinner instead of a salad.'),

  M('din-black-bean-chilli', 'Black Bean & Sweet Potato Chilli', 'dinner', 35,
    ['vegan', 'dairy-free', 'gluten-free', 'batch-cook', 'high-fibre', 'low-gi'],
    [['black_beans', 170], ['sweet_potato', 150], ['edamame', 90], ['tomato_passata', 200], ['brown_rice', 100], ['capsicum', 100], ['red_onion', 70], ['olive_oil', 7], ['spice_mix', 7], ['garlic', 12]],
    'Bloom the spices in the oil first. Sweet potato in early so it softens, beans and edamame in the last ten minutes. It thickens as it sits.',
    'Edamame is doing the protein work that a bean chilli normally lacks. Doubles and freezes well.'),

  M('din-egg-fried-rice', 'Egg & Edamame Fried Rice', 'dinner', 20,
    ['vegetarian', 'quick', 'dairy-free', 'high-protein'],
    [['egg', 3], ['brown_rice', 150], ['edamame', 100], ['capsicum', 80], ['carrot', 60], ['spinach', 50], ['mushrooms', 80], ['soy_sauce', 15], ['olive_oil', 8], ['ginger', 8], ['garlic', 8]],
    'Cold, day-old rice is the whole trick - fresh rice steams instead of frying. Scramble the eggs separately and fold them back in at the end.',
    'The fastest vegetarian dinner here, and a good use for leftover rice.'),

  // ============================ SNACK ======================================
  M('snk-yoghurt-berries', 'Greek Yoghurt & Berries', 'snack', 2,
    ['vegetarian', 'no-cook', 'quick', 'gluten-free'],
    [['greek_yoghurt', 170], ['raspberries', 80], ['pumpkin_seeds', 10]],
    'That is the whole recipe.',
    'Around 20g of protein in two minutes.'),

  M('snk-shake-apple', 'Protein Shake & Apple', 'snack', 2,
    ['vegetarian', 'on-the-go', 'quick'],
    [['whey_protein', 1], ['almond_milk', 250], ['apple', 1]],
    'Shake, eat apple.',
    'The portable default. Keep a shaker and a sachet in your bag.'),

  M('snk-eggs-tomatoes', 'Boiled Eggs & Cherry Tomatoes', 'snack', 3,
    ['vegetarian', 'make-ahead', 'gluten-free', 'savoury'],
    [['egg', 2], ['cherry_tomatoes', 120], ['spice_mix', 1]],
    'Boil six eggs on Sunday. Salt, pepper, a little paprika.',
    'The savoury snack for people who do not want another sweet yoghurt.'),

  M('snk-cottage-rice-cakes', 'Cottage Cheese & Rice Cakes', 'snack', 3,
    ['vegetarian', 'quick', 'savoury'],
    [['cottage_cheese', 150], ['rice_cakes', 2], ['cucumber', 60], ['spice_mix', 1]],
    'Spread thickly, cucumber on top, cracked pepper.',
    'High volume for the calories. Useful in the late-afternoon hungry window.'),

  M('snk-hummus-veg', 'Hummus & Veg Sticks', 'snack', 4,
    ['vegan', 'dairy-free', 'no-cook', 'high-fibre'],
    [['hummus', 70], ['carrot', 100], ['capsicum', 100], ['cucumber', 80]],
    'Cut the veg in advance or it will not get eaten.',
    'Lower protein than most snacks here - pair it with a shake on a heavy protein day.'),

  M('snk-edamame', 'Salted Edamame', 'snack', 5,
    ['vegan', 'dairy-free', 'gluten-free', 'high-fibre', 'savoury'],
    [['edamame', 180], ['spice_mix', 2]],
    'Steam from frozen 4 minutes, sea salt, chilli flakes.',
    'Over 20g of protein from a vegetable. Genuinely filling.'),

  M('snk-tuna-cucumber', 'Tuna & Cucumber Boats', 'snack', 5,
    ['no-cook', 'pantry', 'gluten-free', 'savoury', 'high-protein'],
    [['tuna_canned', 95], ['cucumber', 150], ['greek_yoghurt', 40], ['dijon', 6], ['lemon', 0.25]],
    'Halve the cucumber lengthways, scoop the seeds, fill with the tuna mixed through yoghurt and dijon.',
    'Around 30g of protein for under 200 kcal.'),

  M('snk-almonds-orange', 'Almonds & an Orange', 'snack', 1,
    ['vegan', 'dairy-free', 'no-cook', 'on-the-go'],
    [['almonds', 25], ['orange', 1]],
    'Portion the almonds out. Eating from the bag is how 25g becomes 90g.',
    'Weigh these once and look at what 25g actually is. It is less than you think.'),

  M('snk-pb-yoghurt', 'Peanut Protein Yoghurt Cup', 'snack', 3,
    ['vegetarian', 'quick', 'sweet'],
    [['greek_yoghurt', 170], ['peanut_powder', 15], ['banana', 0.5], ['cinnamon', 1]],
    'Stir the peanut powder in with a splash of water first.',
    'Tastes like dessert, lands like a protein serve.'),

  M('snk-chia-pot', 'Vanilla Chia Protein Pot', 'snack', 4,
    ['vegetarian', 'make-ahead', 'high-fibre', 'gluten-free'],
    [['chia_seeds', 22], ['almond_milk', 150], ['whey_protein', 0.75], ['vanilla', 3], ['strawberries', 80]],
    'Make four on Sunday in small jars.',
    'Fibre and protein together - the combination that actually holds off hunger.'),

  M('snk-ricotta-rice-cakes', 'Ricotta & Berry Rice Cakes', 'snack', 3,
    ['vegetarian', 'quick', 'sweet'],
    [['ricotta', 120], ['rice_cakes', 2], ['blueberries', 70], ['cinnamon', 1]],
    'Ricotta, berries, cinnamon, done.',
    'Ricotta is underrated: creamy, mild, and around 11g of protein per 100g.'),

  M('snk-pumpkin-yoghurt', 'Pumpkin Seed Yoghurt Cup', 'snack', 2,
    ['vegetarian', 'quick', 'gluten-free', 'zinc'],
    [['greek_yoghurt', 170], ['pumpkin_seeds', 18], ['blueberries', 60]],
    'Stir, top, eat.',
    'Pumpkin seeds are a good zinc source and add texture that makes yoghurt feel like a real snack.'),

  M('snk-banana-pb-dip', 'Banana with Peanut Dip', 'snack', 3,
    ['vegetarian', 'quick', 'sweet', 'pre-workout'],
    [['banana', 1], ['peanut_powder', 20], ['greek_yoghurt', 60]],
    'Peanut powder whisked into yoghurt with water to a dipping consistency.',
    'The one to put before training if you train in the afternoon.'),

  M('snk-kiwi-cottage', 'Kiwi & Cottage Cheese', 'snack', 2,
    ['vegetarian', 'no-cook', 'quick', 'gluten-free'],
    [['cottage_cheese', 160], ['kiwi', 2], ['pumpkin_seeds', 10]],
    'Two kiwis, a tub of cottage cheese, seeds on top.',
    'Kiwifruit is a decent vitamin C source and is genuinely good for digestion.'),

  // ============================ DESSERT ====================================
  M('des-choc-mousse', 'Chocolate Protein Mousse', 'dessert', 5,
    ['vegetarian', 'no-cook', 'quick', 'gluten-free'],
    [['greek_yoghurt', 150], ['whey_protein', 0.75], ['cacao_powder', 8], ['sweetener', 6], ['vanilla', 3]],
    'Whip everything together hard with a fork for a full minute. It genuinely aerates and turns mousse-like.',
    'The nightly dessert that keeps the plan survivable. Around 25g of protein.'),

  M('des-nice-cream', 'Berry Protein Nice Cream', 'dessert', 5,
    ['vegetarian', 'no-cook', 'gluten-free'],
    [['frozen_berries', 150], ['greek_yoghurt', 100], ['whey_protein', 0.75], ['almond_milk', 40]],
    'Blitz frozen berries with the rest in a food processor. Eat straight away - it sets rock hard in the freezer.',
    'Tastes like sorbet. High volume, low calorie, actually satisfying.'),

  M('des-choc-chia', 'Chocolate Chia Pudding', 'dessert', 5,
    ['vegetarian', 'make-ahead', 'high-fibre', 'gluten-free'],
    [['chia_seeds', 22], ['almond_milk', 160], ['cacao_powder', 8], ['whey_protein', 0.5], ['sweetener', 6], ['raspberries', 60]],
    'Whisk, wait five minutes, whisk again, refrigerate.',
    'Around 12g of fibre in a dessert. That is the whole argument for it.'),

  M('des-hot-chocolate', 'Protein Hot Chocolate', 'dessert', 4,
    ['vegetarian', 'warm', 'quick', 'gluten-free'],
    [['milk_skim', 250], ['cacao_powder', 10], ['whey_protein', 0.75], ['sweetener', 6], ['cinnamon', 1]],
    'Heat the milk and cocoa, take it OFF the heat, then whisk the protein in. Boiling protein powder makes it grainy.',
    'The evening ritual one. Warm drinks end the eating day better than cold ones for most people.'),

  M('des-baked-apple', 'Baked Cinnamon Apple with Yoghurt', 'dessert', 20,
    ['vegetarian', 'warm', 'high-fibre', 'gluten-free'],
    [['apple', 1], ['greek_yoghurt', 120], ['cinnamon', 3], ['walnuts', 12], ['sweetener', 5]],
    'Core the apple, fill with cinnamon and sweetener, bake 18 minutes at 180C. Yoghurt and walnuts on top.',
    'Eats like a crumble. Around 4g of fibre from the apple alone.'),

  M('des-jelly-yoghurt', 'Jelly & Yoghurt Cup', 'dessert', 5,
    ['vegetarian', 'make-ahead', 'low-calorie', 'gluten-free'],
    [['sugar_free_jelly', 200], ['greek_yoghurt', 120], ['strawberries', 60]],
    'Set the jelly the night before, spoon yoghurt over the top.',
    'The lowest-calorie dessert here by a wide margin. Useful when the day has run long.'),

  M('des-pb-fudge', 'Peanut Protein Fudge', 'dessert', 10,
    ['vegetarian', 'make-ahead', 'freezer'],
    [['peanut_butter', 30], ['whey_protein', 1], ['greek_yoghurt', 60], ['cacao_powder', 6], ['sweetener', 8]],
    'Mix to a stiff paste, press into a lined container, freeze for an hour, cut into squares.',
    'Makes about six squares. Portion it when you make it, not when you are standing at the freezer at 9pm.'),

  M('des-choc-raspberries', 'Dark Chocolate & Raspberries', 'dessert', 2,
    ['vegetarian', 'no-cook', 'quick', 'simple'],
    [['dark_chocolate', 20], ['raspberries', 120], ['greek_yoghurt', 100]],
    'Three ingredients. No method.',
    'Sometimes the answer is just chocolate, weighed. 20g of 85% is a real portion.'),

  M('des-cheesecake-pot', 'Protein Cheesecake Pot', 'dessert', 8,
    ['vegetarian', 'make-ahead', 'gluten-free'],
    [['ricotta', 100], ['greek_yoghurt', 80], ['whey_protein', 0.75], ['blueberries', 70], ['sweetener', 6], ['vanilla', 3], ['almonds', 10]],
    'Blend ricotta, yoghurt, protein, vanilla and sweetener until completely smooth. Crushed almonds as the base, berries on top.',
    'Blending rather than stirring is what makes it taste like cheesecake instead of flavoured yoghurt.'),

  M('des-yoghurt-bark', 'Frozen Yoghurt Berry Bark', 'dessert', 10,
    ['vegetarian', 'make-ahead', 'freezer', 'gluten-free'],
    [['greek_yoghurt', 160], ['whey_protein', 0.5], ['frozen_berries', 80], ['dark_chocolate', 10], ['pumpkin_seeds', 8]],
    'Spread the yoghurt-protein mix thin on baking paper, scatter berries, chocolate and seeds, freeze 3 hours, snap into shards.',
    'Make a tray on Sunday. Having a planned dessert in the freezer is what stops the unplanned one.'),
  // ===================== LACTOSE-FREE / GLUTEN-FREE SET =====================
  // Built for a lactose- and gluten-intolerant, high-protein brief, leaning on
  // curries, rice dishes, gluten-free pasta, refreshing salads, baked oats and
  // smoothies. Protein comes mainly from chicken, lamb, beef and pork.

  M('brk-baked-oats', 'Protein Baked Oats', 'breakfast', 25,
    ['vegetarian', 'lactose-free', 'gluten-free', 'make-ahead', 'sweet', 'anti-inflammatory', 'low-gi'],
    [['oats', 55], ['protein_isolate', 1], ['egg_whites', 100], ['banana', 0.5], ['lf_greek_yoghurt', 80], ['blueberries', 70], ['cinnamon', 3], ['baking_powder', 3]],
    'Blitz oats, protein, whites, banana and baking powder to a batter, pour into a ramekin, bake 20 minutes at 180C. It should still be slightly soft in the middle. Yoghurt and berries on top.',
    'Bake four on Sunday and they reheat all week. Use gluten-free labelled oats - oats are naturally gluten free but routinely cross-contaminated.'),

  M('brk-choc-baked-oats', 'Chocolate Baked Oats', 'breakfast', 25,
    ['vegetarian', 'lactose-free', 'gluten-free', 'make-ahead', 'sweet'],
    [['oats', 55], ['protein_isolate', 1], ['egg_whites', 100], ['cacao_powder', 10], ['banana', 0.5], ['dark_chocolate', 10], ['sweetener', 6], ['baking_powder', 3]],
    'Same method as the plain version, with cacao through the batter and the chocolate chopped and pushed in at the end so it melts into pockets.',
    'Tastes like a warm brownie and lands at around 40g of protein.'),

  M('brk-turkey-egg-muffins', 'Turkey Mince Egg Muffins', 'breakfast', 30,
    ['lactose-free', 'gluten-free', 'make-ahead', 'savoury', 'high-protein', 'meal-prep'],
    [['turkey_mince', 160], ['egg', 3], ['egg_whites', 80], ['capsicum', 80], ['spinach', 60], ['red_onion', 40], ['olive_oil', 6], ['spice_mix', 4], ['garlic', 8]],
    'Brown the turkey with the onion and spices first and let it cool slightly, or the egg starts cooking as you mix. Divide between a muffin tin, pour over the beaten egg and whites, bake 18 minutes at 180C.',
    'Makes six muffins. They keep four days in the fridge and reheat in a minute, which is the entire point of them.'),

  M('brk-berry-smoothie', 'Berry Protein Smoothie', 'breakfast', 4,
    ['vegetarian', 'lactose-free', 'gluten-free', 'quick', 'no-cook', 'on-the-go', 'anti-inflammatory'],
    [['protein_isolate', 1.5], ['frozen_berries', 150], ['almond_milk', 250], ['flaxseed', 12], ['lf_greek_yoghurt', 80], ['cinnamon', 2]],
    'Everything in, blend until there are no seeds of berry left whole. Thicker with less milk, drinkable with more.',
    'Flaxseed is doing the fibre work. Without it this is a drink you are hungry an hour after.'),

  M('brk-turmeric-smoothie', 'Turmeric & Ginger Green Smoothie', 'breakfast', 4,
    ['vegetarian', 'lactose-free', 'gluten-free', 'quick', 'no-cook', 'anti-inflammatory'],
    [['protein_isolate', 1.5], ['spinach', 60], ['banana', 0.5], ['almond_milk', 250], ['turmeric', 3], ['ginger', 8], ['chia_seeds', 12], ['lemon', 0.25]],
    'Blend the spinach with the milk first until no flecks remain, then everything else. A grind of black pepper is traditional with turmeric.',
    'Ginger and turmeric are here because you asked for them and they taste good together. Read docs/NUTRITION.md before expecting more than that from them.'),

  M('brk-choc-smoothie', 'Cacao Banana Protein Smoothie', 'breakfast', 3,
    ['vegetarian', 'lactose-free', 'gluten-free', 'quick', 'no-cook', 'on-the-go'],
    [['protein_isolate', 1.5], ['banana', 1], ['cacao_powder', 10], ['almond_milk', 280], ['peanut_powder', 15], ['cinnamon', 2]],
    'Blend. Frozen banana makes it thick enough to eat with a spoon.',
    'The one for mornings you are already late.'),

  // ---- Lunches --------------------------------------------------------------
  M('lun-chicken-pomegranate-salad', 'Chicken, Pomegranate & Herb Salad', 'lunch', 18,
    ['lactose-free', 'gluten-free', 'refreshing', 'anti-inflammatory', 'high-protein', 'no-cook-option'],
    [['chicken_breast', 170], ['salad_leaves', 80], ['rocket', 40], ['pomegranate', 60], ['cucumber', 80], ['herbs_fresh', 15], ['mint', 8], ['pumpkin_seeds', 14], ['olive_oil', 9], ['lemon', 0.75]],
    'Grill the chicken with lemon and oregano, rest it, slice across the grain. Dress the leaves separately and build at the last minute so nothing wilts.',
    'The one to make when you want lunch to feel light rather than like a meal-prep container.'),

  M('lun-lamb-beetroot-salad', 'Lamb, Beetroot & Mint Salad', 'lunch', 20,
    ['lactose-free', 'gluten-free', 'refreshing', 'iron', 'anti-inflammatory'],
    [['lamb_leg', 150], ['beetroot', 120], ['rocket', 60], ['red_cabbage', 60], ['walnuts', 15], ['mint', 10], ['olive_oil', 9], ['balsamic', 12], ['lemon', 0.5]],
    'Sear the lamb hard, 3 minutes a side for medium, and rest it properly - lamb goes tough if you cut it straight off the heat. Roast beetroot works better than boiled here.',
    'Lamb and mint for the obvious reason. Beetroot and red cabbage make it worth looking at.'),

  M('lun-thai-beef-salad', 'Thai Beef Salad', 'lunch', 18,
    ['lactose-free', 'gluten-free', 'refreshing', 'iron', 'high-protein'],
    [['beef_rump', 160], ['salad_leaves', 90], ['cucumber', 90], ['carrot', 60], ['red_onion', 35], ['herbs_fresh', 18], ['mint', 10], ['lime', 1], ['sriracha', 12], ['pumpkin_seeds', 12], ['olive_oil', 6]],
    'Dressing is lime, chilli, a little sweetener and fish sauce if you use it. Slice the beef thin and toss it through while still warm so it takes up the dressing.',
    'Refreshing and still 40g of protein. One of the better hot-day lunches.'),

  M('lun-turmeric-chicken-rice', 'Turmeric Chicken Rice Bowl', 'lunch', 22,
    ['lactose-free', 'gluten-free', 'meal-prep', 'anti-inflammatory', 'high-protein'],
    [['chicken_breast', 170], ['basmati_rice', 140], ['turmeric', 4], ['broccoli', 120], ['carrot', 70], ['spinach', 50], ['olive_oil', 9], ['garlic', 10], ['ginger', 8], ['lemon', 0.5]],
    'Cook the rice with turmeric and a little stock so it takes the colour through. Chicken separately, sliced over the top.',
    'Batches well and the rice is better on day two.'),

  M('lun-pork-slaw-bowl', 'Pork & Slaw Rice Bowl', 'lunch', 20,
    ['lactose-free', 'gluten-free', 'meal-prep', 'quick'],
    [['pork_loin', 170], ['brown_rice', 130], ['cabbage_slaw', 110], ['carrot', 60], ['red_cabbage', 50], ['sriracha', 12], ['olive_oil', 8], ['lime', 0.5], ['ginger', 8], ['pumpkin_seeds', 10]],
    'Pork loin is lean enough to overcook in seconds - hot pan, 3 minutes a side, then rest. Dress the slaw with lime and a little sriracha.',
    'Pork loin is one of the leanest high-protein meats in the shop and gets forgotten.'),

  M('lun-chicken-gf-pasta-salad', 'Chicken & Herb Gluten-Free Pasta Salad', 'lunch', 18,
    ['lactose-free', 'gluten-free', 'meal-prep', 'refreshing'],
    [['chicken_breast', 160], ['gf_pasta', 140], ['cherry_tomatoes', 120], ['rocket', 50], ['red_onion', 35], ['herbs_fresh', 15], ['olive_oil', 10], ['lemon', 0.75], ['pumpkin_seeds', 12]],
    'Rinse gluten-free pasta under cold water as soon as it is drained, or it sets into a block. Dress it while still slightly warm.',
    'Gluten-free pasta is far better cold in a salad than hot with a sauce.'),

  // ---- Dinners --------------------------------------------------------------
  M('din-lamb-curry', 'Lamb & Spinach Curry', 'dinner', 45,
    ['lactose-free', 'gluten-free', 'batch-cook', 'curry', 'iron', 'anti-inflammatory', 'family'],
    [['lamb_leg', 175], ['tomato_passata', 200], ['spinach', 100], ['coconut_milk_light', 80], ['basmati_rice', 120], ['red_onion', 70], ['spice_mix', 8], ['turmeric', 3], ['garlic', 12], ['ginger', 12], ['olive_oil', 8]],
    'Brown the lamb in batches and take it out before you soften the onion, or it stews instead of colouring. Back in with the spices, then a long slow simmer - 40 minutes minimum.',
    'Better on the second day, which suits a repeating menu perfectly. Check your curry powder is gluten free; blends are a common hidden source.'),

  M('din-chicken-tikka-curry', 'Chicken Tikka-Style Curry', 'dinner', 40,
    ['lactose-free', 'gluten-free', 'batch-cook', 'curry', 'high-protein', 'family'],
    [['chicken_thigh', 180], ['lf_greek_yoghurt', 100], ['tomato_passata', 200], ['coconut_milk_light', 70], ['basmati_rice', 120], ['red_onion', 70], ['spice_mix', 8], ['turmeric', 3], ['garlic', 12], ['ginger', 10], ['herbs_fresh', 12]],
    'Marinate the chicken in lactose-free yoghurt, turmeric, garlic and ginger for at least an hour - it tenderises and it is where the flavour actually comes from. Grill or fry it hard before it goes into the sauce.',
    'Lactose-free yoghurt behaves exactly like normal yoghurt in a marinade. Thigh over breast because it does not dry out on reheating.'),

  M('din-beef-massaman', 'Beef Massaman-Style Curry', 'dinner', 50,
    ['lactose-free', 'gluten-free', 'batch-cook', 'curry', 'iron', 'family'],
    [['beef_rump', 175], ['coconut_milk_light', 140], ['sweet_potato', 150], ['basmati_rice', 110], ['green_beans', 90], ['red_onion', 60], ['spice_mix', 8], ['peanut_powder', 15], ['ginger', 10], ['garlic', 10], ['lime', 0.5]],
    'Low and slow. The sweet potato goes in for the last 20 minutes only, or it disintegrates into the sauce.',
    'Peanut powder gives the body a massaman wants without the calories of the paste and peanuts it normally takes.'),

  M('din-pork-ginger-stirfry', 'Pork & Ginger Stir-Fry with Rice', 'dinner', 20,
    ['lactose-free', 'gluten-free', 'quick', 'high-protein'],
    [['pork_loin', 180], ['brown_rice', 130], ['broccoli', 120], ['capsicum', 90], ['carrot', 60], ['soy_sauce', 15], ['ginger', 14], ['garlic', 12], ['olive_oil', 9], ['sriracha', 10]],
    'Use tamari rather than ordinary soy sauce - most soy sauce is brewed with wheat. Pan hot enough to sear; pork in and out fast.',
    'Twenty minutes start to finish, and around 45g of protein.'),

  M('din-chicken-gf-pasta', 'Chicken, Tomato & Basil Gluten-Free Pasta', 'dinner', 25,
    ['lactose-free', 'gluten-free', 'quick', 'pasta', 'family'],
    [['chicken_breast', 180], ['gf_pasta', 150], ['tomato_passata', 200], ['cherry_tomatoes', 100], ['spinach', 70], ['olive_oil', 10], ['garlic', 14], ['herbs_fresh', 15], ['red_onion', 50]],
    'Gluten-free pasta goes from firm to mush in about a minute, so pull it early and finish it in the sauce. Keep a cup of the cooking water to loosen things.',
    'Nutritional yeast on top gets you most of the way to parmesan without the dairy, if you miss it.'),

  M('din-beef-ragu-gf', 'Slow Beef Ragu with Gluten-Free Pasta', 'dinner', 50,
    ['lactose-free', 'gluten-free', 'batch-cook', 'pasta', 'iron', 'family'],
    [['beef_mince_lean', 175], ['gf_pasta', 140], ['tomato_passata', 220], ['mushrooms', 100], ['carrot', 80], ['red_onion', 60], ['olive_oil', 9], ['garlic', 14], ['herbs_fresh', 12]],
    'Grate the carrot and mushroom into the sauce so they disappear. Forty-five minutes minimum - ragu is a time recipe, not an ingredient recipe.',
    'Freezes in portions. Sauce in the freezer beats willpower on a bad night.'),

  M('din-lamb-kofta-rice', 'Lamb Kofta with Turmeric Rice', 'dinner', 30,
    ['lactose-free', 'gluten-free', 'iron', 'anti-inflammatory', 'family'],
    [['lamb_mince', 170], ['basmati_rice', 130], ['turmeric', 4], ['salad_leaves', 60], ['cucumber', 90], ['cherry_tomatoes', 90], ['lf_greek_yoghurt', 100], ['mint', 10], ['spice_mix', 6], ['garlic', 10], ['olive_oil', 7]],
    'Mix the mince with cumin, coriander, garlic and mint and rest it ten minutes before shaping or the koftas crack. Lactose-free yoghurt with mint and lemon as the sauce.',
    'Squeeze the cucumber dry if you grate it into the yoghurt, unless you want soup.'),

  M('din-pork-beetroot-greens', 'Pork Loin with Roast Beetroot & Greens', 'dinner', 35,
    ['lactose-free', 'gluten-free', 'anti-inflammatory', 'one-pan'],
    [['pork_loin', 190], ['beetroot', 150], ['sweet_potato', 150], ['kale', 80], ['green_beans', 90], ['olive_oil', 10], ['balsamic', 12], ['garlic', 12], ['walnuts', 12]],
    'Beetroot takes far longer than you think - 35 minutes at 200C, with the pork added for the last 12. Kale wilted in the pan juices at the end.',
    'Pork and beetroot is an underrated pairing, and the whole plate is on the anti-inflammatory list.'),

  M('din-chicken-coconut-curry', 'Chicken & Green Bean Coconut Curry', 'dinner', 30,
    ['lactose-free', 'gluten-free', 'curry', 'quick', 'family'],
    [['chicken_breast', 185], ['coconut_milk_light', 140], ['green_beans', 110], ['capsicum', 90], ['basmati_rice', 120], ['spice_mix', 7], ['turmeric', 3], ['ginger', 12], ['garlic', 12], ['lime', 0.5], ['herbs_fresh', 12]],
    'Bloom the spices in oil for thirty seconds before anything else. Chicken in for six minutes, no more, or breast goes stringy in a wet sauce.',
    'The fast curry for a weeknight, as opposed to the lamb one that wants forty minutes.'),

  // ---- Snacks ---------------------------------------------------------------
  M('snk-protein-shake', 'Protein Shake', 'snack', 2,
    ['vegetarian', 'lactose-free', 'gluten-free', 'quick', 'no-cook', 'on-the-go', 'high-protein'],
    [['protein_isolate', 1.5], ['almond_milk', 300]],
    'Shake. That is it.',
    'Around 38g of protein for under 200 kcal. Isolate or plant protein rather than concentrate - concentrate still carries some lactose.'),

  M('snk-shake-berries', 'Protein Shake with Berries', 'snack', 3,
    ['vegetarian', 'lactose-free', 'gluten-free', 'quick', 'no-cook', 'anti-inflammatory'],
    [['protein_isolate', 1.5], ['almond_milk', 250], ['frozen_berries', 100], ['chia_seeds', 10]],
    'Blend rather than shake, so the chia disperses instead of clumping.',
    'The shake with something to chew on, for when a plain one does not hold you.'),

  M('snk-dark-choc-almonds', 'Dark Chocolate & Almonds', 'snack', 1,
    ['vegan', 'lactose-free', 'gluten-free', 'no-cook', 'quick', 'on-the-go'],
    [['dark_chocolate', 20], ['almonds', 20]],
    'Weigh both out. Eating either from the packet is how 20g becomes 80g.',
    'Check the label - 85% dark chocolate is usually lactose free, but milk solids turn up in some brands.'),

  M('snk-lf-yoghurt-berries', 'Lactose-Free Yoghurt & Berries', 'snack', 2,
    ['vegetarian', 'lactose-free', 'gluten-free', 'no-cook', 'quick', 'anti-inflammatory'],
    [['lf_greek_yoghurt', 180], ['raspberries', 80], ['pumpkin_seeds', 12]],
    'Stir, top, eat.',
    'Same macros as ordinary Greek yoghurt. Lactose-free products are normal dairy with the lactase already added.'),

  M('snk-edamame-chilli', 'Chilli Salted Edamame', 'snack', 5,
    ['vegan', 'lactose-free', 'gluten-free', 'savoury', 'high-fibre'],
    [['edamame', 180], ['spice_mix', 2], ['lime', 0.25]],
    'Steam from frozen for four minutes. Sea salt, chilli flakes, lime.',
    'Over 20g of protein from a vegetable, and genuinely filling.'),

  // ---- Desserts -------------------------------------------------------------
  M('des-lf-choc-mousse', 'Dark Chocolate Protein Mousse', 'dessert', 5,
    ['vegetarian', 'lactose-free', 'gluten-free', 'no-cook', 'quick'],
    [['lf_greek_yoghurt', 150], ['protein_isolate', 0.75], ['cacao_powder', 8], ['dark_chocolate', 8], ['sweetener', 6], ['vanilla', 3]],
    'Whip hard with a fork for a full minute - it genuinely aerates. Grate the chocolate over the top rather than melting it in.',
    'Around 27g of protein in a dessert. The nightly one that keeps the plan survivable.'),

  M('des-dark-choc-raspberries-lf', 'Dark Chocolate & Raspberries', 'dessert', 2,
    ['vegetarian', 'lactose-free', 'gluten-free', 'no-cook', 'quick', 'anti-inflammatory'],
    [['dark_chocolate', 20], ['raspberries', 120], ['lf_greek_yoghurt', 100]],
    'Three ingredients, no method.',
    'Sometimes the answer is just chocolate, weighed.'),

  M('des-choc-chia-lf', 'Chocolate Chia Pudding', 'dessert', 5,
    ['vegetarian', 'lactose-free', 'gluten-free', 'make-ahead', 'high-fibre'],
    [['chia_seeds', 22], ['almond_milk', 170], ['cacao_powder', 8], ['protein_isolate', 0.5], ['sweetener', 6], ['raspberries', 60]],
    'Whisk, wait five minutes, whisk again to break the clumps, refrigerate overnight.',
    'Around 12g of fibre in a dessert, which is the whole argument for it.'),

  M('des-choc-bark-lf', 'Frozen Dark Chocolate Yoghurt Bark', 'dessert', 10,
    ['vegetarian', 'lactose-free', 'gluten-free', 'make-ahead', 'freezer'],
    [['lf_greek_yoghurt', 170], ['protein_isolate', 0.5], ['dark_chocolate', 12], ['frozen_berries', 70], ['pumpkin_seeds', 8]],
    'Spread the yoghurt thin on baking paper, scatter everything over, freeze three hours, snap into shards.',
    'Make a tray on your prep day. A planned dessert in the freezer is what stops the unplanned one.'),

];

/**
 * Meals deliberately exempt from the library's protein-density floor.
 *
 * The floor exists so the library cannot drift into being a normal recipe
 * collection with a protein label on it. A small number of items are treats by
 * design, and pretending otherwise by bolting protein powder onto chocolate and
 * almonds would make them worse, not better. The day-level protein target still
 * has to be met either way, which is the constraint that actually matters.
 */
export const PROTEIN_FLOOR_EXEMPT = new Set(['snk-dark-choc-almonds']);

export const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner', 'dessert'];

export const SLOT_META = {
  breakfast: { label: 'Breakfast', icon: '🍳', defaultShare: 0.22 },
  lunch:     { label: 'Lunch',     icon: '🥗', defaultShare: 0.27 },
  snack:     { label: 'Snack',     icon: '🥜', defaultShare: 0.12 },
  dinner:    { label: 'Dinner',    icon: '🍽️', defaultShare: 0.30 },
  dessert:   { label: 'Dessert',   icon: '🍫', defaultShare: 0.09 },
};

export const MEALS_BY_ID = Object.fromEntries(MEALS.map((m) => [m.id, m]));

export function mealsForSlot(slot) {
  return MEALS.filter((m) => m.slot === slot);
}

/** Every tag in use, for the preferences UI. */
export function allTags() {
  return [...new Set(MEALS.flatMap((m) => m.tags))].sort();
}
