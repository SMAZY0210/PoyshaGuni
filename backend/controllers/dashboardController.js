const Expense = require('../models/Expense');
const Income = require('../models/Income');

// @desc    Get dashboard summary
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { month, year } = req.query;

        const now = new Date();
        const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
        const targetYear = year ? parseInt(year) : now.getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
        const dateFilter = { $gte: startDate, $lte: endDate };

        // Total income & expenses (all time)
        const allExpenses = await Expense.find({ userId });
        const allIncome = await Income.find({ userId });
        const totalIncome = allIncome.reduce((s, i) => s + i.amount, 0);
        const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);
        const balance = totalIncome - totalExpenses;

        // Monthly income & expenses
        const monthlyExpenses = await Expense.find({ userId, date: dateFilter });
        const monthlyIncome = await Income.find({ userId, date: dateFilter });
        const monthlyTotalIncome = monthlyIncome.reduce((s, i) => s + i.amount, 0);
        const monthlyTotalExpenses = monthlyExpenses.reduce((s, e) => s + e.amount, 0);

        // Category breakdown for expenses (current month)
        const categoryBreakdown = {};
        monthlyExpenses.forEach(e => {
            categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
        });

        // Monthly summary for chart (last 6 months)
        const monthlySummary = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(targetYear, targetMonth - 1 - i, 1);
            const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

            const mExp = await Expense.find({ userId, date: { $gte: mStart, $lte: mEnd } });
            const mInc = await Income.find({ userId, date: { $gte: mStart, $lte: mEnd } });

            monthlySummary.push({
                month: d.toLocaleString('default', { month: 'short' }),
                year: d.getFullYear(),
                income: mInc.reduce((s, i) => s + i.amount, 0),
                expenses: mExp.reduce((s, e) => s + e.amount, 0)
            });
        }

        // Recent transactions (last 5 each)
        const recentExpenses = await Expense.find({ userId }).sort({ date: -1 }).limit(5);
        const recentIncome = await Income.find({ userId }).sort({ date: -1 }).limit(5);

        res.json({
            success: true,
            data: {
                summary: { totalIncome, totalExpenses, balance },
                monthly: {
                    month: targetMonth,
                    year: targetYear,
                    income: monthlyTotalIncome,
                    expenses: monthlyTotalExpenses,
                    balance: monthlyTotalIncome - monthlyTotalExpenses
                },
                categoryBreakdown,
                monthlySummary,
                recentExpenses,
                recentIncome
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getDashboard };
