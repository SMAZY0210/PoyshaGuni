// ── Recurring Transactions Page ───────────────────────────────────
// Auth is handled gracefully inside DOMContentLoaded (no top-level throw)

let currentUser = null;
let allRecurring = [];
let editingId = null;

// CATEGORIES is defined in api.js — do not redeclare here
const FREQ_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
const FREQ_COLORS = { daily: '#f59e0b', weekly: '#06b6d4', monthly: '#6366f1', yearly: '#8b5cf6' };

document.addEventListener('DOMContentLoaded', async () => {
    // ── Auth guard ───────────────────────────────────────────────
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

    setupModal();
    setupFilters();
    await loadAll();
});

// ── Data ──────────────────────────────────────────────────────────
const loadAll = async () => {
    try {
        showLoading(true);
        const [recurRes, upcomingRes] = await Promise.all([
            apiFetch('/recurring'),
            apiFetch('/recurring/upcoming')
        ]);
        allRecurring = Array.isArray(recurRes?.data) ? recurRes.data : [];
        renderList(allRecurring);
        renderUpcoming(Array.isArray(upcomingRes?.data) ? upcomingRes.data : []);
        renderSummary(allRecurring);
        showLoading(false);
    } catch (err) {
        showToast('Failed to load: ' + err.message, 'error');
        showLoading(false);
    }
};

const renderSummary = (items) => {
    const active = items.filter(i => i.isActive);
    const monthlyExpense = active
        .filter(i => i.type === 'expense')
        .reduce((s, i) => s + toMonthlyAmount(i), 0);
    const monthlyIncome = active
        .filter(i => i.type === 'income')
        .reduce((s, i) => s + toMonthlyAmount(i), 0);

    document.getElementById('recExpenseTotal').textContent = formatMoney(monthlyExpense);
    document.getElementById('recIncomeTotal').textContent = formatMoney(monthlyIncome);
    document.getElementById('recNetTotal').textContent = formatMoney(monthlyIncome - monthlyExpense);
    document.getElementById('recCount').textContent = active.length;
};

const toMonthlyAmount = (item) => {
    switch (item.frequency) {
        case 'daily':   return (item.amount || 0) * 30;
        case 'weekly':  return (item.amount || 0) * 4.33;
        case 'monthly': return (item.amount || 0);
        case 'yearly':  return (item.amount || 0) / 12;
        default: return (item.amount || 0);
    }
};

const setupFilters = () => {
    document.querySelectorAll('.rec-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rec-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            const filtered = filter === 'all' ? allRecurring
                : filter === 'active' ? allRecurring.filter(i => i.isActive)
                : filter === 'paused' ? allRecurring.filter(i => !i.isActive)
                : allRecurring.filter(i => i.type === filter);
            renderList(filtered);
        });
    });
};

const renderList = (items) => {
    const container = document.getElementById('recurringList');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></div>
            <p>No recurring transactions yet.</p>
            <button class="btn-primary" onclick="openAddModal()">+ Add Recurring</button>
        </div>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const label = item.type === 'expense' ? item.title : item.source;
        const isDue = new Date(item.nextDueDate) <= new Date();
        const freqColor = FREQ_COLORS[item.frequency] || '#6366f1';
        return `
        <div class="rec-item ${!item.isActive ? 'paused' : ''}">
            <div class="rec-icon ${item.type}">
                ${item.type === 'expense'
                    ? getCatIconSvg(item.category || 'Other')
                    : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`}
            </div>
            <div class="rec-info">
                <p class="rec-title">${label || 'Untitled'}</p>
                <p class="rec-meta">
                    <span class="freq-badge" style="background:${freqColor}20;color:${freqColor}">${FREQ_LABELS[item.frequency] || item.frequency}</span>
                    ${item.category ? `<span class="cat-badge">${item.category}</span>` : ''}
                    <span class="${isDue && item.isActive ? 'due-soon' : ''}">Due: ${formatDate(item.nextDueDate)}</span>
                </p>
            </div>
            <div class="rec-amount ${item.type}">
                ${item.type === 'expense' ? '-' : '+'}${formatMoney(item.amount)}
            </div>
            <div class="rec-actions">
                <button class="icon-btn toggle ${item.isActive ? 'pause' : 'resume'}" onclick="toggleItem('${item._id}')" title="${item.isActive ? 'Pause' : 'Resume'}">
                    ${item.isActive
                        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
                        : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`}
                </button>
                <button class="icon-btn edit" onclick="openEditModal('${item._id}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn delete" onclick="deleteItem('${item._id}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
            </div>
        </div>`;
    }).join('');
};

const renderUpcoming = (items) => {
    const container = document.getElementById('upcomingList');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `<p class="empty-upcoming">No upcoming items in the next 30 days.</p>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="upcoming-item">
            <div class="upcoming-info">
                <span class="upcoming-label">${item.type === 'expense' ? item.title : item.source}</span>
                <span class="upcoming-date">${formatDate(item.nextDueDate)}</span>
            </div>
            <span class="upcoming-amount ${item.type}">${item.type === 'expense' ? '-' : '+'}${formatMoney(item.amount)}</span>
        </div>
    `).join('');
};

const showLoading = (show) => {
    const el = document.getElementById('recurringList');
    if (show && el) el.innerHTML = `<div class="loading-state"><p>Loading...</p></div>`;
};

