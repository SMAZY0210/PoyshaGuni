const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    targetAmount: { type: Number, required: true, min: 0.01 },
    currentAmount: { type: Number, default: 0, min: 0 },
    targetDate: { type: Date, default: null },
    emoji: { type: String, default: '🎯', maxlength: 10 },
    isCompleted: { type: Boolean, default: false },
    note: { type: String, trim: true, maxlength: 200 }
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
