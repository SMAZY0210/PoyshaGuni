const Income = require('../models/Income');
const { log } = require('../utils/auditLog');

const getIncome = async (req, res, next) => {
    try {
        const { month, year, search, page = 1, limit = 20, all } = req.query;
        let filter = { userId: req.user._id };
        if (month && year) filter.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
        else if (year) filter.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };
        if (search) filter.source = { $regex: search, $options: 'i' };

        if (all === 'true') {
            const income = await Income.find(filter).sort({ date: -1 });
            return res.json({ success: true, count: income.length, total: income.reduce((s,i)=>s+i.amount,0), data: income });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [income, totalDocs] = await Promise.all([
            Income.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
            Income.countDocuments(filter)
        ]);

        res.json({ success: true, count: income.length, total: income.reduce((s,i)=>s+i.amount,0), data: income, page: parseInt(page), pages: Math.ceil(totalDocs / parseInt(limit)), totalDocs });
    } catch (err) { next(err); }
};

const addIncome = async (req, res, next) => {
    try {
        const { source, amount, date, note } = req.body;
        const income = await Income.create({ userId: req.user._id, source, amount, date, note });
        log(req.user._id, 'income_add', `${source} — $${amount}`, req);
        res.status(201).json({ success: true, message: 'Income added.', data: income });
    } catch (err) { next(err); }
};

const updateIncome = async (req, res, next) => {
    try {
        const income = await Income.findOne({ _id: req.params.id, userId: req.user._id });
        if (!income) return res.status(404).json({ success: false, message: 'Income not found.' });
        const updated = await Income.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        log(req.user._id, 'income_update', req.params.id, req);
        res.json({ success: true, message: 'Income updated.', data: updated });
    } catch (err) { next(err); }
};

const deleteIncome = async (req, res, next) => {
    try {
        const income = await Income.findOne({ _id: req.params.id, userId: req.user._id });
        if (!income) return res.status(404).json({ success: false, message: 'Income not found.' });
        await income.deleteOne();
        log(req.user._id, 'income_delete', req.params.id, req);
        res.json({ success: true, message: 'Income deleted.' });
    } catch (err) { next(err); }
};

const exportIncomeCSV = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        let filter = { userId: req.user._id };
        if (month && year) filter.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
        const income = await Income.find(filter).sort({ date: -1 });
        const rows = [['Date','Source','Amount','Note']];
        income.forEach(i => rows.push([new Date(i.date).toLocaleDateString('en-US'), `"${i.source}"`, i.amount.toFixed(2), `"${i.note || ''}"`]));
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="income.csv"');
        res.send(rows.map(r => r.join(',')).join('\n'));
    } catch (err) { next(err); }
};

module.exports = { getIncome, addIncome, updateIncome, deleteIncome, exportIncomeCSV };
