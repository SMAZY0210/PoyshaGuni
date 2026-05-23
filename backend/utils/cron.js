const cron = require('node-cron');
const Recurring = require('../models/Recurring');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('./email');
const { processDueForUser } = require('./recurringProcessor');

// Runs daily at 00:05 — auto-processes due recurring transactions
const startRecurringCron = () => {
    cron.schedule('5 0 * * *', async () => {
        console.log('[CRON] Processing recurring transactions...');
        try {
            // Find which users have due items so we only notify those
            const now = new Date();
            const dueItems = await Recurring.find({
                isActive: true,
                nextDueDate: { $lte: now },
                $or: [{ endDate: null }, { endDate: { $gte: now } }]
            }).select('userId');

            const userIds = [...new Set(dueItems.map(i => i.userId.toString()))];

            for (const userId of userIds) {
                const user = await User.findById(userId);
                if (!user) continue;

                // Use the shared processor so cron and on-demand behave identically
                const created = await processDueForUser(userId, '[Auto]');

                if (created.length > 0) {
                    const processed = created.map(c => c.data);
                    const { subject, html } = emailTemplates.recurringDue(user.name, processed);
                    await sendEmail({ to: user.email, subject, html });
                }
            }
            console.log(`[CRON] Processed recurring for ${userIds.length} user(s)`);
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
