# The reasoning behind the numbers

This document exists so you can disagree with the app.

Every target it produces comes from an assumption, and some of those assumptions
are better supported than others. They are separated below by how much
confidence they deserve, because presenting a well-established equation and a
rule of thumb in the same typeface is how people end up trusting the wrong one.

**None of this is medical advice.** It is a structured way to organise your own
plan. PCOS is a medical diagnosis with real metabolic and endocrine
consequences, and anything here that conflicts with what your doctor or
dietitian has told you should lose.

---

## Well-established

### Basal metabolic rate

The app uses the **Mifflin-St Jeor** equation:

```
female:  10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
male:    10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
```

Source: Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO,
"A new predictive equation for resting energy expenditure in healthy
individuals", *American Journal of Clinical Nutrition* 1990;51(2):241–247.

It is the equation most commonly recommended for predicting resting energy
expenditure in adults without indirect calorimetry. It is still a **prediction
from population averages**. Individual resting metabolic rate varies around any
such prediction, and the equation says nothing about your particular body.

This is the single most important caveat in the app, and it is why the
maintenance block exists at all: two weeks of eating at the predicted
maintenance and watching what your weight actually does tells you more than the
equation ever will. From that point on, **observed trend beats predicted
number**, and the weekly check-in is built to act on that.

### Activity multipliers

The standard multipliers (1.2 sedentary through 1.9 extremely active) are a
long-standing convention for turning resting expenditure into total daily
expenditure. They are coarse by nature — a single number standing in for
training, occupation and fidgeting. Most people choose one level too high.

### Protein and body composition

A protein intake in the region of **1.6–2.2 g/kg of bodyweight per day** is the
range most commonly supported for preserving lean mass during an energy deficit
and for supporting resistance training adaptation. Protein is also the most
satiating macronutrient per calorie, which matters more than the physiology when
you are hungry at 4pm.

The app defaults to 2.0 g/kg and lets you set anything from 1.2 to 3.0.

### Energy deficit and weight loss

An energy deficit is required for fat loss. The app plans a **15–20% deficit by
default** and caps requests at 25%.

That cap is not timidity. Larger deficits reliably cost more lean mass, degrade
training quality and sleep, and are harder to sustain for the ten or twelve
weeks that actually produce a result. In the specific context of PCOS, rapid
and aggressive restriction is also among the things most likely to disrupt
cycles further.

---

## Reasonable, commonly practised, less precisely quantified

### Higher protein and lower-glycaemic carbohydrate in PCOS

Insulin resistance is common in PCOS, though not universal, and it is a routine
target of dietary management. Approaches that emphasise protein, fibre and
slower-digesting carbohydrate sources over refined ones are conventional
practice in that setting.

What the evidence supports more strongly is the general direction — **improving
insulin sensitivity is a sensible goal, and weight loss where relevant, adequate
protein, fibre and consistent movement all point that way**. What it supports
less strongly is any specific macronutrient ratio being uniquely correct. The
app's high-protein, fibre-forward bias reflects the conventional approach, not
a proven optimum.

If a specific dietary approach has been recommended to you by a clinician who
knows your bloods, follow theirs.

### Dietary fat and hormone health

The app floors fat at **0.8 g/kg** and warns if a setting would push it lower.
Very low fat intakes are a poor idea generally, and particularly when hormone
health is the stated concern. The specific floor is a practical convention
rather than a precisely derived threshold.

### Water

The daily target is **2 litres**.

This is a **practical, round target**, not a derived requirement. Fluid needs
vary substantially with body size, climate, activity and how much water you get
from food, and general guidance is usually expressed as a range of total fluid
from all sources rather than a single number of glasses of plain water.

Two reasons it earns a place on the habit list anyway. Thirst is misread as
hunger often enough to matter when you are in a deficit and already hungry. And
a high-fibre plan — which this one is — is noticeably more comfortable
well-hydrated than not.

If you are training hard, in heat, or simply larger, 2 litres is a floor rather
than a goal. Pale urine is a more useful signal than any number an app gives you.

### Eating the same menu every day

The default plan mode repeats one menu across the week. This is a legitimate
strategy rather than a compromise: it removes a few hundred food decisions a
week, makes the shopping trivial, and makes your actual intake considerably more
accurate than seven different days ever will be.

Two genuine considerations, and the app handles both:

**Micronutrient variety.** A single day's menu, however well built, draws on a
narrower set of foods than seven varied ones. The practical answer is to get
your variety *across weeks* rather than within them — change the menu each week
rather than running the same one for three months. The generator gives you a
different menu on every reroll for exactly this reason.

