const Loan = require('../models/Loan');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const { log } = require('../utils/auditLog');

// Recompute and persist a loan's status based on repayments vs principal
const syncStatus = (loan) => {
    const repaid = (loan.repayments || []).reduce((s, r) => s + (r.amount || 0), 0);
    loan.status = repaid >= loan.principal ? 'paid' : 'open';
    return loan;
};

// When a repayment happens, mirror it into the cash ledger:
//  - A 'lent' loan being repaid → money comes back to me → INCOME
//  - A 'borrowed' loan being repaid → money goes out → EXPENSE
// The matching transaction is tagged [Loan] so it's easy to identify.
const createRepaymentTransaction = async (loan, amount, date) => {
    const when = date ? new Date(date) : new Date();
    if (loan.direction === 'lent') {
        await Income.create({
            userId: loan.userId,
            source: `Loan repayment — ${loan.counterparty}`,
            amount,
            date: when,
            note: '[Loan] Repayment received'
        });
    } else {
        await Expense.create({
            userId: loan.userId,
            title: `Loan repayment — ${loan.counterparty}`,
            amount,
            category: 'Other',
            date: when,
            note: '[Loan] Repayment paid'
        });
    }
};

// When a loan is created, mirror the cash movement so the cash balance
// stays accurate (this cancels out against the repayment transactions):
//  - Lending money → cash leaves me now → EXPENSE
//  - Borrowing money → cash arrives now → INCOME
const createLoanOpenTransaction = async (loan) => {
    const when = loan.date ? new Date(loan.date) : new Date();
    if (loan.direction === 'lent') {
        await Expense.create({
            userId: loan.userId,
            title: `Loan given — ${loan.counterparty}`,
            amount: loan.principal,
            category: 'Other',
            date: when,
            note: '[Loan] Money lent out'
        });
    } else {
        await Income.create({
            userId: loan.userId,
            source: `Loan received — ${loan.counterparty}`,
            amount: loan.principal,
            date: when,
            note: '[Loan] Money borrowed'
        });
    }
};

// @desc    Get all loans (optionally filter by direction or status)
// @route   GET /api/loans
// @access  Private
const getLoans = async (req, res, next) => {
    try {
        const { direction, status } = req.query;
        const filter = { userId: req.user._id };
        if (direction) filter.direction = direction;
        if (status) filter.status = status;

        const loans = await Loan.find(filter).sort({ createdAt: -1 });

        // Build summary totals for "wealth with me" calculations
        const open = loans.filter(l => l.status === 'open');
        const owedToMe = open
            .filter(l => l.direction === 'lent')
            .reduce((s, l) => s + l.outstanding, 0);
        const iOwe = open
            .filter(l => l.direction === 'borrowed')
            .reduce((s, l) => s + l.outstanding, 0);

        res.json({
            success: true,
            count: loans.length,
            summary: {
                owedToMe,                  // outstanding money others owe me (asset)
                iOwe,                      // outstanding money I owe others (liability)
                netLoanPosition: owedToMe - iOwe
            },
            data: loans
        });
    } catch (err) { next(err); }
};

// @desc    Get loan summary only (used by dashboard / transactions)
// @route   GET /api/loans/summary
// @access  Private
const getLoanSummary = async (req, res, next) => {
    try {
        const loans = await Loan.find({ userId: req.user._id, status: 'open' });
        const owedToMe = loans
            .filter(l => l.direction === 'lent')
            .reduce((s, l) => s + l.outstanding, 0);
        const iOwe = loans
            .filter(l => l.direction === 'borrowed')
            .reduce((s, l) => s + l.outstanding, 0);

        res.json({
            success: true,
            data: {
                owedToMe,
                iOwe,
                netLoanPosition: owedToMe - iOwe,
                openCount: loans.length
            }
        });
    } catch (err) { next(err); }
};

