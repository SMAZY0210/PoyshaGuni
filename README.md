# PoyshaGuni

PoyshaGuni is a full-stack personal finance application for tracking income, expenses, budgets, savings goals, recurring transactions, and loans. The backend is a REST API built with Node.js, Express, and MongoDB. The frontend is a Progressive Web App written in vanilla HTML, CSS, and JavaScript, with no build step or framework.

The name comes from the Bengali word *poysha* (money), and the app supports multiple currencies including the Bangladeshi Taka.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [How Balances Work](#how-balances-work)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Background Jobs](#background-jobs)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

**Transactions.** Add, edit, and delete income and expense entries. Expenses are sorted into eight categories: Food, Transport, Shopping, Bills, Healthcare, Entertainment, Education, and Other. Income is tracked by source. Both can be exported to CSV.

**Dashboard.** A monthly view with all-time net balance, total income, total expenses, this month's balance, an income-versus-expenses bar chart for the last six months, a category breakdown donut chart, and a list of recent transactions.

**Budgets.** Set a monthly spending limit per category and watch how much of it you have used. Budgets are scoped to a specific month and year.

**Goals.** Create savings goals with a target amount and optional target date, then add funds toward them over time. Goals track a completion percentage and can be marked done.

**Recurring transactions.** Define income or expenses that repeat daily, weekly, monthly, or yearly. Due items are turned into real transactions automatically, both on a nightly schedule and on demand whenever you open a page that reads your totals, so a recurring entry never goes missing from your balance.

**Loans.** Track money you lent out (which others owe you) and money you borrowed (which you owe). Each loan supports partial repayments, a due date, and one-click settlement. Loans are kept separate from your cash balance, but every loan and repayment posts a matching income or expense entry so your cash figure stays accurate. See [How Balances Work](#how-balances-work).

**Analytics.** Spending trends over time, category breakdowns, a spending heatmap, and a forecast based on your recent activity.

**Accounts and profile.** Email and password sign-up with JWT authentication and bcrypt password hashing. Editable profile, avatar, currency, and locale. An audit log records account actions.

**Experience.** Installable as a PWA with offline support, a dark and light theme, multi-currency display with Western digits, and a first-run onboarding flow.

## Tech Stack

**Backend**
- Node.js and Express
- MongoDB with Mongoose
- JSON Web Tokens for authentication
- bcryptjs for password hashing
- node-cron for scheduled jobs
- Nodemailer for email notifications
- helmet, express-rate-limit, and express-mongo-sanitize for security

**Frontend**
- Vanilla HTML, CSS, and JavaScript (no framework, no bundler)
- Chart.js for charts
- A service worker and web manifest for PWA support

## Project Structure

```
PoyshaGuni/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/               # Request handlers (one per resource)
│   │   ├── authController.js
│   │   ├── expenseController.js
│   │   ├── incomeController.js
│   │   ├── dashboardController.js
│   │   ├── budgetController.js
│   │   ├── goalController.js
│   │   ├── recurringController.js
│   │   ├── loanController.js
│   │   ├── analyticsController.js
│   │   ├── userController.js
│   │   └── auditController.js
│   ├── middleware/
│   │   ├── auth.js                # JWT verification (protect)
│   │   ├── validate.js            # express-validator rules
│   │   └── errorHandler.js        # Central error formatter
│   ├── models/                    # Mongoose schemas
│   │   ├── User.js
│   │   ├── Expense.js
│   │   ├── Income.js
│   │   ├── Budget.js
│   │   ├── Goal.js
│   │   ├── Recurring.js
│   │   ├── Loan.js
│   │   └── AuditLog.js
│   ├── routes/                    # Express routers (one per resource)
│   ├── utils/
│   │   ├── generateToken.js
│   │   ├── auditLog.js
│   │   ├── email.js               # Nodemailer transport and templates
│   │   ├── recurringProcessor.js  # Shared recurring materializer
│   │   └── cron.js                # Scheduled jobs
│   ├── server.js                  # App entry point
│   ├── package.json
└── frontend/
    ├── index.html                 # Landing page
    ├── login.html / signup.html
    ├── onboarding.html
    ├── dashboard.html
    ├── transactions.html
    ├── budgets.html
    ├── goals.html
    ├── recurring.html
    ├── loans.html
    ├── analytics.html
    ├── profile.html / settings.html
    ├── about.html / features.html / pricing.html
    ├── js/                        # One script per page, plus shared api.js
    ├── style/                     # Stylesheets
    ├── sw.js                      # Service worker
    └── manifest.json              # PWA manifest
```

## Getting Started

### Prerequisites

- Node.js version 18 or newer
- A MongoDB database, either a local install or a free MongoDB Atlas cluster

### 1. Clone and install

```bash
git clone https://github.com/your-username/PoyshaGuni.git
cd PoyshaGuni/backend
npm install
```

### 2. Configure the environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

At minimum you need a `MONGO_URI` and a `JWT_SECRET`. Generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

See [Environment Variables](#environment-variables) for the full list.

### 3. Start the backend

```bash
npm run dev     # development, restarts on file changes (nodemon)
npm start       # production
```

The API listens on `http://localhost:5000` by default. On startup you should see `PoyshaGuni server running on port 5000`.

### 4. Serve the frontend

The frontend is static, so any static server works. A common choice is the Live Server extension in VS Code, which serves on port 5500. Open `frontend/index.html` through that server rather than the `file://` protocol, since the API calls and service worker need an HTTP origin.

If you serve the frontend on a port other than 5500, update `FRONTEND_URL` in `.env` so email links point to the right place, and confirm the API base URL in `frontend/js/api.js` matches your backend.

## Environment Variables

All variables live in `backend/.env`. The file is listed in `.gitignore` and should never be committed.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Set to `production` to disable the dev cron startup log |
| `PORT` | No | `5000` | Port the API listens on |
| `FRONTEND_URL` | No | `http://localhost:5500` | Base URL used in email links |
| `MONGO_URI` | Yes | none | MongoDB connection string |
| `JWT_SECRET` | Yes | none | Secret used to sign JWTs |
| `JWT_EXPIRE` | No | none | Token lifetime, for example `7d` |
| `EMAIL_HOST` | No | `smtp.gmail.com` | SMTP host |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_USER` | No | placeholder | SMTP username. Leave as the placeholder to disable email |
| `EMAIL_PASS` | No | placeholder | SMTP password or app password |
| `EMAIL_FROM` | No | none | From address shown on outgoing mail |

Email is optional. If `EMAIL_USER` is left as the placeholder value, the app logs `[Email skipped]` and continues normally instead of failing.

## How Balances Work

PoyshaGuni shows two balance figures, and they answer different questions.

**Net Balance** is cumulative across all time. It is your total income minus your total expenses since the account was created. Money carries forward in this number: whatever you save in one month stays folded into it. This is your running cash position.

**Monthly Balance** covers the selected month only. It is that month's income minus that month's expenses, and it starts fresh each month. It does not carry an opening balance from the previous month.

When all of your transactions are in a single month, the two figures are equal. They separate once you have activity across more than one month. For example, if your Net Balance is 23,650 at the end of May and in June you earn 5,000 while spending 2,000, then June's Monthly Balance reads 3,000 while your Net Balance climbs to 26,650.

### Loans and cash

Loans are tracked apart from your Net Balance so they do not distort your cash position. The dashboard and transactions pages show three loan figures alongside the balance: *Owed To You*, *You Owe*, and *Net Loan Position*.

To keep cash accurate, loan activity posts matching ledger entries:

| Action | Cash effect | Ledger entry created |
|--------|-------------|----------------------|
| You lend money | Cash leaves you | Expense |
| You borrow money | Cash arrives | Income |
| A borrower repays you | Cash returns | Income |
| You repay a debt | Cash leaves you | Expense |

The creation entry and the repayment entry offset each other, so a loan that is fully repaid has no net effect on your cash, which is the correct outcome. If you delete a loan, any ledger entries it already created remain in your history.

## API Reference

The base path is `/api`. All routes except sign-up and login require a bearer token:

```
Authorization: Bearer <token>
```

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | `{ name, email, password }` | Create an account and return a token |
| POST | `/api/auth/login` | `{ email, password }` | Log in and return a token |
| GET | `/api/auth/me` | none | Get the current user |

### Expenses

| Method | Endpoint | Body / Query | Description |
|--------|----------|--------------|-------------|
| GET | `/api/expenses` | `?category=&month=&year=` | List expenses with optional filters |
| POST | `/api/expenses` | `{ title, amount, category, date, note? }` | Add an expense |
| PUT | `/api/expenses/:id` | partial fields | Update an expense |
| DELETE | `/api/expenses/:id` | none | Delete an expense |
| GET | `/api/expenses/export` | none | Download expenses as CSV |

### Income

| Method | Endpoint | Body / Query | Description |
|--------|----------|--------------|-------------|
| GET | `/api/income` | `?month=&year=` | List income with optional filters |
| POST | `/api/income` | `{ source, amount, date, note? }` | Add income |
| PUT | `/api/income/:id` | partial fields | Update income |
| DELETE | `/api/income/:id` | none | Delete income |
| GET | `/api/income/export` | none | Download income as CSV |

### Dashboard and Analytics

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/api/dashboard` | `?month=&year=` | Summary, balances, charts, recent items |
| GET | `/api/analytics` | `?month=&year=` | Trends, breakdowns, heatmap, forecast |

### Budgets

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/budgets` | `?month=&year=` | List budgets with amount spent |
| POST | `/api/budgets` | `{ category, limit, month, year }` | Create or update a budget |
| DELETE | `/api/budgets/:id` | none | Delete a budget |

### Goals

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/goals` | none | List goals |
| POST | `/api/goals` | `{ title, targetAmount, targetDate?, emoji?, note? }` | Create a goal |
| PUT | `/api/goals/:id` | partial fields | Update a goal |
| POST | `/api/goals/:id/add-funds` | `{ amount }` | Add funds toward a goal |
| DELETE | `/api/goals/:id` | none | Delete a goal |

### Recurring

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/recurring` | none | List recurring rules |
| GET | `/api/recurring/upcoming` | none | Items due in the next 30 days |
| POST | `/api/recurring` | `{ type, amount, frequency, startDate, endDate?, title?, category?, source?, note? }` | Create a rule |
| PUT | `/api/recurring/:id` | partial fields | Update a rule |
| PATCH | `/api/recurring/:id/toggle` | none | Pause or resume a rule |
| POST | `/api/recurring/process` | none | Process this user's due items now |
| POST | `/api/recurring/process-all` | none | Alias of `/process` |
| DELETE | `/api/recurring/:id` | none | Delete a rule |

Frequency options are `daily`, `weekly`, `monthly`, and `yearly`. Type options are `expense` and `income`. Due items are also materialized automatically whenever the dashboard, analytics, or transactions endpoints run, so totals stay current without waiting for the nightly job.

### Loans

| Method | Endpoint | Body / Query | Description |
|--------|----------|--------------|-------------|
| GET | `/api/loans` | `?direction=&status=` | List loans plus summary totals |
| GET | `/api/loans/summary` | none | Outstanding totals only |
| POST | `/api/loans` | `{ direction, counterparty, principal, date?, dueDate?, note? }` | Add a loan |
| PUT | `/api/loans/:id` | partial fields | Update a loan |
| POST | `/api/loans/:id/repay` | `{ amount, date?, note? }` | Record a partial repayment |
| PATCH | `/api/loans/:id/settle` | none | Mark a loan fully settled |
| DELETE | `/api/loans/:id` | none | Delete a loan |

Direction is `lent` (someone owes you) or `borrowed` (you owe). Status is `open` or `paid`.

### User and Account

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/user/profile` | none | Get profile |
| PUT | `/api/user/profile` | `{ name, ... }` | Update profile |
| DELETE | `/api/user/profile` | none | Delete account |
| PUT | `/api/user/avatar` | `{ avatar }` | Update avatar |
| DELETE | `/api/user/avatar` | none | Remove avatar |
| PUT | `/api/user/password` | `{ oldPassword, newPassword }` | Change password |
| PUT | `/api/user/currency` | `{ currency, symbol, locale }` | Change currency |
| POST | `/api/user/onboarding-complete` | none | Mark onboarding done |
| GET | `/api/user/audit-log` | `?limit=&skip=` | Get audit log entries |

### Example request

```bash
curl -X POST http://localhost:5000/api/loans \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "lent",
    "counterparty": "Parvez",
    "principal": 1200,
    "date": "2026-05-18",
    "note": "Emergency loan"
  }'
```

The response includes the new loan with `outstanding` and `repaidAmount` computed, and a matching expense of 1200 is created automatically.

## Data Models

### User
```javascript
{
  name, email (unique), password (bcrypt hashed),
  avatar, currency (default 'USD'), locale (default 'en-US'),
  createdAt, updatedAt
}
```

### Expense
```javascript
{
  userId, title, amount,
  category, // Food, Transport, Shopping, Bills, Healthcare, Entertainment, Education, Other
  date, note, createdAt, updatedAt
}
```

### Income
```javascript
{
  userId, source, amount, date, note, createdAt, updatedAt
}
```

### Budget
```javascript
{
  userId, category, limit, month (1-12), year,
  // spent is computed from expenses
  // unique index on (userId, category, month, year)
  createdAt, updatedAt
}
```

### Goal
```javascript
{
  userId, title, targetAmount, currentAmount (default 0),
  targetDate, emoji (default goal emoji), isCompleted (default false),
  note, createdAt, updatedAt
}
```

### Recurring
```javascript
{
  userId, type, // 'expense' or 'income'
  title, category,        // expense only
  source,                 // income only
  amount, frequency,      // daily, weekly, monthly, yearly
  startDate, endDate, nextDueDate, isActive, lastProcessed,
  note, createdAt, updatedAt
}
```

### Loan
```javascript
{
  userId, direction, // 'lent' or 'borrowed'
  counterparty, principal, date, dueDate,
  repayments: [ { amount, date, note } ],
  status, // 'open' or 'paid'
  note, createdAt, updatedAt,
  // virtuals: repaidAmount, outstanding
}
```

### Loan
```javascript
{
  userId, type, // 'expense' or 'income'
  title, category,        // expense only
  source,                 // income only
  amount, frequency,      // daily, weekly, monthly, yearly
  startDate, endDate, nextDueDate, isActive, lastProcessed,
  note, createdAt, updatedAt
}
```

### Loan
```javascript
{
  userId, direction, // 'lent' or 'borrowed'
  counterparty, principal, date, dueDate,
  repayments: [ { amount, date, note } ],
  status, // 'open' or 'paid'
  note, createdAt, updatedAt,
  // virtuals: repaidAmount, outstanding
}
```

### AuditLog
```javascript
{
  userId, action, detail, ip, userAgent, timestamp
}
```

## Background Jobs

A node-cron job runs nightly at 00:05 and processes every user's due recurring items, creating the matching income and expense entries and emailing a summary when email is configured. A weekly job sends a spending report.

The same processing logic lives in `utils/recurringProcessor.js` and is shared by the cron, the manual `/process` endpoint, and the on-demand catch-up that runs when the dashboard, analytics, or transactions endpoints are called. This means a recurring item is materialized the same way no matter what triggers it, and your totals are never stale.

## Security

- Passwords are hashed with bcrypt and never stored in plain text.
- Routes are protected with JWT verification middleware.
- `helmet` sets secure HTTP headers.
- `express-mongo-sanitize` strips operators that could be used for NoSQL injection.
- Rate limiting caps requests at 300 per 15 minutes overall, and 20 per 15 minutes on the auth routes.
- Request bodies are validated with express-validator before they reach the database.

## Troubleshooting

**"Route not found" on a feature that should exist.** The running server is using older code. Stop the server, confirm the relevant files are present in `backend`, then restart with `npm run dev`. New route files are only picked up on restart.

**The frontend shows old behavior after an update.** The service worker caches the frontend aggressively. Hard refresh with `Ctrl+Shift+R`, or open DevTools, go to Application, Service Workers, and unregister, then reload.

**Numbers display in a non-Western script.** Money is formatted with `Intl.NumberFormat` using `numberingSystem: 'latn'`, so digits render as `0-9` regardless of the chosen currency or locale. If you still see other scripts, you are likely running an older `frontend/js/api.js`. Replace it and hard refresh.

**The server will not start.** Check that `MONGO_URI` and `JWT_SECRET` are set in `.env`, and that MongoDB is reachable. Connection errors print to the console on startup.

**Email is not sending.** Email is disabled until you set real SMTP credentials. For Gmail, enable two-step verification and create an app password, then put it in `EMAIL_PASS`.

## License

MIT. You are free to use and modify this project.
