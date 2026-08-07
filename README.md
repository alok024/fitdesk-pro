# FitDesk Pro

A complete gym management suite delivered as a single-file offline-capable PWA. No backend, no build process, no dependencies.

## Features

- **Members Management** — Add, edit, track membership plans (30d–365d), fees, payment status, and member details
- **Attendance Tracking** — Daily check-in records with streaks and per-member logs
- **Finance Dashboard** — Revenue trends, monthly breakdown, plan analysis, 6-month charts
- **Expense Tracking** — Categorized expenses (Rent, Electricity, Staff, Equipment, Marketing, Maintenance) with monthly filtering
- **WhatsApp Integration** — Send bulk reminders, birthday greetings, and direct messages to members
- **Alerts & Metrics** — Real-time action items for expiring memberships, overdue payments, upcoming birthdays
- **CSV Export** — Full member data export for spreadsheet use
- **Backup/Restore** — JSON-based full data backup with import support
- **Offline PWA** — Install to home screen, works without internet, data stays on your device
- **Dark Theme** — Cyan-accented UI optimized for mobile and desktop

## Quick Start

1. **Open** `index.html` in any modern browser
2. **Launch** the app or try demo mode with sample data
3. **Configure** your gym name and WhatsApp country code in Settings
4. **Add members** via the Members tab
5. **Track attendance, payments, expenses** using dedicated tabs

No installation, no server, no signup required.

## Technology

- Vanilla HTML, CSS, JavaScript (no frameworks)
- LocalStorage for persistent data
- Service Worker for offline caching
- PWA manifest for installability
- Responsive design with safe-area-inset support

## Tabs & Usage

**Dashboard**
- Overview stats: total members, active, expiring soon, unpaid
- Retention ring showing paid member percentage
- Action alerts for urgent items
- 6-month revenue chart
- Upcoming birthdays

**Members**
- Search and filter by status (all, paid, unpaid, expiring, expired)
- Category filtering (General, Weight Loss, Muscle Building, Cardio, Yoga)
- Sort by name, expiry, status, join date, or fee
- Inline actions: toggle pay status, renew, edit, WhatsApp message, view details
- Bulk delete from individual member delete button

**Attendance**
- Select date and toggle attendance per member
- See attendance streaks
- Filter by date range

**Finance**
- Monthly revenue table with bar chart
- Membership plan breakdown (revenue by plan duration)
- Member category breakdown (distribution %)
- 6-month trending visualization

**Expenses**
- Add expenses by category and date
- Monthly filter and breakdown
- Delete individual expenses
- Visual expense tracking

## Settings

- **Gym Profile**: Name and owner contact
- **WhatsApp**: Country code selection for bulk messaging (+91 India, +1 USA, +44 UK, +971 UAE)
- **Data Management**: 
  - Backup to JSON file (auto-timestamped)
  - Restore from JSON file
  - Clear all data (irreversible)

## Data Storage

All data is stored in browser localStorage:
- `fdMembers_v4` — Member profiles, plans, payment history
- `fdExpenses` — Expense records
- `fdAttendance` — Daily check-in records (date-based)
- `gymSettings` — Gym name, owner, WhatsApp config

Automatic migration from older versions (v2, v3) on first load.

## PWA Installation

The app displays an install banner on first visit. Tap to add FitDesk Pro to your home screen. Works offline; all data remains local on your device.

## Demo Mode

Click "Try Demo" on the landing page to load 8 sample members with 6 months of transaction and attendance history. Clear via Settings or the demo banner.

## Browser Support

Works on any modern browser with localStorage and Service Worker support:
- Chrome/Edge 50+
- Firefox 45+
- Safari 11+
- Mobile browsers (iOS Safari 11+, Chrome, Firefox, Samsung Internet)

## Offline Behavior

The app caches itself on first load. You can use it completely offline:
- Add/edit/delete members
- Record attendance
- Track expenses
- Generate reports

Sync between devices by exporting JSON, transferring via email, and importing on another device.

## License

No license file present. All rights reserved by the author.