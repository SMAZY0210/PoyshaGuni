// ── Loans Page ────────────────────────────────────────────────────
// Auth handled inside DOMContentLoaded so api.js loads first.

let currentUser = null;
let allLoans = [];
let editingId = null;     // loan being edited (add/edit modal)
let repayingId = null;    // loan being repaid (repay modal)

document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = getUser();

    document.querySelectorAll('.user-name').forEach(el => el.textContent = currentUser.name);
    updateNavAvatars(currentUser);

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        clearAuth();
        window.location.href = 'index.html';
    });

    setupModals();
    setupFilters();
    await loadAll();
});

// ── Data ──────────────────────────────────────────────────────────
const loadAll = async () => {
    try {
        showLoading(true);
        const res = await apiFetch('/loans');
        allLoans = Array.isArray(res?.data) ? res.data : [];
        renderSummary(res?.summary || {});
        renderList(allLoans);
        renderDueSoon(allLoans);
        showLoading(false);
    } catch (err) {
        showToast('Failed to load loans: ' + err.message, 'error');
        showLoading(false);
    }
};

const outstandingOf = (loan) => {
    const repaid = (loan.repayments || []).reduce((s, r) => s + (r.amount || 0), 0);
    return Math.max(0, (loan.principal || 0) - repaid);
};

const renderSummary = (summary) => {
    const owed = summary.owedToMe || 0;
    const owe = summary.iOwe || 0;
    const net = summary.netLoanPosition ?? (owed - owe);
    const openCount = allLoans.filter(l => l.status === 'open').length;

    document.getElementById('loanOwedToMe').textContent = formatMoney(owed);
    document.getElementById('loanIOwe').textContent = formatMoney(owe);
    document.getElementById('loanOpenCount').textContent = openCount;

    const netEl = document.getElementById('loanNet');
    netEl.textContent = formatMoney(net);
    netEl.style.color = net >= 0 ? '#10b981' : '#ef4444';
};

// ── Filters ───────────────────────────────────────────────────────
const setupFilters = () => {
    document.querySelectorAll('.rec-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rec-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            let filtered = allLoans;
            if (f === 'open' || f === 'paid') filtered = allLoans.filter(l => l.status === f);
            else if (f === 'lent' || f === 'borrowed') filtered = allLoans.filter(l => l.direction === f);
            renderList(filtered);
        });
    });
};

