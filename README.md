# PoyshaGuni — Personal Finance Management App

A comprehensive full-stack finance tracker with **budgeting**, **goal tracking**, **recurring transactions**, **loan tracking**, **analytics**, and **audit logging**. Built with **Node.js + Express + MongoDB** (backend) and **Vanilla HTML/CSS/JS + PWA** (frontend).

**Features:** Track expenses & income • Manage budgets by category • Set and track financial goals • Automate recurring transactions • Track loans you lent out and money you owe • View spending analytics • 24/7 recurring processing • Email alerts • Progressive Web App • Dark/Light themes • Multi-language support

---

```
poyshaguni/
├── backend/
│   ├── server.js                  # Entry point
│   ├── .env                       # Environment variables
│   ├── package.json
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── models/
│   │   ├── User.js                # User accounts & preferences
│   │   ├── Expense.js             # Transaction expenses
│   │   ├── Income.js              # Transaction income
│   │   ├── Budget.js              # Category budgets with tracking
│   │   ├── Goal.js                # Financial goals with progress
│   │   ├── Recurring.js           # Automated recurring transactions
│   │   ├── Loan.js                # Loans lent out / borrowed, with repayments
│   │   └── AuditLog.js            # Action audit trail
│   ├── controllers/
│   │   ├── authController.js      # Sign up, login, user profile
│   │   ├── expenseController.js   # Create, read, update, delete expenses
│   │   ├── incomeController.js    # Create, read, update, delete income
│   │   ├── budgetController.js    # Budget CRUD & tracking
│   │   ├── goalController.js      # Goal CRUD & fund management
│   │   ├── recurringController.js # Recurring CRUD & processing
│   │   ├── loanController.js      # Loan CRUD, repayments & settlement
│   │   ├── analyticsController.js # Trends, forecasts, breakdowns
│   │   ├── dashboardController.js # Summary data & charts
│   │   ├── auditController.js     # Audit log retrieval
│   │   └── userController.js      # Profile, settings, preferences
│   ├── routes/
│   │   ├── auth.js                # /api/auth/*
│   │   ├── expenses.js            # /api/expenses/*
│   │   ├── income.js              # /api/income/*
│   │   ├── budgets.js             # /api/budgets/*
│   │   ├── goals.js               # /api/goals/*
│   │   ├── recurring.js           # /api/recurring/*
│   │   ├── loans.js               # /api/loans/*
│   │   ├── analytics.js           # /api/analytics/*
│   │   ├── dashboard.js           # /api/dashboard
│   │   ├── audit.js               # /api/audit/*
│   │   └── user.js                # /api/user/*
│   ├── middleware/
│   │   ├── auth.js                # JWT verification & token validation
│   │   ├── validate.js            # Request body validation
│   │   └── errorHandler.js        # Global error handling
│   └── utils/
│       ├── generateToken.js       # JWT token generation
│       ├── auditLog.js            # Audit trail logging
│       ├── recurringProcessor.js  # Shared on-demand recurring materializer
│       ├── cron.js                # Scheduled jobs (recurring processing, summaries)
│       └── email.js               # Email notifications (alerts, welcome, reminders)
│
└── frontend/
    ├── index.html                 # Landing page
    ├── login.html                 # Login form
    ├── signup.html                # Registration form
    ├── onboarding.html            # First-time user setup
    ├── dashboard.html             # Summary dashboard with charts
    ├── transactions.html          # Expense & income tracking (dual-tab)
    ├── budgets.html               # Budget management by category
    ├── goals.html                 # Financial goals with progress tracking
    ├── recurring.html             # Recurring transaction automation
    ├── loans.html                 # Loan tracking (lent out / borrowed)
    ├── analytics.html             # Trends, forecasts, category breakdown
    ├── profile.html               # User profile & preferences
    ├── settings.html              # App settings (theme, currency, language)
    ├── about.html                 # About page
    ├── features.html              # Features showcase
    ├── pricing.html               # Pricing info
    ├── manifest.json              # PWA manifest
    ├── sw.js                      # Service worker (PWA support)
    ├── style/
    │   ├── main.css               # Core styles
    │   ├── analytics.css          # Analytics page styles
    │   ├── onboarding.css         # Onboarding flow styles
    │   └── profile.css            # Profile page styles
    ├── js/
    │   ├── api.js                 # Shared API utilities & constants
    │   ├── auth.js                # Auth page logic
    │   ├── main.js                # Global utilities (nav, theme, formatting)
    │   ├── dashboard.js           # Dashboard page logic
    │   ├── transactions.js        # Transactions page logic
    │   ├── budgets.js             # Budgets page logic
    │   ├── goals.js               # Goals page logic
    │   ├── recurring.js           # Recurring transactions page logic
    │   ├── loans.js               # Loans page logic
    │   ├── analytics.js           # Analytics page logic
    │   ├── profile.js             # Profile page logic
    │   ├── settings.js            # Settings page logic
    │   ├── onboarding.js          # Onboarding flow logic
    │   ├── theme.js               # Theme management (dark/light)
    │   └── icons.js               # SVG icon utilities
    └── icons/                     # Icon assets
```

