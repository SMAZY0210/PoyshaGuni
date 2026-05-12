const cron = require('node-cron');
const Recurring = require('../models/Recurring');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('./email');

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

// Runs daily at 00:05 — auto-processes due recurring transactions
const startRecurringCron = () => {
    cron.schedule('5 0 * * *', async () => {
        console.log('[CRON] Processing recurring transactions...');
        try {
            const now = new Date();
            const dueItems = await Recurring.find({
                isActive: true,
                nextDueDate: { $lte: now },
                $or: [{ endDate: null }, { endDate: { $gte: now } }]
            });

            // Group by user
            const byUser = {};
            for (const item of dueItems) {
                const uid = item.userId.toString();
                if (!byUser[uid]) byUser[uid] = [];
                byUser[uid].push(item);
            }

            for (const [userId, items] of Object.entries(byUser)) {
                const user = await User.findById(userId);
                if (!user) continue;

                const processed = [];
                for (const item of items) {
                    if (item.type === 'expense') {
                        await Expense.create({
                            userId, title: item.title, amount: item.amount,
                            category: item.category || 'Other',
                            date: item.nextDueDate, note: `[Auto] ${item.note || ''}`
                        });
                    } else {
                        await Income.create({
                            userId, source: item.source, amount: item.amount,
                            date: item.nextDueDate, note: `[Auto] ${item.note || ''}`
                        });
                    }
                    item.lastProcessed = item.nextDueDate;
                    item.nextDueDate = computeNextDue(item.frequency, item.nextDueDate);
                    if (item.endDate && item.nextDueDate > item.endDate) item.isActive = false;
                    await item.save();
                    processed.push(item);
                }

                if (processed.length > 0) {
                    const { subject, html } = emailTemplates.recurringDue(user.name, processed);
                    await sendEmail({ to: user.email, subject, html });
                }
            }
            console.log(`[CRON] Processed recurring for ${Object.keys(byUser).length} user(s)`);
        } catch (err) {
            console.error('[CRON] Recurring error:', err.message);
        }
    });
};

// Runs every Sunday at 08:00 — sends weekly summary email
const startWeeklyReportCron = () => {
    cron.schedule('0 8 * * 0', async () => {
        console.log('[CRON] Sending weekly reports...');
        try {
            const users = await User.find({});
            const now = new Date();
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

            for (const user of users) {
                const [expenses, income] = await Promise.all([
                    Expense.find({ userId: user._id, date: { $gte: weekAgo, $lte: now } }),
                    Income.find({ userId: user._id, date: { $gte: weekAgo, $lte: now } })
                ]);
                const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
                const totalInc = income.reduce((s, i) => s + i.amount, 0);

                if (totalExp === 0 && totalInc === 0) continue; // skip inactive users

                const { subject, html } = emailTemplates.weeklyReport(
                    user.name, { income: totalInc, expenses: totalExp, balance: totalInc - totalExp },
                    user.currencySymbol || '$'
                );
                await sendEmail({ to: user.email, subject, html });
            }
        } catch (err) {
            console.error('[CRON] Weekly report error:', err.message);
        }
    });
};

const startAllCrons = () => {
    startRecurringCron();
    startWeeklyReportCron();
    console.log('⏰ Cron jobs started');
};

module.exports = { startAllCrons };
