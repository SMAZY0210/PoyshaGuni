const Expense = require('../models/Expense');
const { checkBudgetAlert } = require('./budgetController');
const { log } = require('../utils/auditLog');

const getExpenses = async (req, res, next) => {
    try {
        const { category, month, year, search, page = 1, limit = 20, all } = req.query;
        let filter = { userId: req.user._id };

        if (category && category !== 'All') filter.category = category;
        if (month && year) {
            filter.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
        } else if (year) {
            filter.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };
        }
        if (search) filter.title = { $regex: search, $options: 'i' };

        if (all === 'true') {
            const expenses = await Expense.find(filter).sort({ date: -1 });
            return res.json({ success: true, count: expenses.length, total: expenses.reduce((s,e)=>s+e.amount,0), data: expenses });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [expenses, total] = await Promise.all([
            Expense.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
            Expense.countDocuments(filter)
        ]);
        const sum = expenses.reduce((s, e) => s + e.amount, 0);

        res.json({ success: true, count: expenses.length, total: sum, data: expenses, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), totalDocs: total });
    } catch (err) { next(err); }
};

const addExpense = async (req, res, next) => {
    try {
        const { title, amount, category, date, note } = req.body;
        const expense = await Expense.create({ userId: req.user._id, title, amount, category, date, note });

        // Async budget check (non-blocking)
        const d = new Date(date);
        checkBudgetAlert(req.user._id, category, d.getMonth() + 1, d.getFullYear()).catch(() => {});
        log(req.user._id, 'expense_add', `${title} — $${amount}`, req);

        res.status(201).json({ success: true, message: 'Expense added.', data: expense });
    } catch (err) { next(err); }
};

const updateExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
        const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        log(req.user._id, 'expense_update', req.params.id, req);
        res.json({ success: true, message: 'Expense updated.', data: updated });
    } catch (err) { next(err); }
};

const deleteExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
        await expense.deleteOne();
        log(req.user._id, 'expense_delete', req.params.id, req);
        res.json({ success: true, message: 'Expense deleted.' });
    } catch (err) { next(err); }
};

// CSV export
const exportExpensesCSV = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        let filter = { userId: req.user._id };
        if (month && year) filter.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
        const expenses = await Expense.find(filter).sort({ date: -1 });

        const rows = [['Date','Title','Category','Amount','Note']];
        expenses.forEach(e => rows.push([
            new Date(e.date).toLocaleDateString(),
            `"${e.title}"`, e.category, e.amount.toFixed(2), `"${e.note || ''}"`
        ]));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
        res.send(rows.map(r => r.join(',')).join('\n'));
    } catch (err) { next(err); }
};

module.exports = { getExpenses, addExpense, updateExpense, deleteExpense, exportExpensesCSV };
