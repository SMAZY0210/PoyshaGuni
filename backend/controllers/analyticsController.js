const Expense = require('../models/Expense');
const Income  = require('../models/Income');
const Loan    = require('../models/Loan');
const { processDueForUser } = require('../utils/recurringProcessor');

// Helpers
const monthRange = (year, month) => ({
    start: new Date(year, month - 1, 1),
    end:   new Date(year, month,     0, 23, 59, 59)
});

const sumBy = (arr, field = 'amount') => arr.reduce((s, x) => s + x[field], 0);

// Build N-month window ending at (year, month)
const buildMonthWindow = (year, month, n) => {
    const months = [];
    for (let i = n - 1; i >= 0; i--) {
        let m = month - i, y = year;
        while (m < 1)  { m += 12; y--; }
        while (m > 12) { m -= 12; y++; }
        months.push({ year: y, month: m });
    }
    return months;
};

// @desc  Full analytics payload
// @route GET /api/analytics?month=5&year=2026
// @access Private
const getAnalytics = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Materialize due recurring items so analytics reflect them too
        await processDueForUser(userId);

        const now    = new Date();
        const tMonth = parseInt(req.query.month) || now.getMonth() + 1;
        const tYear  = parseInt(req.query.year)  || now.getFullYear();

        // ── 1. All-time data (for net worth baseline) ──────────────────
        const [allExp, allInc] = await Promise.all([
            Expense.find({ userId }).lean(),
            Income.find({ userId }).lean()
        ]);
        const allTimeIncome   = sumBy(allInc);
        const allTimeExpenses = sumBy(allExp);
        // Net worth = cash only (income − expenses). Loans tracked separately.
        const netWorth        = allTimeIncome - allTimeExpenses;

        // Open loans shown as a separate balance, not mixed into net worth
        const openLoans = await Loan.find({ userId, status: 'open' }).lean();
        const owedToMe = openLoans
            .filter(l => l.direction === 'lent')
            .reduce((s, l) => s + Math.max(0, l.principal - (l.repayments || []).reduce((a, r) => a + (r.amount || 0), 0)), 0);
        const iOwe = openLoans
            .filter(l => l.direction === 'borrowed')
            .reduce((s, l) => s + Math.max(0, l.principal - (l.repayments || []).reduce((a, r) => a + (r.amount || 0), 0)), 0);
        const netLoanPosition = owedToMe - iOwe;

        // ── 2. Current month data ──────────────────────────────────────
        const { start: cStart, end: cEnd } = monthRange(tYear, tMonth);
        const [curExp, curInc] = await Promise.all([
            Expense.find({ userId, date: { $gte: cStart, $lte: cEnd } }).lean(),
            Income.find({ userId, date: { $gte: cStart, $lte: cEnd } }).lean()
        ]);
        const curExpTotal = sumBy(curExp);
        const curIncTotal = sumBy(curInc);
        const curBalance  = curIncTotal - curExpTotal;
        const savingsRate = curIncTotal > 0 ? Math.round(((curIncTotal - curExpTotal) / curIncTotal) * 100) : 0;

        // ── 3. 12-month window for trend charts ────────────────────────
        const window12 = buildMonthWindow(tYear, tMonth, 12);
        const monthlyData = await Promise.all(window12.map(async ({ year, month }) => {
            const { start, end } = monthRange(year, month);
            const [exp, inc] = await Promise.all([
                Expense.find({ userId, date: { $gte: start, $lte: end } }).lean(),
                Income.find({ userId, date: { $gte: start, $lte: end } }).lean()
            ]);
            const expTotal = sumBy(exp);
            const incTotal = sumBy(inc);
            return {
                label: new Date(year, month - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' }),
                month, year,
                income:   incTotal,
                expenses: expTotal,
                savings:  incTotal - expTotal,
                savingsRate: incTotal > 0 ? Math.round(((incTotal - expTotal) / incTotal) * 100) : 0
            };
        }));

        // ── 4. Year-over-year (current month vs same month last year) ──
        const prevYear = tYear - 1;
        const { start: pyStart, end: pyEnd } = monthRange(prevYear, tMonth);
        const [pyExp, pyInc] = await Promise.all([
            Expense.find({ userId, date: { $gte: pyStart, $lte: pyEnd } }).lean(),
            Income.find({ userId, date: { $gte: pyStart, $lte: pyEnd } }).lean()
        ]);
        const yoyExpenses = sumBy(pyExp);
        const yoyIncome   = sumBy(pyInc);
        const yoy = {
            label: new Date(prevYear, tMonth - 1).toLocaleString('en-US', { month: 'long' }),
            thisYear:  { income: curIncTotal,  expenses: curExpTotal,  savings: curBalance },
            lastYear:  { income: yoyIncome,    expenses: yoyExpenses,  savings: yoyIncome - yoyExpenses },
            expenseDiff: yoyExpenses > 0 ? Math.round(((curExpTotal - yoyExpenses) / yoyExpenses) * 100) : null,
            incomeDiff:  yoyIncome   > 0 ? Math.round(((curIncTotal - yoyIncome)   / yoyIncome)   * 100) : null
        };

        // ── 5. Category trends (12 months per category) ────────────────
        const CATEGORIES = ['Food','Transport','Shopping','Bills','Healthcare','Entertainment','Education','Other'];
        const categoryTrends = {};
        for (const cat of CATEGORIES) {
            categoryTrends[cat] = monthlyData.map(m => {
                const { start, end } = monthRange(m.year, m.month);
                return 0; // filled below in bulk
            });
        }
        // Bulk fill from already-fetched all-time data
        for (const cat of CATEGORIES) {
            categoryTrends[cat] = window12.map(({ year, month }) => {
                const { start, end } = monthRange(year, month);
                return allExp
                    .filter(e => e.category === cat && new Date(e.date) >= start && new Date(e.date) <= end)
                    .reduce((s, e) => s + e.amount, 0);
            });
        }

        // Only include categories that have at least one non-zero month
        const activeCategoryTrends = {};
        for (const cat of CATEGORIES) {
            if (categoryTrends[cat].some(v => v > 0)) activeCategoryTrends[cat] = categoryTrends[cat];
        }

        // ── 6. Category breakdown (current month) ─────────────────────
        const categoryBreakdown = {};
        curExp.forEach(e => { categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount; });

        // ── 7. Daily spending (current month) ─────────────────────────
        const daysInMonth = new Date(tYear, tMonth, 0).getDate();
        const today       = tMonth === now.getMonth() + 1 && tYear === now.getFullYear() ? now.getDate() : daysInMonth;
        const dailyMap    = {};
        curExp.forEach(e => {
            const d = new Date(e.date).getDate();
            dailyMap[d] = (dailyMap[d] || 0) + e.amount;
        });
        const dailySpending = Array.from({ length: daysInMonth }, (_, i) => ({
            day: i + 1,
            amount: dailyMap[i + 1] || 0
        }));
        const avgDailySpend   = today > 0 ? curExpTotal / today : 0;
        const projectedMonthEnd = avgDailySpend * daysInMonth;

        // Previous month for daily comparison
        let pmMonth = tMonth - 1, pmYear = tYear;
        if (pmMonth < 1) { pmMonth = 12; pmYear--; }
        const { start: pmStart, end: pmEnd } = monthRange(pmYear, pmMonth);
        const pmExpenses = await Expense.find({ userId, date: { $gte: pmStart, $lte: pmEnd } }).lean();
        const pmDaysInMonth = new Date(pmYear, pmMonth, 0).getDate();
        const pmAvgDaily = pmExpenses.length > 0 ? sumBy(pmExpenses) / pmDaysInMonth : 0;

        // ── 8. Top 5 transactions (current month) ─────────────────────
        const topExpenses = [...curExp].sort((a, b) => b.amount - a.amount).slice(0, 5);

        // ── 9. Income sources breakdown (current month) ───────────────
        const incomeSources = {};
        curInc.forEach(i => { incomeSources[i.source] = (incomeSources[i.source] || 0) + i.amount; });

        // ── 10. Spending heatmap — category × month (last 6 months) ───
        const window6 = window12.slice(6); // last 6 of the 12
        const heatmapLabels = window6.map(m => new Date(m.year, m.month - 1).toLocaleString('en-US', { month: 'short' }));
        const heatmap = {};
        for (const cat of CATEGORIES) {
            heatmap[cat] = window6.map(({ year, month }) => {
                const { start, end } = monthRange(year, month);
                return allExp
                    .filter(e => e.category === cat && new Date(e.date) >= start && new Date(e.date) <= end)
                    .reduce((s, e) => s + e.amount, 0);
            });
        }

        // ── 11. Insights (text, auto-generated) ───────────────────────
        const insights = generateInsights({
            savingsRate, curExpTotal, curIncTotal, avgDailySpend, pmAvgDaily,
            categoryBreakdown, yoy, monthlyData, projectedMonthEnd
        });

        res.json({
            success: true,
            data: {
                period: { month: tMonth, year: tYear },
                summary: {
                    allTimeIncome, allTimeExpenses, netWorth,
                    owedToMe, iOwe, netLoanPosition,
                    openLoanCount: openLoans.length,
                    curIncome: curIncTotal, curExpenses: curExpTotal,
                    curBalance, savingsRate,
                    avgDailySpend, projectedMonthEnd,
                    daysInMonth, today
                },
                yoy,
                monthlyData,
                categoryBreakdown,
                activeCategoryTrends,
                categoryTrendLabels: window12.map(m => new Date(m.year, m.month - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })),
                dailySpending,
                topExpenses,
                incomeSources,
                heatmap,
                heatmapLabels,
                insights
            }
        });
    } catch (err) { next(err); }
};

