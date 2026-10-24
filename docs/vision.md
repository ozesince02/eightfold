# Vision

Where Eightfold could go. These are ideas, not promises: add freely, date them, and move one into
[decisions.md](decisions.md) and the [CHANGELOG](../CHANGELOG.md) when it gets built.

## North star

A habit tracker for people who have started over many times. It should make showing up feel like
making something (folds, cranes, a year of paper) rather than filling a spreadsheet, and treat a
missed day as a fall to get up from, never a failure.

## Ideas

### A month you fold into an origami (23 Oct 2026, from the user)
As you tick habits through the month, a 3D origami model assembles in the Month view: each tick a
fold, each week a stage, the full model at month end. How full it is shows how the month went.
- Let people pick their origami from a set (crane, frog, lotus, fox, boat, butterfly), or cycle
  through them so every month gets a different one.
- At year end, a shelf of twelve models: the year at a glance, in paper.
- A perfect month could earn a special paper (gold, patterned washi).
- Builds on the existing fold engine in `src/three/crane.js`, which already folds a model in
  stages from a flat crease pattern. Each new model is a new set of triangles and fold stages.

### Reminders that arrive with the app closed
Web Push from a small server job, or native notifications in the phone app.
See [data-storage.md](data-storage.md), phase 3.

### Phone apps (Android and iOS)
Wrap the web app with Capacitor: same code, native notifications, home-screen widget for today's
habits.

### Accounts and sync for family and friends
Sign in with an email link or Google; the same data on phone and laptop. Plan in
[data-storage.md](data-storage.md).

### Opt-in buddies (23 Oct 2026, from the user; planned after accounts)
Accounts start private. Later, invite a friend as a buddy: you see each other's cranes and streaks,
never each other's misses, and habit names only if you choose to share them. Remove a buddy at any
time. Data side: [data-storage.md](data-storage.md), "Sharing".
- Later still: a family circle with one shared thousand-crane wish.

### Weekly and monthly goals, and habits on chosen days (23 Oct 2026, from the user) — built 24 Oct 2026, D-013
Daily habits are short-term goals; weekly and monthly ones are the long-term goals. And some habits
only belong on certain days.
- **Habit cadence:**
  - **Daily** (today's kind).
  - **On chosen weekdays:** for example only Monday and Wednesday. The month grid shows boxes
    only on those days; other days are blank, not misses.
  - **N times a week**, any days: for example gym 3 times a week. One box per day, and the week
    counts as done at 3.
  - **Weekly task:** one thing to finish once in a week ("plan the week", "long run").
    Shown as one box per week.
  - **Monthly task:** one thing to finish once in a month ("read one book", "review finances").
    One box for the month.
- **In the UI:** a short-term / long-term split. Today's checklist shows only what's due today;
  a "This week" and "This month" strip holds the longer goals. The grid only draws boxes where a
  habit is due, so a Monday-and-Wednesday habit never looks like it failed on a Tuesday.
- **In the numbers:** "days so far" becomes "due days so far" (D-006 already counts only tracked
  days, so this extends it). Streaks count consecutive *due* days, or consecutive weeks for weekly
  goals. The goal view's default goal becomes the number of due days in the month.
- **In the data:** each habit-month gets a `cadence` and a schedule; ticks stay one row per day,
  with weekly and monthly tasks ticked on the day they're done. See
  [data-storage.md](data-storage.md), data model.
- Reminders follow the schedule: no nudge on a day the habit isn't due.

### Kintsugi days
A missed day inside a long run is mended with a gold seam instead of breaking the streak, at most
once a week. Fall seven times, rise eight, as a mechanic.

### Weekly recap
A paper card every Sunday: folds made, best habit, the week's crane, ready to save or share.

### Year in folds: a recap, and years side by side (24 Oct 2026, from the user)
A year-end recap in the spirit of Spotify Wrapped, made of paper: a short sequence of cards to tap
through in December, ending on the wish. Ideas for cards: total cranes and what that is in paper
(a stack as tall as...), the habit you folded most, the longest run and when it happened, the best
month and the hardest one you came back from, your most consistent hour, perfect days, the day of
the week you never missed. Saved as images to share, with habit names optional (privacy first).
Plus **comparisons between years**: 2027 against 2026 per habit, month by month, as two mountain
ranges laid over each other. "Fold the year" (D-017) is the first step and already shows a short
look back; the data is ready for this (habit ids stay the same across years).

### Wish at 1,000
When crane 1,000 is folded, the wish written on the Habits page is revealed on a big paper scroll.

### Habit templates
Start a new month or a new person from a template: "morning routine", "DSA prep", "language".
