const Recurring = require('../models/Recurring');
const { processDueForUser, computeNextDue } = require('../utils/recurringProcessor');

// @desc    Get all recurring transactions
// @route   GET /api/recurring
// @access  Private
const getRecurring = async (req, res, next) => {
    try {
        const { type } = req.query;
        const filter = { userId: req.user._id };
        if (type) filter.type = type;

        const items = await Recurring.find(filter).sort({ nextDueDate: 1 });
        res.json({ success: true, count: items.length, data: items });
    } catch (err) {
        next(err);
    }
};

// @desc    Add recurring transaction
// @route   POST /api/recurring
// @access  Private
const addRecurring = async (req, res, next) => {
    try {
        const { type, title, source, category, amount, frequency, startDate, endDate, note } = req.body;

        if (type === 'expense' && !title) {
            return res.status(400).json({ success: false, message: 'Title is required for expense.' });
        }
        if (type === 'income' && !source) {
            return res.status(400).json({ success: false, message: 'Source is required for income.' });
        }

        const item = await Recurring.create({
            userId: req.user._id,
            type, title, source, category, amount, frequency,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            nextDueDate: new Date(startDate),
            note
        });

        res.status(201).json({ success: true, message: 'Recurring transaction created.', data: item });
    } catch (err) {
        next(err);
    }
};

// @desc    Update recurring transaction
// @route   PUT /api/recurring/:id
// @access  Private
const updateRecurring = async (req, res, next) => {
    try {
        const item = await Recurring.findOne({ _id: req.params.id, userId: req.user._id });
        if (!item) return res.status(404).json({ success: false, message: 'Recurring transaction not found.' });

        const updated = await Recurring.findByIdAndUpdate(req.params.id, req.body, {
            new: true, runValidators: true
        });
        res.json({ success: true, message: 'Updated.', data: updated });
    } catch (err) {
        next(err);
    }
};

// @desc    Toggle active/pause
// @route   PATCH /api/recurring/:id/toggle
// @access  Private
const toggleRecurring = async (req, res, next) => {
    try {
        const item = await Recurring.findOne({ _id: req.params.id, userId: req.user._id });
        if (!item) return res.status(404).json({ success: false, message: 'Not found.' });

        item.isActive = !item.isActive;
        await item.save();

        res.json({
            success: true,
            message: `Recurring transaction ${item.isActive ? 'resumed' : 'paused'}.`,
            data: item
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete recurring transaction
// @route   DELETE /api/recurring/:id
// @access  Private
const deleteRecurring = async (req, res, next) => {
    try {
        const item = await Recurring.findOne({ _id: req.params.id, userId: req.user._id });
        if (!item) return res.status(404).json({ success: false, message: 'Not found.' });

        await item.deleteOne();
        res.json({ success: true, message: 'Deleted.' });
    } catch (err) {
        next(err);
    }
};

// @desc    Process due recurring transactions — creates actual expense/income entries
// @route   POST /api/recurring/process
// @access  Private
const processRecurring = async (req, res, next) => {
    try {
        const created = await processDueForUser(req.user._id);
        res.json({
            success: true,
            message: `Processed ${created.length} recurring transaction(s).`,
            processed: created.length,
            data: created
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get upcoming due recurring items (next 30 days)
// @route   GET /api/recurring/upcoming
// @access  Private
const getUpcoming = async (req, res, next) => {
    try {
        const now = new Date();
        const in30 = new Date();
        in30.setDate(in30.getDate() + 30);

        const items = await Recurring.find({
            userId: req.user._id,
            isActive: true,
            nextDueDate: { $gte: now, $lte: in30 }
        }).sort({ nextDueDate: 1 });

        res.json({ success: true, count: items.length, data: items });
    } catch (err) {
        next(err);
    }
};

module.exports = { getRecurring, addRecurring, updateRecurring, toggleRecurring, deleteRecurring, processRecurring, processAllRecurring: processRecurring, getUpcoming };