---

## Setup & Running

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

---

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/poyshaguni
JWT_SECRET=your_strong_secret_here_change_this
JWT_EXPIRE=7d
NODE_ENV=development
```

**Using MongoDB Atlas (cloud)?** Replace `MONGO_URI` with your connection string:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/poyshaguni?retryWrites=true&w=majority
```

### 3. Start Backend

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

---

## Setup & Running

### Prerequisites
- Node.js v18+ with npm
- MongoDB (local or Atlas cloud database)
- Modern web browser (Chrome, Firefox, Safari, Edge)

---

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/poyshaguni

# Security
JWT_SECRET=your_very_strong_secret_key_change_in_production_12345
JWT_EXPIRE=30d

# Email (optional for alerts & notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SEND_FROM_EMAIL=noreply@poyshaguni.app

# CORS
ALLOWED_ORIGINS=file://,http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500,http://localhost:5173
```

**Using MongoDB Atlas (recommended)?** Replace `MONGO_URI`:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/poyshaguni?retryWrites=true&w=majority
```

### 3. Start Backend

```bash
# Development (with auto-restart on code changes)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`  
Health check: `http://localhost:5000/api/health` (should return 200 OK)

---

### 4. Frontend Setup

No build step needed — pure HTML/CSS/JS with PWA support.

**Option A: VS Code Live Server (Recommended)**
- Install "Live Server" extension
- Right-click `frontend/index.html` → "Open with Live Server"
- Opens at `http://127.0.0.1:5500`

**Option B: Python HTTP Server**
```bash
cd frontend
python -m http.server 5500
```

**Option C: Node npx serve**
```bash
npx serve frontend -l 5500
```

**Important:** Edit `frontend/js/api.js` if your backend port differs from `5000`:
```javascript
const API_BASE = 'http://localhost:5000/api';
```

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/auth/signup` | No | `{name, email, password}` | `{token, user}` |
| POST | `/api/auth/login` | No | `{email, password}` | `{token, user}` |
| GET | `/api/auth/me` | Yes | — | `{user}` |

### Transactions

**Expenses:**

| Method | Endpoint | Auth | Query | Body | Description |
|--------|----------|------|-------|------|-------------|
| GET | `/api/expenses` | Yes | `?month=5&year=2026&category=Food` | — | Get expenses (filtered) |
| POST | `/api/expenses` | Yes | — | `{title, amount, category, date, note}` | Add expense |
| PUT | `/api/expenses/:id` | Yes | — | `{title, amount, category, date, note}` | Update expense |
| DELETE | `/api/expenses/:id` | Yes | — | — | Delete expense |

**Income:**

| Method | Endpoint | Auth | Query | Body | Description |
|--------|----------|------|-------|------|-------------|
| GET | `/api/income` | Yes | `?month=5&year=2026` | — | Get income (filtered) |
| POST | `/api/income` | Yes | — | `{source, amount, date, note}` | Add income |
| PUT | `/api/income/:id` | Yes | — | `{source, amount, date, note}` | Update income |
| DELETE | `/api/income/:id` | Yes | — | — | Delete income |

### Budgets

| Method | Endpoint | Auth | Query | Body | Description |
|--------|----------|------|-------|------|-------------|
| GET | `/api/budgets` | Yes | `?month=5&year=2026` | — | Get budgets (by month/year) |
| POST | `/api/budgets` | Yes | — | `{category, limit, month, year}` | Create budget |
| PUT | `/api/budgets/:id` | Yes | — | `{limit}` | Update budget limit |
| DELETE | `/api/budgets/:id` | Yes | — | — | Delete budget |

### Goals

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/api/goals` | Yes | — | Get all goals |
| POST | `/api/goals` | Yes | `{title, targetAmount, targetDate, emoji, note}` | Create goal |
| PUT | `/api/goals/:id` | Yes | `{title, targetAmount, targetDate, emoji, note, isCompleted}` | Update goal |
| DELETE | `/api/goals/:id` | Yes | — | Delete goal |
| POST | `/api/goals/:id/add-funds` | Yes | `{amount}` | Add funds to goal |

