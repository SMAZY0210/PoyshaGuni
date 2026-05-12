const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    source: {
        type: String,
        required: [true, 'Source is required'],
        trim: true,
        maxlength: [100, 'Source cannot exceed 100 characters']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be positive']
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

module.exports = mongoose.model('Income', incomeSchema);
