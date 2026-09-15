# Steph 2.0

A self-hosted nutrition and habit coaching app, built to do the things a good
PCOS coach does weekly: set phased calorie and macro targets, build a
high-protein meal plan that fits them, collect a daily weigh-in and habit
check-in, run a structured weekly reflection with measurements and cycle
context, and prompt a photo check-in every four weeks.

It runs entirely in the browser. **No server, no account, no network call
anywhere in the code.** Your weight, measurements, journal entries, cycle data
and progress photos never leave your device.

---

## Running it

It is plain HTML, CSS and ES modules — there is no build step and no runtime
dependency.

```bash
npm run serve      # http://localhost:8080
```

**On the web:** pushing runs the tests and, if they pass, publishes to GitHub
Pages at `https://<owner>.github.io/Steph-2.0/` — see
`.github/workflows/pages.yml`.

This needs **one manual step, once**: go to *Settings → Pages → Build and
deployment* and set **Source** to **GitHub Actions**, then re-run the workflow.
The workflow cannot do this itself — creating a Pages site requires admin rights
on the repository, which a workflow token deliberately does not have. If Pages
is not yet enabled, the deploy job fails with those instructions rather than a
cryptic API error.

Or open `index.html` through any static file server. It deploys to Netlify or
similar as-is, with nothing to configure.

```bash
npm test           # 205 tests, no dependencies
```

> Opening `index.html` directly as a `file://` URL will not work — browsers
> block ES module imports over that protocol. Use the server.

**First run:** go to **Setup**, enter your age, height, weight and activity
level, and press *Start programme*. Everything else follows from that.

---

## What it does

### Phased programme

Two weeks at maintenance, then 8–12 weeks in a deficit.

The maintenance block is not filler. It establishes what your maintenance
intake actually is by watching what your weight does, so the deficit that
follows is subtracted from something **measured** rather than something
predicted by an equation. If your weight drifts during those two weeks, you
correct the estimate before the deficit starts instead of chasing a moving
target for ten weeks.

The deficit defaults to 18% below maintenance and is capped at 25%.

**If you already know your numbers, yours win.** Setup takes an optional known
maintenance and a personal calorie floor. Your own history of eating a known
intake and watching the scale is a measurement; the equation is a population
guess, and the app says which one it is using.

Floors work like this: without a personal floor, the app will not program below
your estimated BMR. With one, your floor is used and going under predicted BMR
is **flagged rather than blocked** — the prediction can be out by a few hundred
calories either way, and you know your own history. 1200 kcal is a hard floor
that nothing overrides.

### Meal plans that hit your numbers

Five eating occasions a day — breakfast, lunch, two snacks, dinner and dessert —
generated to land on your calorie target while clearing your protein target.

Two structures, set on the Setup tab:

- **Same meals every day** (the default) — one menu, eaten Monday to Sunday.
  Shop once, cook once, stop deciding. It also makes your intake more accurate:
  the same menu weighed the same way every day has none of the drift that creeps
  in across seven different ones.
- **Different meals each day** — a new menu daily, if you would rather have the
  variety and do the extra cooking.

Because a repeating menu gets eaten seven times, that mode searches much harder
for a good one, favours meals that batch-cook and reheat well, and refuses to
build two slots of the same day on the same main protein source — tuna at lunch
and tuna again at snack is fourteen tins across the week, not two. It also shows
you what the week actually adds up to for anything appearing in more than one
meal a day.

- **101 meals built in**, every one of them protein-forward, fibre-forward, and
  biased toward slower-digesting carbohydrate sources. 43 of them are both
  lactose free and gluten free.
- **Portions scale in quarter-serving steps** to fit the day's budget. In
  testing, every day lands within about 1% of target.
- **Add your own meals** — either built from the ingredient table (so portions
  scale and it appears on the shopping list), or entered as straight macros for
  a takeaway or a family recipe you already know the numbers for.
- **Favourite** meals to see them more often; **exclude** ones you will not eat
  and they never appear again.