### Recurring Transactions

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/api/recurring` | Yes | — | Get all recurring transactions |
| GET | `/api/recurring/upcoming` | Yes | — | Get upcoming (next 30 days) |
| POST | `/api/recurring` | Yes | `{type, amount, frequency, startDate, endDate, isActive, title?, category?, source?}` | Create recurring |
| PUT | `/api/recurring/:id` | Yes | `{amount, frequency, endDate, ...}` | Update recurring |
| PATCH | `/api/recurring/:id/toggle` | Yes | — | Pause/resume recurring |
| DELETE | `/api/recurring/:id` | Yes | — | Delete recurring |
| POST | `/api/recurring/process` | Yes | — | Process this user's due items now |
| POST | `/api/recurring/process-all` | Yes | — | Alias of `/process` (processes due items) |

**Frequency options:** `daily`, `weekly`, `monthly`, `yearly`  
**Type options:** `expense`, `income`

> **Note:** Due recurring items are also materialized automatically whenever the dashboard, transactions, or analytics endpoints are called, so recurring income/expense always shows up in your totals without waiting for the nightly cron.

### Loans

| Method | Endpoint | Auth | Body / Query | Description |
|--------|----------|------|--------------|-------------|
| GET | `/api/loans` | Yes | `?direction=lent\|borrowed&status=open\|paid` | List loans + summary totals |
| GET | `/api/loans/summary` | Yes | — | Outstanding totals only (owedToMe, iOwe, net) |
| POST | `/api/loans` | Yes | `{direction, counterparty, principal, date?, dueDate?, note?}` | Add a loan |
| PUT | `/api/loans/:id` | Yes | `{counterparty?, principal?, dueDate?, ...}` | Update a loan |
| POST | `/api/loans/:id/repay` | Yes | `{amount, date?, note?}` | Record a (partial) repayment |
| PATCH | `/api/loans/:id/settle` | Yes | — | Mark the loan fully settled |
| DELETE | `/api/loans/:id` | Yes | — | Delete a loan |

**Direction options:** `lent` (someone owes you — an asset), `borrowed` (you owe — a liability)

> **How loans affect your money:** Loans are tracked **separately** from your net balance, which stays cash-only (income − expenses). To keep cash accurate, each loan also posts a matching transaction: lending money creates an **expense** (cash leaves you) and borrowing creates **income** (cash arrives); every repayment posts the reverse (collecting on a loan → income, repaying a debt → expense). The dashboard and transactions pages show *Owed To You*, *You Owe*, and *Net Loan Position* alongside your balance.

### Analytics

| Method | Endpoint | Auth | Query | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/analytics` | Yes | `?month=5&year=2026` | Trends & spending data |
| GET | `/api/analytics/forecast` | Yes | `?months=3` | Budget forecast |
| GET | `/api/analytics/breakdown` | Yes | `?month=5&year=2026` | Category breakdown |

### Dashboard

| Method | Endpoint | Auth | Query | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/dashboard` | Yes | `?month=5&year=2026` | Summary, balance, recent items |

### User Profile

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/api/user/profile` | Yes | — | Get user profile |
| PUT | `/api/user/profile` | Yes | `{name, avatar, currency, locale}` | Update profile |
| PUT | `/api/user/password` | Yes | `{oldPassword, newPassword}` | Change password |

### Audit Logs

