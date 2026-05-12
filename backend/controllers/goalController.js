const Goal = require('../models/Goal');

const getGoals = async (req, res, next) => {
    try {
        const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: goals });
    } catch (err) { next(err); }
};

const addGoal = async (req, res, next) => {
    try {
        const { title, targetAmount, targetDate, emoji, note } = req.body;
        if (!title || !targetAmount) return res.status(400).json({ success: false, message: 'Title and target amount required.' });
        const goal = await Goal.create({ userId: req.user._id, title, targetAmount, targetDate, emoji, note });
        res.status(201).json({ success: true, message: 'Goal created.', data: goal });
    } catch (err) { next(err); }
};

const updateGoal = async (req, res, next) => {
    try {
        const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
        if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
        const updated = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json({ success: true, message: 'Goal updated.', data: updated });
    } catch (err) { next(err); }
};

const addFunds = async (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required.' });
        const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
        if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
        goal.currentAmount = Math.min(goal.currentAmount + parseFloat(amount), goal.targetAmount);
        if (goal.currentAmount >= goal.targetAmount) goal.isCompleted = true;
        await goal.save();
        res.json({ success: true, message: 'Funds added.', data: goal });
    } catch (err) { next(err); }
};

const deleteGoal = async (req, res, next) => {
    try {
        const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
        res.json({ success: true, message: 'Goal deleted.' });
    } catch (err) { next(err); }
};

module.exports = { getGoals, addGoal, updateGoal, addFunds, deleteGoal };