- **Swap** any meal and the rest of the day re-fits around it automatically.
- **Shopping list** aggregated across the week, grouped by supermarket aisle
  and rounded up to quantities you can actually buy.
- **Batch-cooking table** in repeating mode: how much of each meal the week
  needs, which ones to cook ahead, and which are better made fresh. Any recipe
  can be viewed at one-portion or whole-week quantities.
- Dessert is planned in every day on purpose. A plan that forbids dessert is a
  plan you abandon in week three.

### Dietary rules

Set on the Setup tab and checked against **every ingredient**, not against a
tag someone typed by hand. A meal labelled gluten free but containing bread
still fails, because the check looks at what is actually in it.

- **Lactose free** — excludes milk, yoghurt and soft cheese. Lactose-free dairy
  is fine: it is ordinary dairy with the lactase already added, and its macros
  match. There is an optional setting for aged hard cheeses (parmesan, mature
  cheddar), which retain very little lactose because it drains off with the whey
  and what remains is largely consumed during ageing — many lactose-intolerant
  people tolerate them, but tolerance varies, so it is your call, not the app's.
- **Gluten free**, **dairy free**, **vegetarian**, **vegan** — same treatment.
- **Excluded ingredients** — stronger than excluding a meal. Nothing containing
  it is ever planned, including your own custom meals.
- **Preferred proteins** — a nudge toward the proteins you actually like,
  without cutting the rest of the library out.

**Restrictions are never relaxed.** Soft preference tags get dropped if they
leave nothing to plan with, and the app tells you when that happens. Dietary
rules do not: if a slot cannot be filled safely, it is left empty and you are
told why. An empty dessert slot is a correct answer; a plate of gluten is not.

**Where safety depends on the brand, the app says so instead of pretending.**
Oats are naturally gluten free but routinely cross-contaminated. Curry powders,
stock and soy sauce commonly contain wheat. Dark chocolate commonly contains
milk solids. The plan lists exactly which items to read the label on, because
the app can verify its own data and cannot verify your cupboard.

### One free meal a week

Pick a day and a slot. That meal is left unplanned and **its calories are not
counted** — the app will not invent a number for a meal it cannot see.

What it will do is the arithmetic. The slot it replaces already had calories in
it, so the real cost is the difference: typically a few hundred calories, around
3–5% of your week. The plan page shows that sum, because people routinely
overestimate what one meal costs and then eat badly for two days out of guilt,
which costs far more.

### Daily check-in

A morning weigh-in plus the seven habits:

| | |
|---|---|
| 😴 | Slept 7–8 hours |
| 💬 | Affirmations |
| 🍽️ | Stuck to the meal plan — yes / mostly / no |
| 💧 | Drank 2L of water — with +0.25L / +0.5L tap buttons, since water is the one habit you log in pieces through the day |
| 👟 | Steps, 5–8k |
| 🏋️ | Trained today — a **weekly** target of 3–4 sessions, not a daily one |
| 📓 | Journaled |
| 🧘 | Neck exercises |

Streaks are tracked per habit. An **unlogged** day ends a streak without
breaking it — there is a real difference between "I did not do it" and "I did
not write it down", and conflating them makes the number meaningless.

Training is scored differently on purpose. It is counted **across the week**
against a 3–4 session target and excluded from the daily percentage entirely,
so a rest day reads as a rest day rather than a failed habit. A week you never
filled in reports as unknown, not as zero sessions.

### Weekly check-in

- Separate prompts for how the week went **mentally, emotionally and
  physically**, because asked as one question "how was your week?" reliably
  produces "fine".
- **Chest, waist and hips**, with the change since your last check-in.
- **Cycle**: log a period start, tag symptoms, see the estimated phase.
- **Requests for next week's plan**, which feed directly into the generator.
- An **automatic read of your week**: habit adherence per habit, weight trend
  against target, and a suggested calorie adjustment when the data supports one.

### Progress