| Method | Endpoint | Auth | Query | Description |
|--------|----------|------|-------|-------------|
| GET | `/api/audit` | Yes | `?limit=50&skip=0` | Get audit logs |

---

## Example Requests

### POST /api/auth/login
```json
// Request
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}

// Response 200 OK
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "66abc123def456789ghi",
    "name": "John Doe",
    "email": "john@example.com",
    "currency": "USD",
    "locale": "en-US"
  }
}
```

### POST /api/expenses
```json
// Request (with Authorization header)
POST http://localhost:5000/api/expenses
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Grocery Shopping",
  "amount": 85.50,
  "category": "Food",
  "date": "2026-05-13",
  "note": "Weekly groceries at Whole Foods"
}

// Response 201 Created
{
  "success": true,
  "message": "Expense added.",
  "data": {
    "_id": "66def456ghi789jkl012",
    "userId": "66abc123def456789ghi",
    "title": "Grocery Shopping",
    "amount": 85.50,
    "category": "Food",
    "date": "2026-05-13T00:00:00.000Z",
    "note": "Weekly groceries at Whole Foods"
  }
}
```

### POST /api/budgets
```json
// Request
POST http://localhost:5000/api/budgets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "category": "Food",
  "limit": 500,
  "month": 5,
  "year": 2026
}

// Response 201 Created
{
  "success": true,
  "data": {
    "_id": "66ghi789jkl012mno345",
    "userId": "66abc123def456789ghi",
    "category": "Food",
    "limit": 500,
    "spent": 85.50,
    "month": 5,
    "year": 2026
  }
}
```

### POST /api/goals
```json
// Request
POST http://localhost:5000/api/goals
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Emergency Fund",
  "targetAmount": 5000,
  "targetDate": "2026-12-31",
  "emoji": "🛡️",
  "note": "6 months of expenses"
}

// Response 201 Created
{
  "success": true,
  "data": {
    "_id": "66jkl012mno345pqr678",
    "userId": "66abc123def456789ghi",
    "title": "Emergency Fund",
    "targetAmount": 5000,
    "currentAmount": 0,
    "targetDate": "2026-12-31T00:00:00.000Z",
    "emoji": "🛡️",
    "isCompleted": false,
    "note": "6 months of expenses"
  }
}
```

### POST /api/recurring
```json
// Request
POST http://localhost:5000/api/recurring
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "type": "expense",
  "title": "Gym Membership",
  "category": "Entertainment",
  "amount": 45.00,
  "frequency": "monthly",
  "startDate": "2026-05-13",
  "endDate": null,
  "isActive": true,
  "note": "Monthly gym subscription"
}

// Response 201 Created
{
  "success": true,
  "data": {
    "_id": "66mno345pqr678stu901",
    "userId": "66abc123def456789ghi",
    "type": "expense",
    "title": "Gym Membership",
    "category": "Entertainment",
    "amount": 45.00,
    "frequency": "monthly",
    "startDate": "2026-05-13T00:00:00.000Z",
    "endDate": null,
    "nextDueDate": "2026-05-13T00:00:00.000Z",
    "isActive": true,
    "note": "Monthly gym subscription"
  }
}
```

### POST /api/loans
```json
// Request — lending money to a friend
POST http://localhost:5000/api/loans
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "direction": "lent",
  "counterparty": "Rahim",
  "principal": 1000.00,
  "date": "2026-05-01",
  "dueDate": "2026-08-01",
  "note": "Emergency loan"
}

// Response 201 Created
{
  "success": true,
  "message": "Loan added.",
  "data": {
    "_id": "66xyz789abc012def345",
    "userId": "66abc123def456789ghi",
    "direction": "lent",
    "counterparty": "Rahim",
    "principal": 1000.00,
    "date": "2026-05-01T00:00:00.000Z",
    "dueDate": "2026-08-01T00:00:00.000Z",
    "repayments": [],
    "status": "open",
    "note": "Emergency loan",
    "repaidAmount": 0,
    "outstanding": 1000.00
  }
}
// A matching expense of 1000 is also created automatically (cash left you).
```

---

## Data Models

### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  avatar: String (optional),
  currency: String (default: 'USD'),
  locale: String (default: 'en-US'),
  createdAt: Date,
  updatedAt: Date
}
```

### Expense
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  amount: Number,
  category: String (enum: Food, Transport, Shopping, Bills, Healthcare, Entertainment, Education, Other),
  date: Date,
  note: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Income
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  source: String,
  amount: Number,
  date: Date,
  note: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Budget
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  category: String,
  limit: Number,
  month: Number (1-12),
  year: Number,
  spent: Number (computed from expenses),
  createdAt: Date,
  updatedAt: Date,
  // Unique index: (userId, category, month, year)
}
```

### Goal
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  targetAmount: Number,
  currentAmount: Number (default: 0),
  targetDate: Date,
  emoji: String,
  isCompleted: Boolean,
  note: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Recurring
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  type: String (enum: 'expense', 'income'),
  title: String (expense only),
  category: String (expense only),
  source: String (income only),
  amount: Number,
  frequency: String (enum: 'daily', 'weekly', 'monthly', 'yearly'),
  startDate: Date,
  endDate: Date (optional),
  nextDueDate: Date,
  isActive: Boolean,
  note: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Loan
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  direction: String (enum: 'lent', 'borrowed'),
  counterparty: String,          // the other party (person / bank)
  principal: Number,             // original loan amount
  date: Date,                    // when the loan was made
  dueDate: Date (optional),      // expected settlement date
  repayments: [                  // partial repayments recorded over time
    { amount: Number, date: Date, note: String }
  ],
  status: String (enum: 'open', 'paid'),
  note: String (optional),
  createdAt: Date,
  updatedAt: Date,
  // Virtuals (included in JSON):
  //   repaidAmount  = sum of repayments
  //   outstanding   = max(0, principal − repaidAmount)
}
```

### AuditLog
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  action: String,
  detail: String,
  ip: String,
  userAgent: String,
  timestamp: Date
}
```

---

## Features

### Core
✅ **User Accounts** — Sign up, login with JWT auth, password hashing (bcrypt)  
✅ **Transaction Tracking** — Add/edit/delete expenses & income with categories  
✅ **Dashboard** — Summary cards, balance tracking, recent items, charts  

### Advanced Budgeting
✅ **Category Budgets** — Set monthly limits per category, track spending  
✅ **Budget Alerts** — Email notifications when approaching or exceeding budget  
✅ **Financial Goals** — Create goals with target amount & date, add funds progressively  
✅ **Goal Completion** — Track progress percentage, mark goals as complete  

### Automation
✅ **Recurring Transactions** — Set expenses/income to auto-process (daily/weekly/monthly/yearly)  
✅ **24/7 Processing** — Node-cron runs recurring items at scheduled times  
✅ **On-Demand Catch-Up** — Due items are also materialized when you open the dashboard/analytics, so totals are never stale  
✅ **Upcoming View** — See what's due in the next 30 days  
✅ **Pause/Resume** — Easily toggle recurring items on/off  

### Loan Tracking
✅ **Lent & Borrowed** — Track money you lent out (owed to you) and money you borrowed (you owe)  
✅ **Partial Repayments** — Record repayments over time with a live outstanding balance  
✅ **One-Click Settle** — Mark a loan fully paid in a single tap  
✅ **Separate Balance** — Loans shown apart from cash; Owed/You-Owe/Net surfaced on the dashboard & transactions  
✅ **Auto Cash Sync** — Loan creation and each repayment post a matching income/expense so your cash stays accurate  
✅ **Due Reminders** — Overdue and upcoming loans highlighted  

### Analytics & Insights
✅ **Spending Trends** — View spending over time by category  
✅ **Category Breakdown** — Pie/bar charts showing expense distribution  
✅ **Budget Forecasts** — Predict future spending based on history  
✅ **Income vs Expenses** — Compare income streams and expense categories  

### User Experience
✅ **Dark/Light Theme** — Toggle between themes, preference saved  
✅ **Multi-Currency** — Display amounts in user's preferred currency  
✅ **Multi-Language** — Locale-aware date/number formatting  
✅ **Responsive Design** — Works on desktop, tablet, mobile  
✅ **Progressive Web App** — Install as desktop/mobile app, works offline  
✅ **Onboarding** — First-time setup wizard  

