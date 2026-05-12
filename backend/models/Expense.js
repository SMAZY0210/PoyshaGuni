const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be positive']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Food', 'Transport', 'Shopping', 'Bills', 'Healthcare', 'Entertainment', 'Education', 'Other'],
        default: 'Other'
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now
    },
    note: {
        type: String,
        trim: true,
        maxlength: [200, 'Note cannot exceed 200 characters']
    }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