// @desc    Add a loan
// @route   POST /api/loans
// @access  Private
const addLoan = async (req, res, next) => {
    try {
        const { direction, counterparty, principal, date, dueDate, note } = req.body;

        if (!direction || !['lent', 'borrowed'].includes(direction)) {
            return res.status(400).json({ success: false, message: 'Direction must be "lent" or "borrowed".' });
        }
        if (!counterparty || !counterparty.trim()) {
            return res.status(400).json({ success: false, message: 'Counterparty name is required.' });
        }
        if (!principal || principal <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
        }

        const loan = await Loan.create({
            userId: req.user._id,
            direction,
            counterparty: counterparty.trim(),
            principal,
            date: date ? new Date(date) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            note
        });

        log(req.user._id, 'loan_add', `${direction} ${counterparty} — ${principal}`, req);

        // Mirror the cash movement at loan creation
        await createLoanOpenTransaction(loan);

        res.status(201).json({ success: true, message: 'Loan added.', data: loan });
    } catch (err) { next(err); }
};

// @desc    Update a loan's core fields
// @route   PUT /api/loans/:id
// @access  Private
const updateLoan = async (req, res, next) => {
    try {
        const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found.' });

        const { direction, counterparty, principal, date, dueDate, note } = req.body;
        if (direction !== undefined) loan.direction = direction;
        if (counterparty !== undefined) loan.counterparty = counterparty;
        if (principal !== undefined) loan.principal = principal;
        if (date !== undefined) loan.date = date ? new Date(date) : loan.date;
        if (dueDate !== undefined) loan.dueDate = dueDate ? new Date(dueDate) : null;
        if (note !== undefined) loan.note = note;

        syncStatus(loan);
        await loan.save();

        log(req.user._id, 'loan_update', req.params.id, req);
        res.json({ success: true, message: 'Loan updated.', data: loan });
    } catch (err) { next(err); }
};

// @desc    Record a repayment against a loan
// @route   POST /api/loans/:id/repay
// @access  Private
const repayLoan = async (req, res, next) => {
    try {
        const { amount, date, note } = req.body;
        const repayAmount = parseFloat(amount);

        if (!repayAmount || repayAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Repayment amount must be positive.' });
        }

        const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found.' });

        if (repayAmount > loan.outstanding + 0.001) {
            return res.status(400).json({
                success: false,
                message: `Repayment exceeds the outstanding balance of ${loan.outstanding.toFixed(2)}.`
            });
        }

        loan.repayments.push({
            amount: repayAmount,
            date: date ? new Date(date) : new Date(),
            note
        });
        syncStatus(loan);
        await loan.save();

        // Mirror the repayment into the cash ledger (income or expense)
        await createRepaymentTransaction(loan, repayAmount, date);

        log(req.user._id, 'loan_repay', `${req.params.id} — ${repayAmount}`, req);
        res.json({
            success: true,
            message: loan.status === 'paid' ? 'Loan fully repaid.' : 'Repayment recorded.',
            data: loan
        });
    } catch (err) { next(err); }
};

// @desc    Mark a loan fully settled in one click
// @route   PATCH /api/loans/:id/settle
// @access  Private
const settleLoan = async (req, res, next) => {
    try {
        const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found.' });

        const remaining = loan.outstanding;
        if (remaining > 0) {
            loan.repayments.push({ amount: remaining, date: new Date(), note: 'Marked as settled' });
        }
        loan.status = 'paid';
        await loan.save();

        // Mirror the final settlement into the cash ledger
        if (remaining > 0) {
            await createRepaymentTransaction(loan, remaining, new Date());
        }

        log(req.user._id, 'loan_settle', req.params.id, req);
        res.json({ success: true, message: 'Loan marked as settled.', data: loan });
    } catch (err) { next(err); }
};

// @desc    Delete a loan
// @route   DELETE /api/loans/:id
// @access  Private
const deleteLoan = async (req, res, next) => {
    try {
        const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
        if (!loan) return res.status(404).json({ success: false, message: 'Loan not found.' });

        await loan.deleteOne();
        log(req.user._id, 'loan_delete', req.params.id, req);
        res.json({ success: true, message: 'Loan deleted.' });
    } catch (err) { next(err); }
};

module.exports = {
    getLoans, getLoanSummary, addLoan, updateLoan,
    repayLoan, settleLoan, deleteLoan
};
