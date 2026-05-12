if (!requireAuth()) throw new Error();

let currentMonth = new Date().getMonth() + 1;
let currentYear  = new Date().getFullYear();
let data         = null;
const charts     = {};

const CHART_COLORS = ['#6366f1','#06b6d4','#f59e0b','#10b981','#ef4444','#8b5cf6','#f97316','#64748b'];
const CATEGORY_COLORS = {
    Food:'#f59e0b', Transport:'#06b6d4', Shopping:'#8b5cf6', Bills:'#ef4444',
    Healthcare:'#10b981', Entertainment:'#f97316', Education:'#6366f1', Other:'#64748b'
};

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('logoutBtn')?.addEventListener('click',       () => { clearAuth(); location.href='index.html'; });
    document.getElementById('logoutBtnMobile')?.addEventListener('click', () => { clearAuth(); location.href='index.html'; });

    setupMonthNav();
    await load();
});

// ── Month navigation ──────────────────────────────────────────────
const setupMonthNav = () => {
    const lbl = document.getElementById('monthLabel');
    const upd = () => lbl.textContent = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    upd();
    document.getElementById('prevMonth').addEventListener('click', async () => {
        currentMonth--; if (currentMonth < 1) { currentMonth = 12; currentYear--; } upd(); await load();
    });
    document.getElementById('nextMonth').addEventListener('click', async () => {
        currentMonth++; if (currentMonth > 12) { currentMonth = 1; currentYear++; } upd(); await load();
    });
};

// ── Load & render all ─────────────────────────────────────────────
const load = async () => {
    showLoading(true);
    try {
        const res = await apiFetch(`/analytics?month=${currentMonth}&year=${currentYear}`);
        data = res.data;
        renderSummaryCards();
        renderInsights();
        renderYoY();
        renderIncomeExpenseChart();
        renderSavingsRateChart();
        renderCategoryBreakdown();
        renderCategoryTrends();
        renderDailySpending();
        renderTopExpenses();
        renderIncomeSources();
        renderHeatmap();
    } catch (err) {
        showToast('Failed to load analytics: ' + err.message, 'error');
    } finally {
        showLoading(false);
    }
};

const showLoading = (on) => {
    document.querySelectorAll('.chart-card, .an-card').forEach(c => c.classList.toggle('loading', on));
};

// ── Summary cards ─────────────────────────────────────────────────
const renderSummaryCards = () => {
    const s = data.summary;
    setText('anNetWorth',       formatMoney(s.netWorth));
    setText('anSavingsRate',    s.savingsRate + '%');
    setText('anAvgDaily',       formatMoney(s.avgDailySpend));
    setText('anProjected',      formatMoney(s.projectedMonthEnd));
    setText('anCurIncome',      formatMoney(s.curIncome));
    setText('anCurExpenses',    formatMoney(s.curExpenses));

    // Color net worth
    const nwEl = document.getElementById('anNetWorth');
    if (nwEl) nwEl.style.color = s.netWorth >= 0 ? 'var(--success)' : 'var(--danger)';

    // Color savings rate
    const srEl = document.getElementById('anSavingsRate');
    if (srEl) srEl.style.color = s.savingsRate >= 20 ? 'var(--success)' : s.savingsRate > 0 ? '#f59e0b' : 'var(--danger)';

    // Projected vs income indicator
    const projEl = document.getElementById('anProjected');
    if (projEl) projEl.style.color = s.projectedMonthEnd > s.curIncome ? 'var(--danger)' : 'var(--success)';

    // Progress bar for projected
    const pct = s.curIncome > 0 ? Math.min((s.projectedMonthEnd / s.curIncome) * 100, 150) : 0;
    const bar = document.getElementById('projectedBar');
    if (bar) { bar.style.width = Math.min(pct, 100) + '%'; bar.style.background = pct > 100 ? '#ef4444' : '#6366f1'; }

    // Savings gauge
    const gauge = document.getElementById('savingsGauge');
    if (gauge) { gauge.style.width = Math.max(0, Math.min(s.savingsRate, 100)) + '%'; gauge.style.background = s.savingsRate >= 20 ? '#10b981' : s.savingsRate > 0 ? '#f59e0b' : '#ef4444'; }
};