**Cumulative intake of any one food.** A 95g tin of tuna is unremarkable on one
plate; seven of them is a different question, and it is a question only a
repeating menu raises. The planner refuses to build two slots of the same day on
the same main protein source, and the plan view shows you the weekly total for
anything appearing more than once a day.

Where a food has published intake guidance that depends on frequency — fish and
mercury being the common example — the app flags that the menu contains it daily
and points you at your own food safety authority's current advice. It
deliberately does not quote a number, because the right number depends on the
species and on whether you are pregnant or planning to be, and that is not
something to take from an app.

### Lactose and gluten

The app classifies every ingredient rather than trusting a recipe's label.

**Lactose** is graded none / low / moderate / high. The ordering is well
established: milk is highest; fermentation in yoghurt breaks down part of it;
and aged hard cheeses such as parmesan and mature cheddar retain very little,
because lactose drains off with the whey and most of what remains is consumed
during ageing. Lactose-free products are ordinary dairy with the lactase enzyme
added, so their macros match their normal counterparts and they are classified
as containing none.

Two honest caveats. **Lactose intolerance is not a dairy allergy** — it is a
digestive issue with a dose threshold, and that threshold varies a lot between
people. Many people who react to a glass of milk are fine with parmesan. That is
why the hard-cheese setting is an explicit choice rather than an assumption.
**Lactose free is not dairy free**, and the app keeps those as separate rules,
because someone avoiding dairy for other reasons needs the stricter one.

**Gluten** is graded none / trace / contains. "Trace" covers foods that are
naturally gluten free but routinely cross-contaminated in processing — oats are
the main one — and items where it depends entirely on the brand, such as spice
blends, stock and soy sauce. These are allowed but flagged, with instructions to
buy the labelled gluten-free version or to use tamari rather than soy sauce.

**The limit of what the app can know.** It can verify its own ingredient data.
It cannot verify what is in your cupboard. Dark chocolate commonly contains milk
solids; curry powder commonly contains wheat flour as a bulking agent. The plan
lists those items for you to check rather than quietly assuming. If you are
coeliac rather than sensitive, treat every "trace" item as something to verify,
not something the app has cleared.

### "Anti-inflammatory" eating

Worth being careful here, because this phrase carries more confidence in
marketing than the evidence supports.

What is reasonably supported is that a **whole dietary pattern** — largely
unprocessed, plenty of vegetables and fruit, olive oil, oily fish, nuts and
legumes, not much refined sugar — is associated with better markers of
inflammation than a pattern high in ultra-processed food and refined
carbohydrate. That is the level at which the claim holds up.

What is much weaker is the idea that any **individual food** does something
measurable to your inflammation. Turmeric is the usual example: it is genuinely
interesting, and it is also poorly absorbed, studied mostly at concentrated
supplement doses far above what you get from cooking with it, and far from
settled clinically. The app tags it because it tastes good in the dishes you
asked for, not because a teaspoon in a curry is doing documented pharmacology.

The app's `anti-inflammatory` tag steers plans toward that overall pattern. It
is not a claim about any one ingredient, and you should not treat it as one.

For most people, the largest levers on chronic inflammation are body
composition, sleep, activity and not smoking — not which spice went in the pan.
In PCOS specifically, where insulin resistance is common, improving insulin
sensitivity is generally the more useful target, and it points at much the same
way of eating anyway.

### One free meal a week

Planned into the schedule by design, and not counted, because the app cannot
know what you ate and a made-up number is worse than an honest blank.

The arithmetic is worth seeing rather than fearing. The slot it replaces already
had calories in it, so the actual cost is the difference — commonly a few
hundred calories, or roughly 3–5% of a week's intake, which on the usual
planning figure is a few tens of grams of bodyweight.

That is the entire case for planning it in. One meal a week does not undo a
deficit. What does damage is the two or three days of guilt-driven eating that
often follow an *unplanned* one, which is a far larger number and the reason the
slot exists at all.

### Training, and why it is a weekly target

Resistance training is the single largest factor in whether the weight lost in a
deficit comes off fat or off lean tissue. It belongs on the habit list for that
reason rather than for calorie burn, which is a smaller effect than most people
assume.

It is counted **across the week** against a 3–4 session target and excluded from
the daily score entirely. Scoring it daily would mark every rest day a failed
habit, which is both factually wrong — recovery is part of training, not a lapse
— and the kind of discouraging noise that makes people stop logging.

