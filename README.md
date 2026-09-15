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

Or open `index.html` through any static file server. It also deploys to GitHub
Pages, Netlify or similar as-is, with nothing to configure.

```bash
npm test           # 151 tests, no dependencies
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

The deficit defaults to 18% below maintenance and is capped at 25%. It will
never program you below your estimated BMR or below 1200 kcal, whatever you
ask for — it raises the target to the floor and tells you it did.

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

- **71 meals built in**, every one of them protein-forward, fibre-forward, and
  biased toward slower-digesting carbohydrate sources.
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

### Daily check-in

A morning weigh-in plus the seven habits:

| | |
|---|---|
| 😴 | Slept 7–8 hours |
| 💬 | Affirmations |
| 🍽️ | Stuck to the meal plan — yes / mostly / no |
| 💧 | Drank 2L of water — with +0.25L / +0.5L tap buttons, since water is the one habit you log in pieces through the day |
| 👟 | Steps, 5–8k |
| 📓 | Journaled |
| 🧘 | Neck exercises |

Streaks are tracked per habit. An **unlogged** day ends a streak without
breaking it — there is a real difference between "I did not do it" and "I did
not write it down", and conflating them makes the number meaningless.

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
    program.js           maintenance/deficit phase timeline
    registry.js          built-in meals plus your own
    store.js             localStorage and IndexedDB persistence
    charts.js            inline SVG charts, no library
    ui.js                escaping, templating, modals
  data/
    ingredients.js       ~100 ingredients with reference macros
    meals.js             71 meals defined as ingredients and quantities
  views/                 one module per tab
tests/                   151 tests, run with node --test
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
