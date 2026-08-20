# FitDesk Pro

A single HTML file for running the day-to-day admin of a small gym: members, membership
renewals, attendance, expenses, and a finance summary. No backend, no build step, no
dependencies — `index.html` is the entire application.

## Run it

Open `index.html` in a browser. That's it — there is no server to start and nothing to
install first.

```
xdg-open index.html      # Linux
open index.html          # macOS
```

or just double-click the file.

## What it stores, and where

Everything lives in the browser's `localStorage`, under these keys:

- `fdMembers_v4` — member profiles, plans, and payment/renewal history
- `fdExpenses` — expense records
- `fdAttendance` — daily check-in records, keyed by date
- `gymSettings` — gym name, owner contact, WhatsApp country code

There is no server and nothing is ever sent off the device, except the two things below.

Two things reach the network, both only when you trigger them directly:

- The page's font (`fonts.googleapis.com`) loads once when you first open it online. If
  you're offline, the page still works fine — it falls back to your system's default fonts.
- "Send WhatsApp message" opens `wa.me` in a new tab, which needs internet to actually
  deliver the message. Nothing about the app itself requires this.

**A caveat if you open the file directly (`file://`) in a Chromium-based browser (Chrome,
Edge):** storage is partitioned by folder, not by filename. If you copy `index.html` into
the same folder to keep a second gym's data separate — e.g. `index-gym2.html` — it will
read and write the *same* `localStorage` as the original, not a separate copy. Put each
copy in its own folder if you need them isolated. (Verified in Chromium; not checked
against Firefox or Safari's file:// storage rules.)

Older versions of this app used `gymMembers_v2` / `gymMembers_v3` as the storage key.
On first load, if no `fdMembers_v4` key exists yet, the app looks for either of those and
migrates whatever it finds into the current format (each member gets an `id` and a
synthetic join-history entry if it doesn't already have one). This path is covered by the
test suite below.

## What it deliberately does not do

- No accounts, no login, no multi-user access — one browser, one dataset.
- No server sync. Moving data between devices means exporting a JSON backup (Settings →
  Data Management) and importing it on the other device.
- No real "install to home screen" / offline-caching PWA behavior — see below.
- No validation of imported backup files beyond "is this valid JSON." Restoring a backup
  replaces your data wholesale; only import files you trust.
- No CSV formula-injection guarding. A member name starting with `=`, `+`, `-`, or `@`
  is written to the CSV as-is; if that CSV is later opened in Excel or Sheets, that cell
  could be interpreted as a formula. Only relevant if you're importing member lists you
  don't already trust.

## The PWA / offline-install claim

The page ships a web-app manifest and attempts to register a service worker, both built
at runtime from `Blob` URLs rather than separate files. This does not currently work:

```
Failed to register a ServiceWorker: The URL protocol of the script
('blob:...') is not supported.
```

Verified against Chromium — service workers cannot be registered from a `blob:` script
URL at all, and separately, `file://` pages have no origin a service worker could run
under in the first place. So in practice:

- The install banner / "Add to Home Screen" prompt never fires, because Chrome requires a
  working service worker before it considers a page installable.
- There is no cache-first offline layer for repeat visits over a real URL.

What genuinely does work offline: because the whole app — markup, styles, and logic — is
one local file with no server calls of its own, opening it with no internet connection
works normally (aside from the font, see above). That's a property of it being a single
static file, not of the service worker, which is currently dead code.

If you want this fixed properly, it needs an actual `sw.js` file served alongside
`index.html` (not a same-file Blob trick) plus HTTPS or `localhost` hosting — `file://`
can't host a service worker under any implementation.

## Testing

There are no UI or end-to-end tests. What's covered is the pure logic that's easy to get
wrong silently: the HTML-escaping helper, the v2/v3 → v4 storage migration, the
attendance-streak calculation, and CSV row/field escaping — plus two regression tests for
real unescaped-`innerHTML` bugs found and fixed while writing this suite (member names
reaching the dashboard's alert panel, and the search box reaching the "no results"
message, both unescaped).

The test file reads the real `function`/`const` definitions straight out of `index.html`
at run time (by name, not copy-pasted) and executes them in isolation — so a test failure
means the shipped code broke, not that a hand-copied duplicate drifted from it.

```
node test/index.test.js
```

No dependencies beyond Node itself (built-in `assert`, `fs`, `vm`-free plain evaluation).
Tested on Node 22.

## Features

- **Members** — add/edit, plans from 30 to 365 days, fee and payment status, category,
  notes
- **Attendance** — per-day check-in toggle per member, with streak tracking
- **Finance** — monthly revenue, plan-mix and category breakdowns, a 6-month bar chart
- **Expenses** — categorized (Rent, Electricity, Staff, Equipment, Marketing,
  Maintenance), filterable by month
- **WhatsApp** — pre-filled reminder/birthday messages via `wa.me` deep links (bulk or
  per-member)
- **Dashboard alerts** — expiring memberships, unpaid dues, upcoming birthdays
- **CSV export** — full member list, RFC4180-style quoting (see Testing above for what
  that does and doesn't protect against)
- **JSON backup/restore** — full-state export and import

## Tabs

**Dashboard** — totals, a paid-member retention ring, the alert list above, a 6-month
revenue chart, upcoming birthdays.

**Members** — search, filter by status (all/paid/unpaid/expiring/expired) and category,
sort by name/expiry/status/join date/fee, per-member actions (toggle paid, renew, edit,
WhatsApp, view detail, delete).

**Attendance** — pick a date, tap members present, see streaks.

**Finance** — monthly revenue table + chart, plan-duration breakdown, category
breakdown.

**Expenses** — add/delete, filter by month.

## Settings

- Gym name and owner contact
- WhatsApp country code (+91 / +1 / +44 / +971)
- Backup to JSON, restore from JSON, clear all data (irreversible, asks for confirmation)

## Demo mode

The landing page's "Try Demo" button loads 8 sample members with about 6 months of
fabricated transaction and attendance history, so you can see the app populated before
typing in real data. Clear it from Settings or the demo banner. It is clearly fake data,
generated locally — it does not represent a real gym or real customers.

## Browser support

The one thing in the code that sets a real floor is the `??` (nullish coalescing)
operator, which needs a 2020-or-later browser: Chrome/Edge 80+, Firefox 72+, Safari
13.1+. Older browsers will fail to parse the script at all rather than degrading
gracefully.

## License

MIT — see [LICENSE](LICENSE).
