// ── Transactions Page ─────────────────────────────────────────────
// All auth checks and user lookups happen inside DOMContentLoaded,
// so api.js is guaranteed to be loaded before any call is made.

let activeTab = 'expense';
let allExpenses = [];
let allIncome = [];
let editingId = null;
let editingType = null;

// CATEGORIES is defined in api.js — do not redeclare here

document.addEventListener('DOMContentLoaded', async () => {
    // ── Auth guard ───────────────────────────────────────────────
    if (!isLoggedIn()) {
        document.getElementById('transactionList').innerHTML = `<div class="empty-state">
            <p>Please log in to view transactions.</p>
            <a href="login.html" class="btn-primary">Go to Login</a>
        </div>`;
        document.getElementById('logoutBtn')?.style.setProperty('display', 'none');
        return;
    }

    const user = getUser();
    document.querySelectorAll('.user-name').forEach(el => el.textContent = user?.name || '');
    updateNavAvatars(user);

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        clearAuth();
        window.location.href = 'index.html';
    });

    // Populate category dropdowns
    const catFilter = document.getElementById('categoryFilter');
    if (catFilter) {
        catFilter.innerHTML = `<option value="All">All Categories</option>` +
            CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    const catField = document.getElementById('categoryField');
    if (catField) {
        catField.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    setupTabs();
    setupModal();
    setupFilters();

    // Timeout fallback if fetch hangs
    const loadTimeout = setTimeout(() => {
        const list = document.getElementById('transactionList');
        if (list?.textContent === 'Loading...') {
            showToast('Request timed out — please refresh', 'error');
            list.innerHTML = `<div class="empty-state">
                <p>Unable to load transactions. Please refresh the page.</p>
                <button class="btn-primary" onclick="location.reload()">Refresh</button>
            </div>`;
        }
    }, 10000);

    await loadAll();
    clearTimeout(loadTimeout);
});

// ── Tabs ──────────────────────────────────────────────────────────
const setupTabs = () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            renderList();
        });
    });
};

// ── Filters ───────────────────────────────────────────────────────
const setupFilters = () => {
    document.getElementById('categoryFilter')?.addEventListener('change', renderList);
    document.getElementById('monthFilter')?.addEventListener('change', async () => {
        await loadAll();
    });
};

// ── Load data ─────────────────────────────────────────────────────
const loadAll = async () => {
    const list = document.getElementById('transactionList');
    if (list) list.innerHTML = 'Loading...';

    try {
        const monthFilter = document.getElementById('monthFilter');
        let query = '';
        if (monthFilter?.value) {
            const [year, month] = monthFilter.value.split('-');
            query = `?month=${month}&year=${year}`;
        }

        const [expRes, incRes] = await Promise.all([
            apiFetch(`/expenses${query}`),
            apiFetch(`/income${query}`)
        ]);

        allExpenses = Array.isArray(expRes?.data) ? expRes.data : [];
        allIncome = Array.isArray(incRes?.data) ? incRes.data : [];
        renderList();
        updateTotals();
    } catch (err) {
        console.error('Transaction load error:', err);
        allExpenses = [];
        allIncome = [];
        renderList();
        showToast('Failed to load transactions: ' + err.message, 'error');
    }
};

// ── Totals ────────────────────────────────────────────────────────
const updateTotals = () => {
    // Use (e.amount || 0) to guard against null/undefined amounts
    const totalExp = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalInc = allIncome.reduce((s, i) => s + (i.amount || 0), 0);
    const expEl = document.getElementById('tabTotalExpense');
    const incEl = document.getElementById('tabTotalIncome');
    if (expEl) expEl.textContent = formatMoney(totalExp);
    if (incEl) incEl.textContent = formatMoney(totalInc);
};