### Admin & Security
✅ **Audit Logging** — All actions logged with user ID, IP, user agent  
✅ **Rate Limiting** — API rate limits (300 req/15min globally, 20 auth attempts/15min)  
✅ **Input Validation** — All endpoints validate request bodies  
✅ **CORS Protection** — Whitelist allowed origins  
✅ **Helmet.js** — HTTP security headers  

---

## Testing with Postman

Import the Postman collection: `PoyshaGuni_API.postman_collection.json`

1. Download and install [Postman](https://www.postman.com/downloads/)
2. File → Import → Select `PoyshaGuni_API.postman_collection.json`
3. Create a Postman environment with:
   - `base_url` = `http://localhost:5000/api`
   - `token` = (auto-populated after login)
4. Run requests from each folder (Auth → Expenses → Income → Budgets → etc.)

---

## Troubleshooting

### Backend won't start
- Check MongoDB is running: `mongod` or verify Atlas connection string
- Check port 5000 is available: `netstat -an | findstr :5000` (Windows) or `lsof -i :5000` (Mac/Linux)
- Check `.env` file exists in backend folder with correct MONGO_URI
- Check Node version: `node -v` (should be v18+)

### Frontend won't connect to API
- Verify backend is running at `http://localhost:5000/api/health`
- Check `API_BASE` in `frontend/js/api.js` matches backend URL
- Check CORS allowed origins in `backend/server.js`
- Open browser DevTools (F12) → Console tab to see error messages

### JWT token errors
- Tokens expire after 30 days (check `JWT_EXPIRE` in `.env`)
- Log out and log back in to refresh token
- Check `Authorization: Bearer <token>` header format in requests

### Recurring transactions not processing
- Check cron jobs are running: "CRON" messages in backend logs
- Verify `nextDueDate` is in past to be considered "due"
- Check MongoDB for Recurring documents with `isActive: true`

---

## Deployment

### Heroku / Railway / Render
1. Push code to GitHub
2. Connect GitHub repo to hosting service
3. Set environment variables in dashboard (MONGO_URI, JWT_SECRET, etc.)
4. Deploy

### Docker (optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend ./
EXPOSE 5000
CMD ["npm", "start"]
```

---

## Changelog

### v2.1 — Loans & connected balances
- **New: Loan tracking.** Track money lent out (owed to you) and borrowed (you owe), with partial repayments, due dates, and one-click settle. New `loans.html` page plus dashboard and transactions integration.
- **Loans kept separate from net balance.** Net balance stays cash-only (income − expenses); loans surface as their own *Owed To You*, *You Owe*, and *Net Loan Position* figures.
- **Automatic cash sync.** Creating a loan and recording each repayment posts a matching income/expense entry, so your cash balance stays accurate.
- **Fixed: recurring items now always show up.** Due recurring income/expense is materialized on demand whenever the dashboard, analytics, or transactions endpoints load — no longer waiting on the nightly cron. A shared `recurringProcessor` utility powers the cron, the manual endpoint, and on-demand processing identically.
- **Fixed: `/api/recurring/process-all`** (called by the UI) now exists as an alias of `/process`.

---

## License

MIT — Feel free to use and modify this project.

1. Import `PoyshaGuni_API.postman_collection.json` into Postman
2. Run **Login** — the token auto-saves to collection variable
3. All protected routes use `{{token}}` automatically

---

## Features

- ✅ JWT Authentication (signup, login, protected routes)
- ✅ Password hashing with bcrypt
- ✅ Expense tracking with 8 categories
- ✅ Income tracking by source
- ✅ Dashboard with all-time and monthly summaries
- ✅ Last 6 months chart data
- ✅ Category spending breakdown
- ✅ CRUD for expenses and income
- ✅ Loan tracking (lent / borrowed) with partial repayments
- ✅ Recurring transactions with on-demand + cron processing
- ✅ Category filtering
- ✅ Monthly filtering
- ✅ Input validation (express-validator)
- ✅ Error handling middleware
- ✅ Chart.js integration (bar + donut charts)
- ✅ Responsive design
- ✅ Toast notifications

---

## Expense Categories

`Food` · `Transport` · `Shopping` · `Bills` · `Healthcare` · `Entertainment` · `Education` · `Other`