// ── AI-style insights ─────────────────────────────────────────────
const renderInsights = () => {
    const container = document.getElementById('insightsList');
    if (!container || !data.insights?.length) { if (container) container.innerHTML = '<p class="no-data">Not enough data for insights yet. Add more transactions.</p>'; return; }
    const icons = { positive: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`, warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, danger: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`, info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>` };
    container.innerHTML = data.insights.map(i => `
        <div class="insight-item insight-${i.type}">
            <span class="insight-icon">${icons[i.type] || '💡'}</span>
            <p class="insight-text">${i.text}</p>
        </div>`).join('');
};

// ── Year-over-year ─────────────────────────────────────────────────
const renderYoY = () => {
    const y = data.yoy;
    setText('yoyExpThis',  formatMoney(y.thisYear.expenses));
    setText('yoyExpLast',  formatMoney(y.lastYear.expenses));
    setText('yoyIncThis',  formatMoney(y.thisYear.income));
    setText('yoyIncLast',  formatMoney(y.lastYear.income));
    setText('yoySavThis',  formatMoney(y.thisYear.savings));
    setText('yoySavLast',  formatMoney(y.lastYear.savings));

    const renderDiff = (id, diff) => {
        const el = document.getElementById(id);
        if (!el || diff === null) return;
        const up = diff > 0;
        el.textContent  = (up ? '▲' : '▼') + ' ' + Math.abs(diff) + '%';
        el.style.color  = id.includes('Inc') || id.includes('Sav') ? (up ? 'var(--success)' : 'var(--danger)') : (up ? 'var(--danger)' : 'var(--success)');
    };
    renderDiff('yoyExpDiff', y.expenseDiff);
    renderDiff('yoyIncDiff', y.incomeDiff);
    const savDiff = y.lastYear.savings !== 0 ? Math.round(((y.thisYear.savings - y.lastYear.savings) / Math.abs(y.lastYear.savings)) * 100) : null;
    renderDiff('yoySavDiff', savDiff);
};

// ── 12-month income vs expenses bar chart ─────────────────────────
const renderIncomeExpenseChart = () => {
    const ctx = document.getElementById('incExpChart');
    if (!ctx) return;
    destroyChart('incExp');
    charts.incExp = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.monthlyData.map(m => m.label),
            datasets: [
                { label: 'Income',   data: data.monthlyData.map(m => m.income),   backgroundColor: 'rgba(99,102,241,0.8)',  borderRadius: 5 },
                { label: 'Expenses', data: data.monthlyData.map(m => m.expenses), backgroundColor: 'rgba(6,182,212,0.8)',   borderRadius: 5 },
                { label: 'Savings',  data: data.monthlyData.map(m => m.savings),  backgroundColor: 'rgba(16,185,129,0.7)',  borderRadius: 5, type: 'line', fill: false, borderColor: '#10b981', pointRadius: 4, tension: 0.4 }
            ]
        },
        options: chartOpts({ title: '' })
    });
};

// ── Savings rate line chart (12 months) ───────────────────────────
const renderSavingsRateChart = () => {
    const ctx = document.getElementById('savingsRateChart');
    if (!ctx) return;
    destroyChart('savingsRate');
    const rates = data.monthlyData.map(m => m.savingsRate);
    charts.savingsRate = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.monthlyData.map(m => m.label),
            datasets: [{
                label: 'Savings Rate %',
                data: rates,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true, tension: 0.4, pointRadius: 5,
                pointBackgroundColor: rates.map(r => r >= 20 ? '#10b981' : r > 0 ? '#f59e0b' : '#ef4444')
            }, {
                label: '20% Target',
                data: Array(rates.length).fill(20),
                borderColor: '#10b981', borderDash: [6,4], borderWidth: 1.5,
                pointRadius: 0, fill: false
            }]
        },
        options: chartOpts({ yLabel: '%', tooltipSuffix: '%' })
    });
};

// ── Category donut ────────────────────────────────────────────────
const renderCategoryBreakdown = () => {
    const ctx = document.getElementById('catDonutChart');
    if (!ctx) return;
    destroyChart('catDonut');
    const entries = Object.entries(data.categoryBreakdown).sort((a, b) => b[1] - a[1]);
    if (!entries.length) { ctx.parentElement.innerHTML = '<p class="no-data">No expenses this month.</p>'; return; }
    charts.catDonut = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: entries.map(e => e[0]),
            datasets: [{ data: entries.map(e => e[1]), backgroundColor: entries.map(e => CATEGORY_COLORS[e[0]] || '#64748b'), borderWidth: 3, hoverOffset: 8 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: {
                legend: { position: 'right', labels: { font: { size: 12 }, padding: 14 } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatMoney(ctx.raw)} (${Math.round(ctx.parsed / entries.reduce((s,[,v])=>s+v,0) * 100)}%)` } }
            }
        }
    });
};

// ── Category trends stacked area ──────────────────────────────────
const renderCategoryTrends = () => {
    const ctx = document.getElementById('catTrendChart');
    if (!ctx) return;
    destroyChart('catTrend');
    const cats = Object.keys(data.activeCategoryTrends);
    if (!cats.length) { ctx.parentElement.innerHTML = '<p class="no-data">No category data yet.</p>'; return; }
    charts.catTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.categoryTrendLabels,
            datasets: cats.map((cat, i) => ({
                label: cat,
                data: data.activeCategoryTrends[cat],
                borderColor: CATEGORY_COLORS[cat] || CHART_COLORS[i % CHART_COLORS.length],
                backgroundColor: (CATEGORY_COLORS[cat] || CHART_COLORS[i % CHART_COLORS.length]) + '22',
                fill: true, tension: 0.4, pointRadius: 3
            }))
        },
        options: chartOpts({ stacked: true })
    });
};

