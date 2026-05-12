if (!requireAuth()) throw new Error();
let goals = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('logoutBtn')?.addEventListener('click', () => { clearAuth(); window.location.href='index.html'; });
    document.getElementById('logoutBtnMobile')?.addEventListener('click', () => { clearAuth(); window.location.href='index.html'; });
    await loadGoals(); setupModal(); setupFundsModal();
});

const loadGoals = async () => {
    try { const res = await apiFetch('/goals'); goals = res.data; render(); }
    catch(err) { showToast(err.message,'error'); }
};

const render = () => {
    const grid = document.getElementById('goalsGrid');
    const empty = document.getElementById('emptyGoals');
    if (goals.length === 0) { grid.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display = 'none';
    grid.innerHTML = goals.map(g => {
        const pct = Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100);
        const remaining = Math.max(g.targetAmount - g.currentAmount, 0);
        const daysLeft = g.targetDate ? Math.ceil((new Date(g.targetDate) - new Date()) / 86400000) : null;
        const color = g.isCompleted ? 'var(--emerald)' : daysLeft !== null && daysLeft < 0 ? 'var(--rose)' : daysLeft !== null && daysLeft < 30 ? 'var(--amber)' : 'var(--emerald)';
        const statusLabel = g.isCompleted ? 'Completed' : daysLeft !== null && daysLeft < 0 ? 'Overdue' : daysLeft !== null && daysLeft < 30 ? 'Soon' : 'On track';
        const statusClass = g.isCompleted ? 'completed' : daysLeft !== null && daysLeft < 0 ? 'overdue' : daysLeft !== null && daysLeft < 30 ? 'warning' : 'ok';
        return `<div class="goal-card ${statusClass}">
            <div class="goal-card-top">
                <div class="goal-info">
                    <span class="goal-emoji">${g.emoji || '🎯'}</span>
                    <div>
                        <div class="goal-name">${g.title}</div>
                        <div class="goal-status" style="color:${color}">${statusLabel}</div>
                    </div>
                </div>
                <button class="icon-btn delete" onclick="deleteGoal('${g._id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
            </div>
            <div class="goal-amounts">
                <span class="goal-current">${formatMoney(g.currentAmount)} saved</span>
                <span class="goal-target">of ${formatMoney(g.targetAmount)}</span>
            </div>
            <div class="goal-track">
                <div class="goal-fill" style="width:${pct}%;background:${color}"></div>
            </div>
            <div class="goal-footer">
                <span class="goal-pct" style="color:${color}">${pct}%</span>
                ${!g.isCompleted ? `<button class="btn-add-funds" onclick="openFundsModal('${g._id}','${g.title}',${remaining})">+ Add Funds</button>` : ''}
            </div>
        </div>`;
    }).join('');
};

let editingGoalId = null;
const setupModal = () => {
    document.getElementById('addGoalBtn').addEventListener('click', () => { editingGoalId=null; document.getElementById('goalForm').reset(); document.getElementById('goalModal').classList.add('open'); });
    document.getElementById('closeGoalModal').addEventListener('click', () => document.getElementById('goalModal').classList.remove('open'));
    document.getElementById('cancelGoalBtn').addEventListener('click', () => document.getElementById('goalModal').classList.remove('open'));
    document.getElementById('goalModal').addEventListener('click', e => { if(e.target.id==='goalModal') document.getElementById('goalModal').classList.remove('open'); });
    document.getElementById('goalForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled=true; btn.textContent='Saving...';
        try {
            const body = {
                title: document.getElementById('goalTitle').value,
                targetAmount: parseFloat(document.getElementById('goalTarget').value),
                targetDate: document.getElementById('goalDate').value || null,
                emoji: document.getElementById('goalEmoji').value || '★',
                note: document.getElementById('goalNote').value
            };
            await apiFetch('/goals',{method:'POST',body:JSON.stringify(body)});
            showToast('Goal created!'); document.getElementById('goalModal').classList.remove('open'); await loadGoals();
        } catch(err) { showToast(err.message,'error'); }
        finally { btn.disabled=false; btn.textContent='Create Goal'; }
    });
};

let fundsGoalId = null;
const setupFundsModal = () => {
    document.getElementById('closeFundsModal').addEventListener('click', () => document.getElementById('fundsModal').classList.remove('open'));
    document.getElementById('cancelFundsBtn').addEventListener('click', () => document.getElementById('fundsModal').classList.remove('open'));
    document.getElementById('fundsForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled=true; btn.textContent='Adding...';
        try {
            await apiFetch(`/goals/${fundsGoalId}/add-funds`,{method:'POST',body:JSON.stringify({amount:parseFloat(document.getElementById('fundsAmount').value)})});
            showToast('Funds added!'); document.getElementById('fundsModal').classList.remove('open'); await loadGoals();
        } catch(err) { showToast(err.message,'error'); }
        finally { btn.disabled=false; btn.textContent='Add Funds'; }
    });
};

const openFundsModal = (id, title, remaining) => {
    fundsGoalId = id;
    document.getElementById('fundsGoalTitle').textContent = title;
    document.getElementById('fundsRemaining').textContent = `${formatMoney(remaining)} remaining`;
    document.getElementById('fundsAmount').value = '';
    document.getElementById('fundsAmount').max = remaining;
    document.getElementById('fundsModal').classList.add('open');
};

const deleteGoal = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try { await apiFetch(`/goals/${id}`,{method:'DELETE'}); showToast('Goal deleted.'); await loadGoals(); }
    catch(err) { showToast(err.message,'error'); }
};
window.openFundsModal = openFundsModal;
window.deleteGoal = deleteGoal;
