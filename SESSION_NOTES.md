# SiteSense Session Notes

## Latest Session: December 20, 2025

### What We Built: Reports Expansion

Expanded the reports page from 2 tabs to 7 tabs with data visualizations using **recharts**.

**New Report Tabs:**
1. **Financial** - Expense breakdown by category/job, monthly trends, top vendors
2. **Estimates** - Win rate, status breakdown, monthly volume
3. **Subcontractors** - Compliance scoring, document expiry alerts, by-trade breakdown
4. **Time & Labor** - Hours by job, labor costs, monthly trends
5. **Properties** - Occupancy, work orders, lease expirations (PM industry only)
6. Jobs (existing)
7. Tools (existing)

**Files Created:**
```
app/(sitesense)/reports/types.ts                    # Type definitions
app/(sitesense)/reports/components/StatCard.tsx     # Summary stat card
app/(sitesense)/reports/components/DateRangePicker.tsx
app/(sitesense)/reports/components/BarChartWrapper.tsx
app/(sitesense)/reports/components/PieChartWrapper.tsx
app/(sitesense)/reports/components/LineChartWrapper.tsx
app/(sitesense)/reports/components/FinancialReport.tsx
app/(sitesense)/reports/components/EstimateReport.tsx
app/(sitesense)/reports/components/SubcontractorReport.tsx
app/(sitesense)/reports/components/LaborReport.tsx
app/(sitesense)/reports/components/PropertyReport.tsx
app/api/reports/financial/route.ts
app/api/reports/estimates/route.ts
app/api/reports/subcontractors/route.ts
app/api/reports/labor/route.ts
app/api/reports/properties/route.ts
```

### Bug Fixes This Session

1. **Subcontractor report** - Changed `trade` to `primary_trade` (correct column name)
2. **Financial/Labor reports** - Changed `entry_date` to `date` (actual DB column)
3. **Financial report** - Removed non-existent `budgets` and `mileage` tables
4. **Stripe integration** - Made optional (lazy initialization) so builds work without env vars

### Schema vs Actual Database

**Important:** The Drizzle schema (`db/schema.ts`) doesn't always match the actual database tables. The DB was created via `/api/db/init` SQL statements. When in doubt, check:
- `/api/db/init/route.ts` - CREATE TABLE statements
- Existing API routes - See what columns they INSERT/SELECT

Known discrepancies:
- `time_entries.date` (actual) vs `entry_date` (schema)
- `subcontractors.primary_trade` (actual) vs `trade` (sometimes referenced)

### PWA Status

SiteSense is **already configured as a PWA**:
- `public/manifest.json` - App manifest with shortcuts
- `public/sw.js` - Service worker with offline caching
- `public/icons/icon.svg` - App icon
- `components/InstallPrompt.tsx` - Install prompt for iOS/Android
- `app/layout.tsx` - Meta tags and SW registration

Users can install from browser menu or the install prompt.

---

## Project Overview

**SiteSense** is a multi-industry job management platform for:
- General Contractors
- Residential Builders
- Service/Repair Companies
- Property Managers

### Tech Stack
| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Database | Turso (libSQL/SQLite) |
| ORM | Drizzle (schema only, raw SQL for queries) |
| Auth | Custom JWT (bcrypt + jsonwebtoken) |
| Styling | Tailwind CSS |
| Charts | recharts |
| Payments | Stripe (optional) |
| Hosting | Vercel |

### Key Features by Module

**Core (All Industries):**
- Jobs/Projects management
- Estimates with PDF export
- Time tracking
- Expense tracking
- Tool inventory with QR codes
- Contacts/Clients
- Crew management

**Construction-Specific:**
- Schedule of Values (SOV)
- Bid packages & subcontractor bidding
- Cost codes (CSI divisions)
- RFIs & Submittals
- Daily logs

**Property Management:**
- Units/Spaces
- Tenants
- Leases
- Work orders
- Rent roll

### Industry Onboarding

Users select their industry on first login (`/onboarding`), which:
- Enables relevant modules
- Sets terminology preferences
- Filters navigation menu

---

## Environment Variables

```env
# Turso Database
TURSO_DATABASE_URL=libsql://sitesense-mcsmartbytes.aws-us-west-2.turso.io
TURSO_AUTH_TOKEN=your_token

# Auth
JWT_SECRET=your_secret

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Stripe (Optional)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

---

## Database

**Initialize:** `POST /api/db/init`

50+ tables including:
- `users`, `industries`, `industry_profiles`, `user_industry_settings`
- `jobs`, `job_phases`, `job_tasks`, `permits`
- `estimates`, `estimate_items`, `estimate_sections`
- `schedule_of_values`, `sov_line_items`
- `subcontractors`, `bid_packages`, `subcontractor_bids`
- `time_entries`, `expenses`, `categories`
- `tools`, `tool_categories`, `tool_checkouts`
- `units`, `tenants`, `leases`, `work_orders`
- And more...

---

## Running Locally

```bash
npm install
npm run dev
# Visit http://localhost:3000
```

To initialize database:
```bash
curl -X POST http://localhost:3000/api/db/init
```

---

## Deployment

Hosted on Vercel: https://sitesense-app.vercel.app (or your URL)

Dependabot branches may need fixes for:
- Tailwind v4 (requires `@tailwindcss/postcss`)
- Stripe SDK v20+ (requires API version `2025-12-15.clover`)
- React 19 types (`React.ReactNode` instead of `JSX.Element`)

---

## Next Steps (Suggested)

1. Test PWA installation on mobile
2. Add more report visualizations or export options
3. Build out remaining features:
   - Daily logs
   - RFIs & Submittals
   - Pro forma / draw schedules
4. Add push notifications for:
   - Tool return reminders
   - Document expiry alerts
   - Lease expiration warnings
5. Consider syncing Drizzle schema with actual DB structure

---

## Related Projects

- `expenses_made_easy` - Expense tracker (separate)
- `crm_made_easy` - CRM system
- `sealn-super-site` - Client website with embedded apps
