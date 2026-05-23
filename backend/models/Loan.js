const mongoose = require('mongoose');

// A single repayment entry against a loan
const repaymentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Repayment amount must be positive']
    },
    date: {
        type: Date,
        default: Date.now
    },
    note: {
        type: String,
        trim: true,
        maxlength: [200, 'Note cannot exceed 200 characters']
    }
}, { _id: true });

const loanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // 'lent'     = I gave money to someone → they owe me  (an ASSET)
    // 'borrowed' = I took money from someone → I owe them (a LIABILITY)
    direction: {
        type: String,
        enum: ['lent', 'borrowed'],
        required: [true, 'Loan direction is required']
    },
    // The other party in the loan (person/bank/etc.)
    counterparty: {
        type: String,
        required: [true, 'Counterparty name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    // Original principal amount of the loan
    principal: {
        type: Number,
        required: [true, 'Loan amount is required'],
        min: [0.01, 'Amount must be positive']
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now
    },
    // Optional date the loan is expected to be settled by
    dueDate: {
        type: Date,
        default: null
    },
    // List of partial repayments made against this loan
    repayments: {
        type: [repaymentSchema],
        default: []
    },
    // open = still outstanding, paid = fully settled
    status: {
        type: String,
        enum: ['open', 'paid'],
        default: 'open'
    },
    note: {
        type: String,
        trim: true,
        maxlength: [200, 'Note cannot exceed 200 characters']
    }
}, { timestamps: true });

// Virtual: how much has been repaid so far
loanSchema.virtual('repaidAmount').get(function () {
    return (this.repayments || []).reduce((s, r) => s + (r.amount || 0), 0);
});

// Virtual: how much is still outstanding
loanSchema.virtual('outstanding').get(function () {
    const repaid = (this.repayments || []).reduce((s, r) => s + (r.amount || 0), 0);
    return Math.max(0, this.principal - repaid);
});

// Make virtuals show up in JSON/object output so the frontend can use them
loanSchema.set('toJSON', { virtuals: true });
loanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Loan', loanSchema);
