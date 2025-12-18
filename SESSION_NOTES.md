# SiteSense Session Notes - December 17, 2025

## Project Overview

**SiteSense** is a job costing app for contractors (separate from Expenses Made Easy). It includes:
- Job management with industry-specific fields
- Estimates/bidding with PDF export
- Time tracking
- Tool tracking with QR codes
- Permits, materials, phases/tasks

## Database Setup

**Turso** (libSQL/SQLite) - NOT Supabase
- URL: `libsql://sitesense-mcsmartbytes.aws-us-west-2.turso.io`
- Token stored in `.env.local`
- Schema created via `/api/db/init`

## Authentication System (NEW - Built This Session)

**Custom JWT Auth using Turso** - No Supabase required!

### Auth Files Created:
```
lib/auth.ts                           # Auth utilities (hash, verify, JWT, cookies)
contexts/AuthContext.tsx              # React context for auth state
components/ProtectedRoute.tsx         # Route protection wrapper
app/api/auth/register/route.ts        # User registration
app/api/auth/login/route.ts           # User login
app/api/auth/logout/route.ts          # User logout
app/api/auth/session/route.ts         # Session check
app/login/page.tsx                    # Login page
app/register/page.tsx                 # Registration page
```

### Auth Features:
- Password hashing with bcrypt
- JWT tokens stored in httpOnly cookies
- 7-day token expiry
- Protected routes with automatic redirect
- User dropdown with logout in Navigation

### Packages Installed for Auth:
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT handling
- `@types/bcryptjs` - TypeScript types
- `@types/jsonwebtoken` - TypeScript types

## Tool Tracking Feature (Complete)

**Database Tables:**
- `tools` - Main inventory with QR codes
- `tool_categories` - 10 default categories
- `tool_checkouts` - Check in/out history
- `tool_maintenance` - Maintenance log
- `crew_members` - For assignments

**API Routes (using Turso):**
- `/api/tools` - CRUD for tools
- `/api/tools/categories` - GET categories
- `/api/tools/checkout` - Check in/out operations
- `/api/tools/scan` - Look up tool by QR code
- `/api/db/init` - Initialize database schema

**Pages:**
- `/tools` - Tool inventory list, add/edit, QR generation, print labels
- `/tools/scan` - Camera QR scanner, manual entry, check in/out forms

**Packages Installed:**
- `@libsql/client` - Turso database client
- `qrcode` - QR code generation
- `html5-qrcode` - Web camera QR scanning

## Files Created/Modified This Session

```
# Authentication
lib/auth.ts                           # Auth utilities
contexts/AuthContext.tsx              # Auth context
components/ProtectedRoute.tsx         # Route protection
app/api/auth/register/route.ts        # Register API
app/api/auth/login/route.ts           # Login API
app/api/auth/logout/route.ts          # Logout API
app/api/auth/session/route.ts         # Session API
app/login/page.tsx                    # Login page
app/register/page.tsx                 # Register page

# Tool Tracking
lib/turso.ts                          # Turso client utility
app/api/tools/route.ts                # Tools CRUD
app/api/tools/categories/route.ts     # Categories API
app/api/tools/checkout/route.ts       # Check in/out API
app/api/tools/scan/route.ts           # QR scan lookup API
app/api/db/init/route.ts              # DB initialization
app/(sitesense)/tools/page.tsx        # Tool inventory page
app/(sitesense)/tools/scan/page.tsx   # QR scanner page

# Updated
components/Navigation.tsx             # Added logout, user menu
app/page.tsx                          # Landing page + dashboard
app/layout.tsx                        # Added AuthProvider
.env.local                            # Added JWT_SECRET
.env.example                          # Updated with JWT_SECRET
```

## Environment Variables Required

```env
# Turso Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# JWT Auth
JWT_SECRET=your_secure_jwt_secret_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Dev Server

Running at: `http://localhost:3000`
- `/` - Landing page (logged out) or Dashboard (logged in)
- `/login` - Login page
- `/register` - Registration page
- `/tools` - Tool tracking (protected)
- `/tools/scan` - QR scanner (protected)
- `/jobs` - Jobs management
- `/estimates` - Estimates

## How to Test

1. Start dev server: `npm run dev`
2. Initialize database: `curl -X POST http://localhost:3000/api/db/init`
3. Go to http://localhost:3000
4. Register a new account
5. Try the tool tracking feature

## Pages That Still Use Supabase (Legacy)

These pages were built before and still reference Supabase:
- `/recurring` - Recurring expenses
- `/budgets` - Budget tracking
- `/mileage` - Mileage tracking
- `/reports` - Tax reports
- `/receipts` - Receipt gallery
- `/settings` - User settings

Note: These are from Expenses Made Easy and may not be relevant to SiteSense.

## Next Steps (Suggested)

1. Test auth flow (register, login, logout)
2. Test tool tracking with QR codes
3. Build remaining SiteSense features:
   - Jobs page (needs Turso conversion)
   - Estimates page (needs Turso conversion)
   - Bid helper / measurements calculator
   - Time tracking
4. Remove legacy Supabase pages if not needed

## Related Projects

- `crm_made_easy` - Standalone CRM
- `expenses_made_easy` - Expense tracker (separate project)
- `inventory-tracker-app` - Has barcode scanner reference code