// Auto-generate plain-English insights
const generateInsights = ({ savingsRate, curExpTotal, curIncTotal, avgDailySpend, pmAvgDaily,
    categoryBreakdown, yoy, monthlyData, projectedMonthEnd }) => {
    const insights = [];

    // Savings rate
    if (savingsRate >= 20)  insights.push({ type: 'positive', text: `Great job! You're saving ${savingsRate}% of your income this month — above the recommended 20%.` });
    else if (savingsRate > 0) insights.push({ type: 'warning', text: `You're saving ${savingsRate}% of your income. Try to reach 20% by reducing discretionary spending.` });
    else if (curIncTotal > 0) insights.push({ type: 'danger',  text: `You're spending more than you earn this month. Consider reviewing your expenses.` });

    // Daily spending trend vs last month
    if (pmAvgDaily > 0) {
        const diff = Math.round(((avgDailySpend - pmAvgDaily) / pmAvgDaily) * 100);
        if (diff > 15)  insights.push({ type: 'warning',  text: `Your daily spending is up ${diff}% from last month (${formatInsightMoney(avgDailySpend)}/day vs ${formatInsightMoney(pmAvgDaily)}/day).` });
        else if (diff < -10) insights.push({ type: 'positive', text: `Daily spending is down ${Math.abs(diff)}% from last month — good progress!` });
    }

    // Projected month-end
    if (curIncTotal > 0 && projectedMonthEnd > curIncTotal) {
        insights.push({ type: 'danger', text: `At your current pace you'll spend ${formatInsightMoney(projectedMonthEnd)} this month, which exceeds your income of ${formatInsightMoney(curIncTotal)}.` });
    }

    // Top spending category
    const topCat = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
        const pct = curExpTotal > 0 ? Math.round((topCat[1] / curExpTotal) * 100) : 0;
        if (pct >= 40) insights.push({ type: 'info', text: `${topCat[0]} is your biggest expense this month at ${pct}% of total spending.` });
    }

    // YoY comparison
    if (yoy.expenseDiff !== null) {
        if (yoy.expenseDiff > 20)  insights.push({ type: 'warning',  text: `Expenses are ${yoy.expenseDiff}% higher than the same month last year.` });
        else if (yoy.expenseDiff < -10) insights.push({ type: 'positive', text: `Expenses are ${Math.abs(yoy.expenseDiff)}% lower than the same month last year — great improvement!` });
    }

    // 3-month expense trend
    const last3 = monthlyData.slice(-3).map(m => m.expenses);
    if (last3.length === 3 && last3[0] > 0) {
        const trend = last3[2] - last3[0];
        if (trend > 0 && (trend / last3[0]) > 0.15) insights.push({ type: 'warning', text: `Your expenses have been rising over the past 3 months. Consider reviewing recurring costs.` });
        else if (trend < 0 && (Math.abs(trend) / last3[0]) > 0.10) insights.push({ type: 'positive', text: `Your expenses have trended downward over the past 3 months.` });
    }

    return insights.slice(0, 5); // cap at 5
};

const formatInsightMoney = (n) => '$' + n.toFixed(2);

module.exports = { getAnalytics };
