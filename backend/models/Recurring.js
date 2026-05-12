const mongoose = require('mongoose');

const recurringSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['expense', 'income'],
        required: true
    },
    // Expense fields
    title: {
        type: String,
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    category: {
        type: String,
        enum: ['Food', 'Transport', 'Shopping', 'Bills', 'Healthcare', 'Entertainment', 'Education', 'Other', null],
        default: null
    },
    // Income fields
    source: {
        type: String,
        trim: true,
        maxlength: [100, 'Source cannot exceed 100 characters']
    },
    // Shared fields
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be positive']
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        required: [true, 'Frequency is required']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        default: null   // null = no end date
    },
    nextDueDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    note: {
        type: String,
        trim: true,
        maxlength: [200, 'Note cannot exceed 200 characters']
    },
    lastProcessed: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Compute next due date based on frequency
recurringSchema.methods.computeNextDue = function (fromDate) {
    const d = new Date(fromDate);
    switch (this.frequency) {
        case 'daily':   d.setDate(d.getDate() + 1); break;
        case 'weekly':  d.setDate(d.getDate() + 7); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
    }
    return d;
};

module.exports = mongoose.model('Recurring', recurringSchema);
