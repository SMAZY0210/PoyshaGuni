const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../utils/email');

// @route GET /api/budgets?month=5&year=2026
const getBudgets = async (req, res, next) => {
    try {
        const now = new Date();
        const month = parseInt(req.query.month) || now.getMonth() + 1;
        const year  = parseInt(req.query.year)  || now.getFullYear();

        const budgets = await Budget.find({ userId: req.user._id, month, year });

        // Fetch actual spending per category for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate   = new Date(year, month, 0, 23, 59, 59);
        const expenses  = await Expense.find({ userId: req.user._id, date: { $gte: startDate, $lte: endDate } });

        const spending = {};
        expenses.forEach(e => { spending[e.category] = (spending[e.category] || 0) + e.amount; });

        const data = budgets.map(b => ({
            ...b.toObject(),
            spent: spending[b.category] || 0,
            percent: Math.round(((spending[b.category] || 0) / b.limit) * 100)
        }));

        res.json({ success: true, data, month, year });
    } catch (err) { next(err); }
};

// @route POST /api/budgets
const setBudget = async (req, res, next) => {
    try {
        const { category, limit, month, year } = req.body;

        const budget = await Budget.findOneAndUpdate(
            { userId: req.user._id, category, month, year },
            { limit },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(201).json({ success: true, message: 'Budget saved.', data: budget });
    } catch (err) { next(err); }
};

// @route DELETE /api/budgets/:id
const deleteBudget = async (req, res, next) => {
    try {
        const b = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!b) return res.status(404).json({ success: false, message: 'Budget not found.' });
        res.json({ success: true, message: 'Budget deleted.' });
    } catch (err) { next(err); }
};

// Called after adding an expense — checks budget and sends alert if needed
const checkBudgetAlert = async (userId, category, month, year) => {
    try {
        const budget = await Budget.findOne({ userId, category, month, year });
        if (!budget) return;

        const startDate = new Date(year, month - 1, 1);
        const endDate   = new Date(year, month, 0, 23, 59, 59);
        const expenses  = await Expense.find({ userId, category, date: { $gte: startDate, $lte: endDate } });
        const spent     = expenses.reduce((s, e) => s + e.amount, 0);
        const percent   = Math.round((spent / budget.limit) * 100);

        if (percent >= 80) {
            const user = await User.findById(userId);
            if (user) {
                const { subject, html } = emailTemplates.budgetAlert(
                    user.name, category, percent, budget.limit, user.currencySymbol || '$'
                );
                await sendEmail({ to: user.email, subject, html });
            }
        }
    } catch (err) { console.error('Budget alert error:', err.message); }
};

module.exports = { getBudgets, setBudget, deleteBudget, checkBudgetAlert };