// ── Render list ───────────────────────────────────────────────────
const renderList = (items) => {
    const container = document.getElementById('loanList');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <p>No loans here yet.</p>
            <button class="btn-primary" onclick="openAddModal()">+ Add Loan</button>
        </div>`;
        return;
    }

    container.innerHTML = items.map(loan => {
        const out = outstandingOf(loan);
        const repaid = (loan.principal || 0) - out;
        const pct = loan.principal > 0 ? Math.min(100, Math.round((repaid / loan.principal) * 100)) : 0;
        const isLent = loan.direction === 'lent';
        const isOverdue = loan.status === 'open' && loan.dueDate && new Date(loan.dueDate) < new Date();

        return `
        <div class="rec-item ${loan.status === 'paid' ? 'paused' : ''}">
            <div class="rec-icon ${isLent ? 'income' : 'expense'}">
                ${isLent
                    ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`
                    : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`}
            </div>
            <div class="rec-info">
                <p class="rec-title">${loan.counterparty || 'Unknown'}</p>
                <p class="rec-meta">
                    <span class="freq-badge" style="background:${isLent ? '#10b98120' : '#ef444420'};color:${isLent ? '#10b981' : '#ef4444'}">${isLent ? 'Lent out' : 'Borrowed'}</span>
                    ${loan.status === 'paid' ? `<span class="cat-badge">Settled</span>` : ''}
                    ${loan.dueDate ? `<span class="${isOverdue ? 'due-soon' : ''}">Due: ${formatDate(loan.dueDate)}</span>` : ''}
                    ${loan.note ? `· ${loan.note}` : ''}
                </p>
                ${loan.status === 'open' ? `
                <div class="loan-progress">
                    <div class="loan-progress-bar"><div class="loan-progress-fill" style="width:${pct}%;background:${isLent ? '#10b981' : '#ef4444'}"></div></div>
                    <span class="loan-progress-text">${formatMoney(out)} left of ${formatMoney(loan.principal)}</span>
                </div>` : `<div class="loan-progress"><span class="loan-progress-text">Fully repaid · ${formatMoney(loan.principal)}</span></div>`}
            </div>
            <div class="rec-amount ${isLent ? 'income' : 'expense'}">
                ${isLent ? '+' : '-'}${formatMoney(loan.principal)}
            </div>
            <div class="rec-actions">
                ${loan.status === 'open' ? `
                <button class="icon-btn toggle resume" onclick="openRepayModal('${loan._id}')" title="Record repayment">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </button>` : ''}
                <button class="icon-btn edit" onclick="openEditModal('${loan._id}')" title="Edit">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn delete" onclick="deleteLoan('${loan._id}')" title="Delete">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
            </div>
        </div>`;
    }).join('');
};

const renderDueSoon = (items) => {
    const container = document.getElementById('dueSoonList');
    if (!container) return;

    const now = new Date();
    const soon = items
        .filter(l => l.status === 'open' && l.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 6);

    if (soon.length === 0) {
        container.innerHTML = `<p class="no-data">No loans with due dates.</p>`;
        return;
    }

    container.innerHTML = soon.map(l => {
        const overdue = new Date(l.dueDate) < now;
        const isLent = l.direction === 'lent';
        return `
        <div class="upcoming-item">
            <div class="upcoming-info">
                <span class="upcoming-label">${l.counterparty}</span>
                <span class="upcoming-date ${overdue ? 'due-soon' : ''}">${overdue ? 'Overdue · ' : ''}${formatDate(l.dueDate)}</span>
            </div>
            <span class="upcoming-amount ${isLent ? 'income' : 'expense'}">${isLent ? '+' : '-'}${formatMoney(outstandingOf(l))}</span>
        </div>`;
    }).join('');
};

const showLoading = (show) => {
    const el = document.getElementById('loanList');
    if (show && el) el.innerHTML = `<div class="loading-state"><p>Loading...</p></div>`;
};

// ── Modals ────────────────────────────────────────────────────────
const setupModals = () => {
    document.getElementById('addLoanBtn')?.addEventListener('click', openAddModal);
    document.getElementById('closeLoanModal')?.addEventListener('click', closeLoanModal);
    document.getElementById('cancelLoanBtn')?.addEventListener('click', closeLoanModal);
    document.getElementById('loanForm')?.addEventListener('submit', handleLoanSubmit);
    document.getElementById('loanModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'loanModal') closeLoanModal();
    });

    document.getElementById('closeRepayModal')?.addEventListener('click', closeRepayModal);
    document.getElementById('repayForm')?.addEventListener('submit', handleRepaySubmit);
    document.getElementById('settleFullBtn')?.addEventListener('click', settleInFull);
    document.getElementById('repayModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'repayModal') closeRepayModal();
    });
};

const openAddModal = () => {
    editingId = null;
    document.getElementById('loanModalTitle').textContent = 'Add Loan';
    document.getElementById('loanForm').reset();
    document.getElementById('loanDateField').value = new Date().toISOString().split('T')[0];
    document.getElementById('loanModal').classList.add('open');
};

const openEditModal = (id) => {
    const loan = allLoans.find(l => l._id === id);
    if (!loan) return;
    editingId = id;
    document.getElementById('loanModalTitle').textContent = 'Edit Loan';
    document.getElementById('loanDirectionField').value = loan.direction;
    document.getElementById('loanCounterpartyField').value = loan.counterparty || '';
    document.getElementById('loanPrincipalField').value = loan.principal;
    document.getElementById('loanDateField').value = loan.date?.split('T')[0] || '';
    document.getElementById('loanDueDateField').value = loan.dueDate ? loan.dueDate.split('T')[0] : '';
    document.getElementById('loanNoteField').value = loan.note || '';
    document.getElementById('loanModal').classList.add('open');
};

const closeLoanModal = () => {
    document.getElementById('loanModal').classList.remove('open');
    editingId = null;
};

const handleLoanSubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        const direction = document.getElementById('loanDirectionField').value;
        const counterparty = document.getElementById('loanCounterpartyField').value.trim();
        const principal = parseFloat(document.getElementById('loanPrincipalField').value);
        const date = document.getElementById('loanDateField').value;
        const dueDate = document.getElementById('loanDueDateField').value || null;
        const note = document.getElementById('loanNoteField').value || '';

        if (!counterparty) { showToast('Please enter who the loan is with', 'error'); return; }
        if (!principal || principal <= 0) { showToast('Please enter a valid amount', 'error'); return; }
        if (!date) { showToast('Please select a date', 'error'); return; }

        const body = { direction, counterparty, principal, date, dueDate, note };
        const endpoint = editingId ? `/loans/${editingId}` : '/loans';
        const method = editingId ? 'PUT' : 'POST';

        await apiFetch(endpoint, { method, body: JSON.stringify(body) });
        showToast(editingId ? 'Loan updated!' : 'Loan added!');
        closeLoanModal();
        await loadAll();
    } catch (err) {
        showToast(err.message || 'Save failed', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    }
};

// ── Repayment ─────────────────────────────────────────────────────
const openRepayModal = (id) => {
    const loan = allLoans.find(l => l._id === id);
    if (!loan) return;
    repayingId = id;
    const out = outstandingOf(loan);
    const isLent = loan.direction === 'lent';

    document.getElementById('repayModalTitle').textContent = isLent ? 'Record Collection' : 'Record Repayment';
    document.getElementById('repayContext').textContent =
        `${loan.counterparty} · ${formatMoney(out)} outstanding. ` +
        (isLent ? 'This will be added as income.' : 'This will be recorded as an expense.');
    document.getElementById('repayForm').reset();
    document.getElementById('repayAmountField').value = out.toFixed(2);
    document.getElementById('repayAmountField').max = out.toFixed(2);
    document.getElementById('repayDateField').value = new Date().toISOString().split('T')[0];
    document.getElementById('repayModal').classList.add('open');
};

const closeRepayModal = () => {
    document.getElementById('repayModal').classList.remove('open');
    repayingId = null;
};

const handleRepaySubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        const amount = parseFloat(document.getElementById('repayAmountField').value);
        const date = document.getElementById('repayDateField').value;
        const note = document.getElementById('repayNoteField').value || '';

        if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

        const res = await apiFetch(`/loans/${repayingId}/repay`, {
            method: 'POST',
            body: JSON.stringify({ amount, date, note })
        });
        showToast(res.message || 'Repayment recorded!');
        closeRepayModal();
        await loadAll();
    } catch (err) {
        showToast(err.message || 'Failed', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Record'; }
    }
};

const settleInFull = async () => {
    if (!repayingId) return;
    if (!confirm('Mark this loan as fully settled? A matching transaction will be created for the remaining amount.')) return;
    try {
        const res = await apiFetch(`/loans/${repayingId}/settle`, { method: 'PATCH' });
        showToast(res.message || 'Settled!');
        closeRepayModal();
        await loadAll();
    } catch (err) {
        showToast(err.message || 'Failed', 'error');
    }
};

// ── Delete ────────────────────────────────────────────────────────
const deleteLoan = async (id) => {
    if (!confirm('Delete this loan? Note: any matching income/expense transactions already created will remain in your history.')) return;
    try {
        await apiFetch(`/loans/${id}`, { method: 'DELETE' });
        showToast('Loan deleted!');
        await loadAll();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Expose for inline onclick
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.openRepayModal = openRepayModal;
window.deleteLoan = deleteLoan;
