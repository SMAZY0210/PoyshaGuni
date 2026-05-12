const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const sendEmail = async ({ to, subject, html }) => {
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
        console.log(`[Email skipped - not configured] To: ${to} | Subject: ${subject}`);
        return;
    }
    try {
        const transporter = createTransporter();
        await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
        console.log(`Email sent to ${to}`);
    } catch (err) {
        console.error('Email error:', err.message);
    }
};

const emailTemplates = {
    welcome: (name) => ({
        subject: 'Welcome to FinTrack! 🎉',
        html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:32px;background:#f8fafc;border-radius:16px">
            <h1 style="color:#4f46e5;margin-bottom:8px">Welcome, ${name}!</h1>
            <p style="color:#6b7280">Your FinTrack account is ready. Start tracking your finances and take control of your money.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5500'}/dashboard.html" 
               style="display:inline-block;background:linear-gradient(135deg,#6366f1,#06b6d4);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">
               Open Dashboard →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">© 2026 FinTrack</p>
        </div>`
    }),

    recurringDue: (name, items) => ({
        subject: `FinTrack: ${items.length} recurring transaction(s) due`,
        html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:32px;background:#f8fafc;border-radius:16px">
            <h2 style="color:#4f46e5">Recurring Transactions Due</h2>
            <p style="color:#6b7280">Hi ${name}, the following are due today:</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px">
                ${items.map(i => `<tr style="border-bottom:1px solid #e5e7eb">
                    <td style="padding:10px;color:#1f2937">${i.type === 'expense' ? i.title : i.source}</td>
                    <td style="padding:10px;color:#6b7280">${i.frequency}</td>
                    <td style="padding:10px;font-weight:600;color:${i.type === 'expense' ? '#ef4444' : '#10b981'}">
                        ${i.type === 'expense' ? '-' : '+'}$${i.amount.toFixed(2)}
                    </td>
                </tr>`).join('')}
            </table>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5500'}/recurring.html"
               style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">
               Process Now →
            </a>
        </div>`
    }),

    budgetAlert: (name, category, percent, limit, currency) => ({
        subject: `FinTrack: ${category} budget at ${percent}%`,
        html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:32px;background:#f8fafc;border-radius:16px">
            <h2 style="color:${percent >= 100 ? '#ef4444' : '#f59e0b'}">${percent >= 100 ? '🚨 Budget Exceeded!' : '⚠️ Budget Warning'}</h2>
            <p style="color:#6b7280">Hi ${name}, your <strong>${category}</strong> spending is at <strong>${percent}%</strong> of your ${currency}${limit.toFixed(2)} limit.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5500'}/budgets.html"
               style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">
               View Budgets →
            </a>
        </div>`
    }),

    weeklyReport: (name, data, currency) => ({
        subject: `FinTrack Weekly Report — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:32px;background:#f8fafc;border-radius:16px">
            <h2 style="color:#4f46e5">Your Weekly Summary</h2>
            <p style="color:#6b7280">Hi ${name}, here's how you did this week:</p>
            <div style="display:flex;gap:16px;margin-top:16px">
                <div style="flex:1;background:white;padding:16px;border-radius:12px;text-align:center">
                    <div style="color:#10b981;font-size:22px;font-weight:700">${currency}${data.income.toFixed(2)}</div>
                    <div style="color:#6b7280;font-size:12px">Income</div>
                </div>
                <div style="flex:1;background:white;padding:16px;border-radius:12px;text-align:center">
                    <div style="color:#ef4444;font-size:22px;font-weight:700">${currency}${data.expenses.toFixed(2)}</div>
                    <div style="color:#6b7280;font-size:12px">Expenses</div>
                </div>
                <div style="flex:1;background:white;padding:16px;border-radius:12px;text-align:center">
                    <div style="color:${data.balance >= 0 ? '#10b981' : '#ef4444'};font-size:22px;font-weight:700">${currency}${data.balance.toFixed(2)}</div>
                    <div style="color:#6b7280;font-size:12px">Balance</div>
                </div>
            </div>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5500'}/dashboard.html"
               style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:20px">
               View Dashboard →
            </a>
        </div>`
    })
};

module.exports = { sendEmail, emailTemplates };