- **Weight trend** with a 7-day rolling average. Daily weight swings 1–2 kg on
  water, salt and gut content alone; the rolling average is the only line worth
  reading, and the chart is built to make that obvious. A logging gap shows as
  a gap rather than being interpolated over.
- **Measurement sparklines** per site. These frequently move when the scale
  will not.
- **Habit heatmap** across the last eight weeks, with a distinct colour for
  "never logged" so it cannot be confused with a zero.
- **Programme timeline** showing where you are and which weeks are photo weeks.

### Photo check-ins

Every four weeks, front / side / back. Images are downscaled and stored in
IndexedDB on your device. Side-by-side comparison between any two check-ins,
because a single progress photo tells you nothing.

---

## Where your data lives

In your browser, on your device. Structured data in `localStorage`, photos in
IndexedDB.

That cuts both ways:

- Nobody can sell, leak or breach data that was never uploaded.
- **Clearing your browser data loses everything.** Private browsing loses it
  when you close the tab. Switching device does not bring it with you.

**So export regularly.** The Data tab produces a JSON backup of everything
except photos, and can merge or replace on restore. Once a month, after your
photo check-in, is a sensible rhythm.

---

## Honesty about the numbers

Every target the app produces is an estimate from a population equation, and
the app says so where it matters rather than presenting predictions as
measurements.

**[docs/NUTRITION.md](docs/NUTRITION.md)** sets out every assumption behind
every number, sorted by how much confidence it deserves — what is
well-established, what is reasonable practice, and what is a rule of thumb that
is useful for planning but not literally true.

The two things worth knowing up front:

- **Your calorie targets come from a prediction, not a measurement.** This is
  why the app tracks your actual weight trend and corrects from observed data
  at your weekly check-in. Observed beats predicted the moment you have two
  weeks of it.
- **The cycle phase estimate is calendar arithmetic, not physiology.** It
  assumes a regular cycle. In PCOS, irregular and anovulatory cycles are
  common, which makes it least reliable exactly where it is most likely to be
  used. The app labels its own confidence and never treats the estimate as
  fact.

**This is not medical advice.** It is a structured way to organise your own
plan. Anything here that conflicts with what your doctor or dietitian has told
you should lose.

---

## Project layout

```
index.html               app shell
assets/styles.css        design tokens, light and dark
src/
  app.js                 router, shared context
  lib/
    energy.js            BMR, TDEE, calorie and macro targets, trend corrections
    planner.js           weekly meal plan generation, swaps, rerolls
    nutrition.js         macro computation, shopping list aggregation
    checkins.js          habits, streaks, adherence, weight-trend maths
    cycle.js             cycle phase estimation, date helpers
    diet.js              dietary suitability, derived from ingredients
    program.js           maintenance/deficit phase timeline
    registry.js          built-in meals plus your own
    store.js             localStorage and IndexedDB persistence
    charts.js            inline SVG charts, no library
    ui.js                escaping, templating, modals
  data/
    ingredients.js       ~120 ingredients with reference macros and dietary classification
    meals.js             101 meals defined as ingredients and quantities
  views/                 one module per tab
tests/                   205 tests, run with node --test
docs/NUTRITION.md        the reasoning behind every number
```

### Notes for anyone reading the code

- **Meal macros are computed, never stored.** A meal is a list of ingredients
  and quantities; everything numeric derives from the ingredient table. This is
  what makes portion scaling arithmetically correct and guarantees the shopping
  list matches the plan.
- **Plan generation is seeded.** The same seed reproduces a plan exactly, so
  "give me a different menu" is just a new seed, and the generator is testable.
- **A repeating plan still stores seven days**, all identical, plus the menu
  itself. Keeping the shape uniform means the shopping list, day totals and the
  Today view need no special cases.
- **Pure logic modules touch no DOM**, so they run directly under `node --test`.
- **Chart colours come from a validated categorical palette** with separately
  chosen light and dark steps, rather than being picked by eye.

---

## Licence

MIT.
