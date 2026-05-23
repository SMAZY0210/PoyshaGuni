// Protect this page
if (!requireAuth()) throw new Error('Not authenticated');

const user = getUser();
let barChart = null;
let donutChart = null;
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Set user name
    document.querySelectorAll('.user-name').forEach(el => el.textContent = user.name);

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        clearAuth();
        window.location.href = 'index.html';
    });

    await loadDashboard();
    setupMonthNav();
});

const setupMonthNav = () => {
    const monthLabel = document.getElementById('monthLabel');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    const updateLabel = () => {
        const d = new Date(currentYear, currentMonth - 1);
        monthLabel.textContent = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    updateLabel();

    prevBtn?.addEventListener('click', async () => {
        currentMonth--;
        if (currentMonth < 1) { currentMonth = 12; currentYear--; }
        updateLabel();
        await loadDashboard();
    });

    nextBtn?.addEventListener('click', async () => {
        currentMonth++;
        if (currentMonth > 12) { currentMonth = 1; currentYear++; }
        updateLabel();
        await loadDashboard();
    });
};

const loadDashboard = async () => {
    try {
        showSkeleton(true);
        const data = await apiFetch(`/dashboard?month=${currentMonth}&year=${currentYear}`);
        const { summary, monthly, categoryBreakdown, monthlySummary, recentExpenses, recentIncome } = data.data;

        // Summary cards
        document.getElementById('totalBalance').textContent = formatMoney(summary.balance);
        document.getElementById('totalIncome').textContent = formatMoney(summary.totalIncome);
        document.getElementById('totalExpenses').textContent = formatMoney(summary.totalExpenses);
        document.getElementById('monthlyBalance').textContent = formatMoney(monthly.balance);

        // Balance color (net wealth, incl. loans)
        const balEl = document.getElementById('totalBalance');
        balEl.style.color = summary.balance >= 0 ? '#10b981' : '#ef4444';

        // Loan breakdown (only render if those elements exist on the page)
        renderLoanSummary(summary);

        // Charts
        renderBarChart(monthlySummary);
        renderDonutChart(categoryBreakdown);

        // Recent transactions
        renderRecentTransactions(recentExpenses, recentIncome);

        showSkeleton(false);
    } catch (err) {
        showToast('Failed to load dashboard: ' + err.message, 'error');
        showSkeleton(false);
    }
};

// Render the loan portion of the dashboard summary
const renderLoanSummary = (summary) => {
    const owedEl = document.getElementById('owedToMe');
    if (owedEl) owedEl.textContent = formatMoney(summary.owedToMe || 0);

    const oweEl = document.getElementById('iOwe');
    if (oweEl) oweEl.textContent = formatMoney(summary.iOwe || 0);

    const netEl = document.getElementById('netLoanPosition');
    if (netEl) {
        const net = summary.netLoanPosition || 0;
        netEl.textContent = formatMoney(net);
        netEl.style.color = net >= 0 ? '#10b981' : '#ef4444';
    }

    // Sub-text under the balance card — loans are separate, so just hint at them
    const note = document.getElementById('balanceLoanNote');
    if (note) {
        if (summary.openLoanCount > 0) {
            note.textContent = `${summary.openLoanCount} open loan${summary.openLoanCount > 1 ? 's' : ''} tracked separately`;
            note.style.display = 'block';
        } else {
            note.style.display = 'none';
        }
    }
};

const renderBarChart = (data) => {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    if (barChart) barChart.destroy();

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.month),
            datasets: [
                {
                    label: 'Income',
                    data: data.map(d => d.income),
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderRadius: 6
                },
                {
                    label: 'Expenses',
                    data: data.map(d => d.expenses),
                    backgroundColor: 'rgba(6, 182, 212, 0.8)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: val => '$' + val }
                }
            }
        }
    });
};

const renderDonutChart = (breakdown) => {
    const ctx = document.getElementById('donutChart');
    if (!ctx) return;

    if (donutChart) donutChart.destroy();

    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);

    if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<p class="no-data">No expenses this month</p>';
        return;
    }

    const colors = ['#6366f1','#06b6d4','#f59e0b','#10b981','#ef4444','#8b5cf6','#f97316','#6b7280'];

    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${formatMoney(ctx.raw)}`
                    }
                }
            }
        }
    });
};

const renderRecentTransactions = (expenses, income) => {
    const container = document.getElementById('recentTransactions');
    if (!container) return;

    // Combine and sort by date
    const all = [
        ...expenses.map(e => ({ ...e, type: 'expense' })),
        ...income.map(i => ({ ...i, type: 'income', title: i.source }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

    if (all.length === 0) {
        container.innerHTML = '<p class="no-data">No transactions yet. <a href="transactions.html">Add one!</a></p>';
        return;
    }

    container.innerHTML = all.map(t => `
        <div class="transaction-item">
            <div class="txn-icon ${t.type}">
                ${t.type === 'expense' ? getCatIcon(t.category) : "<svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"23 6 13.5 15.5 8.5 10.5 1 18\"/><polyline points=\"17 6 23 6 23 12\"/></svg>"}
            </div>
            <div class="txn-details">
                <p class="txn-title">${t.title}</p>
                <p class="txn-meta">${t.type === 'expense' ? t.category : 'Income'} · ${formatDate(t.date)}</p>
            </div>
            <div class="txn-amount ${t.type}">
                ${t.type === 'expense' ? '-' : '+'}${formatMoney(t.amount)}
            </div>
        </div>
    `).join('');
};

const showSkeleton = (show) => {
    document.querySelectorAll('.skeleton').forEach(el => {
        el.style.display = show ? 'block' : 'none';
    });
    document.querySelectorAll('.stat-value').forEach(el => {
        el.style.visibility = show ? 'hidden' : 'visible';
    });
};
