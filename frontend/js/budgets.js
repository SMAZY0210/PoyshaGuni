if (!requireAuth()) throw new Error();
const user = getUser();
let currentMonth = new Date().getMonth() + 1;
let currentYear  = new Date().getFullYear();
let allBudgets   = [];

const EDIT_SVG  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const TRASH_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;

document.addEventListener('DOMContentLoaded', async () => {
    setupNav(); await loadBudgets(); setupModal();
});

const setupNav = () => {
    const ml = document.getElementById('monthLabel');
    const updateLabel = () => { ml.textContent = new Date(currentYear, currentMonth-1).toLocaleString('en-US',{month:'long',year:'numeric'}); };
    updateLabel();
    document.getElementById('prevMonth').addEventListener('click', async () => { currentMonth--; if(currentMonth<1){currentMonth=12;currentYear--;} updateLabel(); await loadBudgets(); });
    document.getElementById('nextMonth').addEventListener('click', async () => { currentMonth++; if(currentMonth>12){currentMonth=1;currentYear++;} updateLabel(); await loadBudgets(); });
    document.getElementById('logoutBtn')?.addEventListener('click', () => { clearAuth(); window.location.href='index.html'; });
};

const loadBudgets = async () => {
    try {
        const res = await apiFetch(`/budgets?month=${currentMonth}&year=${currentYear}`);
        allBudgets = res.data;
        render();
    } catch(err) { showToast(err.message,'error'); }
};

const render = () => {
    const grid = document.getElementById('budgetGrid');
    const empty = document.getElementById('emptyBudgets');
    if (allBudgets.length === 0) { grid.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display = 'none';
    grid.innerHTML = allBudgets.map(b => {
        const pct = Math.min(b.percent, 100);
        const color = b.percent >= 100 ? 'var(--rose)' : b.percent >= 80 ? 'var(--amber)' : 'var(--emerald)';
        const statusLabel = b.percent >= 100 ? 'Over budget' : b.percent >= 80 ? 'Near limit' : 'On track';
        const statusClass = b.percent >= 100 ? 'over' : b.percent >= 80 ? 'warning' : 'ok';
        return `<div class="budget-card ${b.percent >= 100 ? 'over' : b.percent >= 80 ? 'warning' : ''}">
            <div class="budget-card-top">
                <div class="budget-cat-info">
                    <span class="budget-icon">${getCatIcon(b.category, 20)}</span>
                    <div>
                        <div class="budget-cat-name">${b.category}</div>
                        <div class="budget-status" style="color:${color}">${statusLabel}</div>
                    </div>
                </div>
                <button class="icon-btn delete" onclick="deleteBudget('${b._id}')">${TRASH_SVG}</button>
            </div>
            <div class="budget-amounts">
                <span class="budget-spent">${formatMoney(b.spent)} spent</span>
                <span class="budget-limit">of ${formatMoney(b.limit)}</span>
            </div>
            <div class="budget-track">
                <div class="budget-fill" style="width:${pct}%;background:${color}"></div>
            </div>
            <div class="budget-pct" style="color:${color}">${b.percent}%</div>
        </div>`;
    }).join('');
};

const setupModal = () => {
    document.getElementById('addBudgetBtn').addEventListener('click', () => {
        document.getElementById('budgetModal').classList.add('open');
        document.getElementById('budgetForm').reset();
        const sel = document.getElementById('budgetCatField');
        sel.innerHTML = CATEGORIES.filter(c => !allBudgets.find(b=>b.category===c)).map(c=>`<option value="${c}">${c}</option>`).join('');
    });
    document.getElementById('closeBudgetModal').addEventListener('click', closeModal);
    document.getElementById('cancelBudgetBtn').addEventListener('click', closeModal);
    document.getElementById('budgetModal').addEventListener('click', e => { if(e.target.id==='budgetModal') closeModal(); });
    document.getElementById('budgetForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Saving...';
        try {
            await apiFetch('/budgets', { method:'POST', body: JSON.stringify({
                category: document.getElementById('budgetCatField').value,
                limit: parseFloat(document.getElementById('budgetLimitField').value),
                month: currentMonth, year: currentYear
            })});
            showToast('Budget set!'); closeModal(); await loadBudgets();
        } catch(err) { showToast(err.message,'error'); }
        finally { btn.disabled=false; btn.textContent='Save Budget'; }
    });
};

const closeModal = () => document.getElementById('budgetModal').classList.remove('open');

const deleteBudget = async (id) => {
    if (!confirm('Remove this budget?')) return;
    try { await apiFetch(`/budgets/${id}`,{method:'DELETE'}); showToast('Budget removed.'); await loadBudgets(); }
    catch(err) { showToast(err.message,'error'); }
};
window.deleteBudget = deleteBudget;
