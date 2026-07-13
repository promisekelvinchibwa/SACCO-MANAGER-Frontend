# Community SACCO Manager — Frontend

React + Vite frontend for the COM422 SACCO Manager project, talking to the
Django backend's REST API.

## What's implemented

- **Login** — token-based auth against `/api/token-auth/`.
- **Dashboard** — fund balance, member count, active loan count, member list.
- **Meetings & savings** — create a meeting, record share purchases / social
  fund contributions per member.
- **Loans** — issue a loan (enforces the borrowing limit and fund balance
  server-side), view the loan ledger, record repayments.
- **Fines** — record a fine, mark it paid.
- **Share-out** — compute the end-of-cycle share-out and view the resulting
  statement (savings, gross share, loan deduction, net payout per member).

Only `treasurer`-role users can perform write actions (the backend enforces
this — the frontend doesn't hide anything a `member`-role user could still
reach directly, so don't rely on the UI alone for access control in your
report; the real enforcement is `IsTreasurer` on the backend).

## Setup

1. **Make sure the backend is running first** (see `../backend/README.md`),
   on `http://localhost:8000`.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the dev server:**
   ```bash
   npm run dev
   ```
   Opens on `http://localhost:5173` by default.

4. **Log in** with one of the seeded accounts (from `seed_demo_data`):
   - `treasurer` / `treasurer123` — full read/write access
   - `member1` / `member123` — read-only (loan/fine actions will get a
     403 from the backend if attempted)

## Building for production

```bash
npm run build
```
Outputs static files to `dist/`. Since this is a course project, the dev
server (`npm run dev`) is enough for the demo — you likely don't need to
deploy this anywhere.

## API base URL

Set in `src/api/client.js` (`API_BASE`). Defaults to
`http://localhost:8000/api`. Change this if you run the backend on a
different port or host.

## Design notes

The visual style (`src/index.css`) is a deliberate "ledger / passbook"
theme — navy sidebar, brass accent, monospace figures for money, subtle
ruled-paper lines on cards — meant to evoke the physical passbooks the
brief describes groups currently using, rather than a generic admin
dashboard template. Worth a sentence in your final report if you want to
justify UI choices, not just backend ones.
