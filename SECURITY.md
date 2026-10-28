# Security policy

Eightfold holds people's habits, routines and wishes. If you find a way to read, change or delete
someone else's data, or to run code in someone's browser, please tell us privately first.

## Reporting a problem

- **Email** hashtechpulkit@gmail.com (the address in the site's footer), with "Eightfold
  security" in the subject.
- **Please don't** open a public issue, pull request or discussion about it until it's fixed.
- **Include:**
  - what you found and where (the page, the request, the file);
  - the steps to reproduce it;
  - what an attacker could do with it.

  A short proof of concept helps more than a long report.

## What to expect

Eightfold is run by one person, so this is best effort, but security comes before features here:

- **A reply within a few days,** to say the report arrived and whether it's understood.
- **A fix in the open** once it's safe to talk about, with a line in the audit log in
  [docs/security.md](docs/security.md). We'll credit you there if you'd like.
- **If people's data was exposed,** they'll be told, as the [Privacy page](https://onemorefold.com/privacy)
  promises.

## Testing fairly

- **Use your own accounts.** Never read, change or delete anyone else's data, even to prove a
  point. Show it between two accounts you made.
- **No denial of service,** no spam through the sign-in emails, no automated sign-up or sign-in at
  volume, and no social engineering.
- **Stop and report** as soon as you've shown the problem.

## In scope

- The live site, onemorefold.com, including the tracker at `/app`.
- The code in this repository: the front end, the database migrations (row-level security and
  database functions), the `send-reminders` Edge Function, and the security headers.

## Out of scope

- Supabase's, Cloudflare's, Google's and the browsers' own platforms. Report those to them.
- **The Supabase URL and publishable key in the site's code.** They're public by design; access is
  decided by row-level security.
- Missing best-practice headers without a way to exploit them, and reports from automated scanners
  alone.

The threat model and the rules every change follows are in [docs/security.md](docs/security.md).
