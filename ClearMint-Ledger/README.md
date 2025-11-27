# ClearMint Ledger

ClearMint Ledger is a polished, full-featured personal budgeting web application. It uses a Node.js and Express backend with SQLite for persistence, and a responsive vanilla JavaScript frontend with smooth transitions and chart visualizations.

## Features
- Add, edit, filter, sort, and search transactions (income and expenses)
- Category management with colors and safe reassignment on delete
- Dashboard with monthly insights, charts, and key metrics
- Reports for monthly and yearly breakdowns with exports
- Settings for currency, animation toggles, backups/imports, and full reset
- Persistent SQLite database with automatic schema creation

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open the app at [http://localhost:3000](http://localhost:3000).

The database file is stored in `backend/db/clearmint-ledger.db` and initialized automatically from `backend/db/schema.sql`.

## Scripts
- `npm start` - Run the production server
- `npm run dev` - Run with automatic reload via nodemon

## API Overview
- `GET /api/transactions` with filters for type, category, date range, search, sort
- `POST /api/transactions` create new transaction
- `PUT /api/transactions/:id` update transaction
- `DELETE /api/transactions/:id` delete transaction
- `GET /api/categories` list categories
- `POST /api/categories` create category
- `PUT /api/categories/:id` update category
- `DELETE /api/categories/:id` delete with optional `replacement` query
- `GET /api/reports/monthly` monthly analytics
- `GET /api/reports/yearly` yearly analytics
- `GET /api/settings` retrieve settings
- `PUT /api/settings` update settings
- `POST /api/settings/backup` download backup JSON
- `POST /api/settings/import` import backup JSON
- `POST /api/settings/reset` reset all data

## Development Notes
- All SQL uses parameter binding for safety.
- Animations can be disabled via the settings toggle for accessibility or preference.
- Charts are powered by Chart.js loaded from CDN.