// ── Daily spending bar chart ──────────────────────────────────────
const renderDailySpending = () => {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;
    destroyChart('daily');
    const today = data.summary.today;
    charts.daily = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.dailySpending.map(d => d.day),
            datasets: [{
                label: 'Daily Spend',
                data: data.dailySpending.map(d => d.amount),
                backgroundColor: data.dailySpending.map(d =>
                    d.day > today ? 'rgba(99,102,241,0.15)' :
                    d.amount > data.summary.avgDailySpend * 1.5 ? 'rgba(239,68,68,0.8)' : 'rgba(99,102,241,0.7)'
                ),
                borderRadius: 4
            }, {
                label: 'Avg/Day',
                data: data.dailySpending.map(() => data.summary.avgDailySpend),
                type: 'line', borderColor: '#f59e0b', borderDash: [5,4],
                borderWidth: 1.5, pointRadius: 0, fill: false
            }]
        },
        options: {
            ...chartOpts({}),
            scales: {
                x: { ticks: { font: { size: 10 }, maxTicksLimit: 15 } },
                y: { beginAtZero: true, ticks: { callback: v => '$' + v } }
            }
        }
    });
};

// ── Top 5 expenses table ──────────────────────────────────────────
const renderTopExpenses = () => {
    const tbody = document.getElementById('topExpensesBody');
    if (!tbody) return;
    if (!data.topExpenses.length) { tbody.innerHTML = '<tr><td colspan="4" class="no-data">No expenses this month.</td></tr>'; return; }
    tbody.innerHTML = data.topExpenses.map((e, i) => `
        <tr>
            <td><span class="top-rank">${i + 1}</span></td>
            <td><strong>${e.title}</strong></td>
            <td><span class="cat-badge">${e.category}</span></td>
            <td class="top-amount">${formatMoney(e.amount)}</td>
        </tr>`).join('');
};

// ── Income sources donut ──────────────────────────────────────────
const renderIncomeSources = () => {
    const ctx = document.getElementById('incomeSourcesChart');
    if (!ctx) return;
    destroyChart('incomeSources');
    const entries = Object.entries(data.incomeSources).sort((a, b) => b[1] - a[1]);
    if (!entries.length) { ctx.parentElement.innerHTML = '<p class="no-data">No income recorded this month.</p>'; return; }
    charts.incomeSources = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: entries.map(e => e[0]),
            datasets: [{ data: entries.map(e => e[1]), backgroundColor: CHART_COLORS.slice(0, entries.length), borderWidth: 3 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatMoney(ctx.raw)}` } }
            }
        }
    });
};

// ── Category heatmap (CSS-based) ──────────────────────────────────
const renderHeatmap = () => {
    const container = document.getElementById('heatmapGrid');
    if (!container) return;
    const cats = Object.keys(data.heatmap).filter(c => data.heatmap[c].some(v => v > 0));
    if (!cats.length) { container.innerHTML = '<p class="no-data">Not enough data for heatmap yet.</p>'; return; }

    // Find max value for color scaling
    const allVals = cats.flatMap(c => data.heatmap[c]);
    const maxVal  = Math.max(...allVals, 1);

    let html = `<div class="heatmap-table">
        <div class="heatmap-header">
            <div class="heatmap-cat-label"></div>
            ${data.heatmapLabels.map(l => `<div class="heatmap-month">${l}</div>`).join('')}
        </div>`;

    cats.forEach(cat => {
        html += `<div class="heatmap-row">
            <div class="heatmap-cat-label">${CATEGORY_ICONS[cat] || ''} ${cat}</div>
            ${data.heatmap[cat].map(v => {
                const intensity = v / maxVal;
                const bg = v === 0 ? 'transparent' : interpolateColor(intensity);
                const textColor = intensity > 0.5 ? 'white' : 'var(--text-dark)';
                return `<div class="heatmap-cell" style="background:${bg};color:${textColor}" title="${cat}: ${formatMoney(v)}">${v > 0 ? '$' + Math.round(v) : ''}</div>`;
            }).join('')}
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
};

const interpolateColor = (t) => {
    // light purple → deep purple
    const r = Math.round(199 + (79  - 199) * t);
    const g = Math.round(210 + (70  - 210) * t);
    const b = Math.round(254 + (229 - 254) * t);
    return `rgb(${r},${g},${b})`;
};

// ── Chart helpers ─────────────────────────────────────────────────
const chartOpts = ({ yLabel = '', tooltipSuffix = '', stacked = false } = {}) => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: { position: 'top', labels: { font: { size: 12 }, padding: 14 } },
        tooltip: {
            callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}${tooltipSuffix}`
            }
        }
    },
    scales: {
        x: { stacked, grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { stacked, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => yLabel === '%' ? v + '%' : '$' + v, font: { size: 11 } } }
    }
});

const destroyChart = (key) => { if (charts[key]) { charts[key].destroy(); delete charts[key]; } };
const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