### Fibre

The target is roughly **14 g per 1000 kcal**, clamped to 25–38 g/day. This
matches general population guidance. Fibre is relevant here for satiety, gut
health and blunting the glycaemic response of a meal.

The generated plans often come in **above** the target, sometimes around 40 g.
That is a good thing in principle, but if it is a large jump from your current
intake you should expect bloating and wind for a week or two. Ramp up, and drink
more water. The app flags this when a week's plan is unusually high.

### The protein basis weight

Above a BMI of about 27, the app calculates protein from the weight that would
put you at BMI 25 rather than your actual bodyweight.

The reasoning is sound — fat mass has little protein requirement, so scaling
g/kg guidance off total bodyweight at a high BMI overshoots. The specific
threshold is **a practical convention, not a validated equation**. Other
approaches use lean body mass or goal weight. All land in a similar place, and
the resulting target stays comfortably inside the 1.6–2.2 g/kg band.

---

## Rules of thumb — useful for planning, not literally true

### 7700 kcal per kilogram

Used to translate a calorie deficit into a projected rate of weight change, and
to suggest calorie corrections at the weekly check-in.

This is a **planning approximation**, not a law. It breaks down in both
directions: early weight loss includes a large water and glycogen component that
has nothing to do with the figure, and sustained deficits produce adaptive
changes in expenditure that the simple arithmetic ignores.

This is exactly why the app caps any single suggested adjustment at 10% of
current intake and requires at least two weeks of data before suggesting one at
all.

### Cycle phase estimation

**This is calendar arithmetic, not physiology.** It assumes a regular cycle with
ovulation roughly 14 days before the next bleed.

In PCOS, irregular and anovulatory cycles are common — which makes this
calculation least reliable exactly where it is most likely to be used. The app
labels its confidence, lowers it when you flag irregular cycles or miss an
expected period, and never treats the estimate as a fact.

Treat the phase reading as a prompt to notice patterns in how you actually feel,
and let the pattern you observe override the calendar every time.

### Cycle-phase effects on appetite and weight

Reports of increased appetite, cravings, water retention and lower mood during
the luteal phase are common, and the water retention in particular can mask real
fat loss on the scale for a week or more.

The size of these effects **varies enormously between people**, and the app
makes no attempt to quantify them or to adjust your calories for them. It only
tells you to read the trend over a longer window and to compare like phase with
like phase.

---

## Food data

Ingredient macros in `src/data/ingredients.js` are approximate reference values
for generic supermarket products, of the kind published in food composition
tables.

- **Brands vary**, sometimes by 15–20%, particularly on fat. If you weigh a
  specific product, that product's label beats this table.
- **Carbohydrate figures are total carbohydrate including fibre**, the
  convention used in Australia, the UK and the EU. US labels list available
  carbohydrate separately, so numbers will not line up with a US label exactly.
- Meal macros are always **computed from ingredients**, never hand-typed, so a
  scaled portion is arithmetically correct and the shopping list always matches
  what the plan asks you to eat.
- `npm test` includes a consistency check that flags any ingredient whose stated
  energy disagrees with its stated macros. It is a typo detector, not a
  nutrition audit — a few foods where Atwater arithmetic structurally does not
  apply (cocoa, vanilla extract, baking powder) are exempted by name with the
  reason documented alongside the data.

---

## What this app deliberately will not do

- **Set a goal weight or a deadline.** Neither improves outcomes, and both make
  it easier to justify a deficit that is too aggressive.
- **Relax a dietary restriction to fill a gap.** If a slot cannot be filled
  within your rules it is left empty and you are told why. An empty dessert slot
  is a correct answer; a plate of gluten is not.
- **Guess the calories in your free meal**, or in any meal it cannot see.
- **Go below 1200 kcal, or below your estimated BMR**, whatever deficit you ask
  for. It raises the target to the floor and tells you it did.
- **Call anything a cheat meal, or a food good or bad.** Dessert is planned into
  every day on purpose.
- **Diagnose anything**, interpret blood work, or comment on medication.
- **Send your data anywhere.** There is no server and no network call in the
  codebase.

## When to talk to a doctor rather than an app

- Periods that stop, or become much less frequent than usual
- Weight changing rapidly in either direction without a change in intake
- Persistent fatigue, hair loss, or a mood change that is not shifting
- Any new symptom you would not have predicted from what you are doing
- Before starting this, or any deficit, if you are pregnant, breastfeeding,
  have a history of disordered eating, or are managing another medical condition
