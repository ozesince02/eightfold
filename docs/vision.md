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

### Reminders that arrive with the app closed (planned 27 Oct 2026)
Web Push from a job that runs every 30 minutes, plus a daily summary and a weekly recap, each
switched on or off separately. Native notifications in the phone app later. Design:
[buddies-and-notifications.md](buddies-and-notifications.md).

### Phone apps (Android and iOS)
Wrap the web app with Capacitor: same code, native notifications, home-screen widget for today's
habits.

### Accounts and sync for family and friends
Sign in with an email link or Google; the same data on phone and laptop. Plan in
[data-storage.md](data-storage.md).

### Opt-in buddies and challenges (23 Oct 2026, from the user; planned 27 Oct 2026)
Accounts start private. Add several buddies you know in real life, by invite link (no search, no
community, no chat), and choose for each how much they see: nothing, how consistent you are, or
chosen habits by name. A buddy who sees you struggling can reach out in person. Remove a buddy at
any time. **Challenges:** a habit two people, or a group of up to ten, take on together for a
week, a month or a year, each ticking their own. Design:
[buddies-and-notifications.md](buddies-and-notifications.md).
- Later still: a family circle with one shared thousand-crane wish.

### Nudges between buddies (27 Oct 2026, from the user; not in the first version)
A buddy could send a nudge when a habit isn't ticked yet. Left out for now: the other person may
already be doing it and just hasn't ticked, and repeated nudges would irritate more than help.
Buddies know each other and can reach out directly.

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

### Private names: end-to-end encryption (25 Oct 2026, from the user) — parked 26 Oct 2026
Habit names, wishes and times encrypted in the browser before they sync, so nobody with database
access, the owner included, can read them. Until then the Privacy page says plainly that the owner
can technically reach the data and looks only on request.
- **How:** the browser's own AES-256-GCM (WebCrypto), with a key made on the device that never
  reaches the server. Encoding (Base64) or encrypting on the server with a key we hold were ruled
  out: neither stops the person who runs the service.
- **Why parked:** people use Eightfold on several devices at once, and every device needs the same
  key without the server ever having it (a recovery code, scanning a QR code from a signed-in
  device, or later passkeys). That's too much for now.
- **Costs to settle when it comes back:** a lost key and lost devices mean lost names (ticks
  survive); closed-app reminders can't name the habit unless the device decrypts them; buddies
  would need a shared key; existing names must be encrypted in place; dates of ticks stay visible.
- **Design before buddies and closed-app reminders**, since both change once names are encrypted.

### Kintsugi days
A missed day inside a long run is mended with a gold seam instead of breaking the streak, at most
once a week. Fall seven times, rise eight, as a mechanic.

### Weekly recap
A paper card every Sunday: folds made, best habit, the week's crane, ready to save or share.
Announced by the weekly recap notification ([buddies-and-notifications.md](buddies-and-notifications.md)).

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