// ── Render list ───────────────────────────────────────────────────
const renderList = () => {
    const container = document.getElementById('transactionList');
    if (!container) return;

    const catFilter = document.getElementById('categoryFilter')?.value || 'All';
    let items = activeTab === 'expense' ? allExpenses : allIncome;

    if (!Array.isArray(items)) items = [];

    if (activeTab === 'expense' && catFilter !== 'All') {
        items = items.filter(e => e.category === catFilter);
    }

    if (items.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <p>No ${activeTab === 'expense' ? 'expenses' : 'income'} found.</p>
            <button class="btn-primary" onclick="openAddModal()">+ Add ${activeTab === 'expense' ? 'Expense' : 'Income'}</button>
        </div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="list-item">
            <div class="item-icon ${activeTab}">
                ${activeTab === 'expense'
                    ? getCatIconSvg(item.category)
                    : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`}
            </div>
            <div class="item-info">
                <p class="item-title">${activeTab === 'expense' ? (item.title || '') : (item.source || '')}</p>
                <p class="item-meta">
                    ${activeTab === 'expense' ? `<span class="cat-badge">${item.category}</span>` : ''}
                    ${formatDate(item.date)}
                    ${item.note ? `· ${item.note}` : ''}
                </p>
            </div>
            <div class="item-amount ${activeTab}">
                ${activeTab === 'expense' ? '-' : '+'}${formatMoney(item.amount)}
            </div>
            <div class="item-actions">
                <button class="icon-btn edit" onclick="openEditModal('${item._id}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn delete" onclick="deleteItem('${item._id}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');
};

// ── Modal ─────────────────────────────────────────────────────────
const setupModal = () => {
    document.getElementById('addBtn')?.addEventListener('click', openAddModal);
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('cancelBtn')?.addEventListener('click', closeModal);
    document.getElementById('transactionForm')?.addEventListener('submit', handleSubmit);

    document.getElementById('transactionModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'transactionModal') closeModal();
    });
};

const openAddModal = () => {
    editingId = null;
    editingType = activeTab;
    document.getElementById('modalTitle').textContent = `Add ${activeTab === 'expense' ? 'Expense' : 'Income'}`;
    document.getElementById('transactionForm').reset();
    document.getElementById('dateField').value = new Date().toISOString().split('T')[0];
    toggleFormFields(activeTab);
    document.getElementById('transactionModal').classList.add('open');
};

const openEditModal = (id) => {
    const item = activeTab === 'expense'
        ? allExpenses.find(e => e._id === id)
        : allIncome.find(i => i._id === id);
    if (!item) return;

    editingId = id;
    editingType = activeTab;
    document.getElementById('modalTitle').textContent = `Edit ${activeTab === 'expense' ? 'Expense' : 'Income'}`;
    toggleFormFields(activeTab);

    if (activeTab === 'expense') {
        document.getElementById('titleField').value = item.title || '';
        document.getElementById('categoryField').value = item.category || 'Other';
    } else {
        document.getElementById('sourceField').value = item.source || '';
    }
    document.getElementById('amountField').value = item.amount;
    document.getElementById('dateField').value = item.date?.split('T')[0] || '';
    document.getElementById('noteField').value = item.note || '';
    document.getElementById('transactionModal').classList.add('open');
};

const closeModal = () => {
    document.getElementById('transactionModal').classList.remove('open');
    editingId = null;
};

const toggleFormFields = (type) => {
    const expFields = document.getElementById('expenseFields');
    const incFields = document.getElementById('incomeFields');
    if (expFields) expFields.style.display = type === 'expense' ? 'block' : 'none';
    if (incFields) incFields.style.display = type === 'income' ? 'block' : 'none';
};

// ── Submit ────────────────────────────────────────────────────────
const handleSubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        const amount = parseFloat(document.getElementById('amountField').value);
        const date = document.getElementById('dateField').value;
        const note = document.getElementById('noteField').value;

        let body, endpoint, method;

        if (editingType === 'expense') {
            body = {
                title: document.getElementById('titleField').value,
                category: document.getElementById('categoryField').value,
                amount, date, note
            };
            endpoint = editingId ? `/expenses/${editingId}` : '/expenses';
            method = editingId ? 'PUT' : 'POST';
        } else {
            body = {
                source: document.getElementById('sourceField').value,
                amount, date, note
            };
            endpoint = editingId ? `/income/${editingId}` : '/income';
            method = editingId ? 'PUT' : 'POST';
        }

        await apiFetch(endpoint, { method, body: JSON.stringify(body) });
        showToast(editingId ? 'Updated successfully!' : 'Added successfully!');
        closeModal();
        await loadAll();
    } catch (err) {
        showToast(err.message || 'Save failed', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    }
};

// ── Delete ────────────────────────────────────────────────────────
const deleteItem = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
        const endpoint = activeTab === 'expense' ? `/expenses/${id}` : `/income/${id}`;
        await apiFetch(endpoint, { method: 'DELETE' });
        showToast('Deleted successfully!');
        await loadAll();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Expose for inline onclick
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.deleteItem = deleteItem;