// ── Modal ─────────────────────────────────────────────────────────
const setupModal = () => {
    document.getElementById('addRecBtn')?.addEventListener('click', openAddModal);
    document.getElementById('processAllBtn')?.addEventListener('click', processAll);
    document.getElementById('closeRecModal')?.addEventListener('click', closeModal);
    document.getElementById('cancelRecBtn')?.addEventListener('click', closeModal);
    document.getElementById('recurringForm')?.addEventListener('submit', handleSubmit);

    document.getElementById('recModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'recModal') closeModal();
    });

    // Toggle expense/income fields based on type select
    document.getElementById('recTypeField')?.addEventListener('change', (e) => {
        toggleTypeFields(e.target.value);
    });
};

const toggleTypeFields = (type) => {
    const expFields = document.getElementById('recExpenseFields');
    const incFields = document.getElementById('recIncomeFields');
    if (expFields) expFields.style.display = type === 'expense' ? 'block' : 'none';
    if (incFields) incFields.style.display = type === 'income' ? 'block' : 'none';
};

const openAddModal = () => {
    editingId = null;
    const titleEl = document.getElementById('recModalTitle');
    if (titleEl) titleEl.textContent = 'Add Recurring';
    document.getElementById('recurringForm')?.reset();
    document.getElementById('recStartDate').value = new Date().toISOString().split('T')[0];
    toggleTypeFields('expense');

    // Populate category dropdown
    const catField = document.getElementById('recCategoryField');
    if (catField) catField.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');

    document.getElementById('recModal')?.classList.add('open');
};

const openEditModal = (id) => {
    const item = allRecurring.find(i => i._id === id);
    if (!item) return;

    editingId = id;
    const titleEl = document.getElementById('recModalTitle');
    if (titleEl) titleEl.textContent = 'Edit Recurring';

    // Populate category dropdown
    const catField = document.getElementById('recCategoryField');
    if (catField) catField.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');

    const typeField = document.getElementById('recTypeField');
    if (typeField) { typeField.value = item.type; typeField.disabled = true; }
    toggleTypeFields(item.type);

    if (item.type === 'expense') {
        const titleField = document.getElementById('recTitleField');
        if (titleField) titleField.value = item.title || '';
        if (catField) catField.value = item.category || 'Other';
    } else {
        const sourceField = document.getElementById('recSourceField');
        if (sourceField) sourceField.value = item.source || '';
    }

    document.getElementById('recAmountField').value = item.amount;
    document.getElementById('recFreqField').value = item.frequency;
    document.getElementById('recStartDate').value = item.startDate?.split('T')[0] || '';
    const endField = document.getElementById('recEndDate');
    if (endField) endField.value = item.endDate ? item.endDate.split('T')[0] : '';
    const noteField = document.getElementById('recNoteField');
    if (noteField) noteField.value = item.note || '';

    document.getElementById('recModal')?.classList.add('open');
};

const closeModal = () => {
    document.getElementById('recModal')?.classList.remove('open');
    editingId = null;
    // Re-enable type field in case it was disabled during edit
    const typeField = document.getElementById('recTypeField');
    if (typeField) typeField.disabled = false;
};

const handleSubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        const type = document.getElementById('recTypeField')?.value;
        const amount = parseFloat(document.getElementById('recAmountField')?.value);
        const frequency = document.getElementById('recFreqField')?.value;
        const startDate = document.getElementById('recStartDate')?.value;
        const endDate = document.getElementById('recEndDate')?.value || null;
        const note = document.getElementById('recNoteField')?.value || '';

        const body = { type, amount, frequency, startDate, endDate, note };

        if (type === 'expense') {
            body.title = document.getElementById('recTitleField')?.value;
            body.category = document.getElementById('recCategoryField')?.value;
        } else {
            body.source = document.getElementById('recSourceField')?.value;
        }

        const endpoint = editingId ? `/recurring/${editingId}` : '/recurring';
        const method = editingId ? 'PUT' : 'POST';

        await apiFetch(endpoint, { method, body: JSON.stringify(body) });
        showToast(editingId ? 'Updated successfully!' : 'Recurring transaction added!');
        closeModal();
        await loadAll();
    } catch (err) {
        showToast(err.message || 'Save failed', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    }
};

// ── Actions ───────────────────────────────────────────────────────
const toggleItem = async (id) => {
    try {
        const res = await apiFetch(`/recurring/${id}/toggle`, { method: 'PATCH' });
        showToast(res.message || 'Updated');
        await loadAll();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

const deleteItem = async (id) => {
    if (!confirm('Delete this recurring transaction?')) return;
    try {
        await apiFetch(`/recurring/${id}`, { method: 'DELETE' });
        showToast('Deleted successfully!');
        await loadAll();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

const processOne = async (id) => {
    try {
        await apiFetch('/recurring/process', { method: 'POST' });
        showToast('Processed!');
        await loadAll();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

const processAll = async () => {
    try {
        await apiFetch('/recurring/process-all', { method: 'POST' });
        showToast('All due items processed!');
        await loadAll();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Expose for inline onclick handlers
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.deleteItem = deleteItem;
window.toggleItem = toggleItem;
window.processOne = processOne;
window.processAll = processAll;
