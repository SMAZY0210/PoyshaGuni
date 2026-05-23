const Recurring = require('../models/Recurring');
const Expense = require('../models/Expense');
const Income = require('../models/Income');

// Compute the next due date for a given frequency
const computeNextDue = (frequency, fromDate) => {
    const d = new Date(fromDate);
    switch (frequency) {
        case 'daily':   d.setDate(d.getDate() + 1); break;
        case 'weekly':  d.setDate(d.getDate() + 7); break;
        case 'monthly': d.setMonth(d.getMonth() + 1); break;
        case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
    }
    return d;
};

// Materialize all due recurring items for a single user into real
// Income/Expense documents. This is the single source of truth used by
// the on-demand processor (controller), the page loaders (dashboard/
// analytics/transactions), and the nightly cron — so behaviour is
// always identical no matter what triggers it.
//
// A recurring item can be "behind" by several periods (e.g. a daily item
// that hasn't been processed for a week), so we loop until nextDueDate
// catches up to now. A safety cap prevents runaway loops on bad data.
const processDueForUser = async (userId, notePrefix = '[Recurring]') => {
    const now = new Date();

    const dueItems = await Recurring.find({
        userId,
        isActive: true,
        nextDueDate: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $gte: now } }]
    });

    const created = [];
    const SAFETY_CAP = 366; // never create more than ~1 year of catch-up entries per item

    for (const item of dueItems) {
        let guard = 0;

        while (
            item.isActive &&
            item.nextDueDate <= now &&
            (!item.endDate || item.nextDueDate <= item.endDate) &&
            guard < SAFETY_CAP
        ) {
            if (item.type === 'expense') {
                const exp = await Expense.create({
                    userId,
                    title: item.title,
                    amount: item.amount,
                    category: item.category || 'Other',
                    date: item.nextDueDate,
                    note: item.note ? `${notePrefix} ${item.note}` : notePrefix
                });
                created.push({ type: 'expense', data: exp });
            } else {
                const inc = await Income.create({
                    userId,
                    source: item.source,
                    amount: item.amount,
                    date: item.nextDueDate,
                    note: item.note ? `${notePrefix} ${item.note}` : notePrefix
                });
                created.push({ type: 'income', data: inc });
            }

            item.lastProcessed = item.nextDueDate;
            item.nextDueDate = computeNextDue(item.frequency, item.nextDueDate);

            if (item.endDate && item.nextDueDate > item.endDate) {
                item.isActive = false;
            }
            guard++;
        }

        await item.save();
    }

    return created;
};

module.exports = { processDueForUser, computeNextDue };
