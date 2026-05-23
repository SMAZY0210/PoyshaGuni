if (!requireAuth()) throw new Error();
let user = getUser();

const CURRENCIES = [
    {code:'USD',symbol:'$',locale:'en-US',label:'US Dollar (USD)'},
    {code:'EUR',symbol:'€',locale:'de-DE',label:'Euro (EUR)'},
    {code:'GBP',symbol:'£',locale:'en-GB',label:'British Pound (GBP)'},
    {code:'BDT',symbol:'৳',locale:'bn-BD',label:'Bangladeshi Taka (BDT)'},
    {code:'INR',symbol:'₹',locale:'en-IN',label:'Indian Rupee (INR)'},
    {code:'JPY',symbol:'¥',locale:'ja-JP',label:'Japanese Yen (JPY)'},
    {code:'CAD',symbol:'CA$',locale:'en-CA',label:'Canadian Dollar (CAD)'},
    {code:'AUD',symbol:'A$',locale:'en-AU',label:'Australian Dollar (AUD)'},
    {code:'CHF',symbol:'Fr',locale:'de-CH',label:'Swiss Franc (CHF)'},
    {code:'CNY',symbol:'¥',locale:'zh-CN',label:'Chinese Yuan (CNY)'},
    {code:'KRW',symbol:'₩',locale:'ko-KR',label:'South Korean Won (KRW)'},
    {code:'SGD',symbol:'S$',locale:'en-SG',label:'Singapore Dollar (SGD)'},
    {code:'AED',symbol:'د.إ',locale:'ar-AE',label:'UAE Dirham (AED)'},
    {code:'SAR',symbol:'﷼',locale:'ar-SA',label:'Saudi Riyal (SAR)'},
    {code:'MYR',symbol:'RM',locale:'ms-MY',label:'Malaysian Ringgit (MYR)'},
    {code:'IDR',symbol:'Rp',locale:'id-ID',label:'Indonesian Rupiah (IDR)'},
    {code:'PKR',symbol:'₨',locale:'ur-PK',label:'Pakistani Rupee (PKR)'},
    {code:'BRL',symbol:'R$',locale:'pt-BR',label:'Brazilian Real (BRL)'},
    {code:'MXN',symbol:'$',locale:'es-MX',label:'Mexican Peso (MXN)'},
    {code:'ZAR',symbol:'R',locale:'en-ZA',label:'South African Rand (ZAR)'},
    {code:'NGN',symbol:'₦',locale:'en-NG',label:'Nigerian Naira (NGN)'},
    {code:'TRY',symbol:'₺',locale:'tr-TR',label:'Turkish Lira (TRY)'},
    {code:'RUB',symbol:'₽',locale:'ru-RU',label:'Russian Ruble (RUB)'},
    {code:'SEK',symbol:'kr',locale:'sv-SE',label:'Swedish Krona (SEK)'},
    {code:'NOK',symbol:'kr',locale:'nb-NO',label:'Norwegian Krone (NOK)'},
];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('logoutBtn')?.addEventListener('click', () => { clearAuth(); window.location.href='index.html'; });
    document.getElementById('logoutBtnMobile')?.addEventListener('click', () => { clearAuth(); window.location.href='index.html'; });

    buildCurrencySelect();
    await loadSettings();
    setupForms();
    await loadAuditLog();
});

const buildCurrencySelect = () => {
    const sel = document.getElementById('currencySelect');
    sel.innerHTML = CURRENCIES.map(c => `<option value="${c.code}" data-symbol="${c.symbol}" data-locale="${c.locale}">${c.label} — ${c.symbol}</option>`).join('');
};

const loadSettings = async () => {
    try {
        const res = await apiFetch('/user/profile');
        user = res.user;
        const sel = document.getElementById('currencySelect');
        const opt = [...sel.options].find(o => o.value === user.currency);
        if (opt) sel.value = user.currency;
        updateCurrencyPreview();
    } catch(err) { showToast(err.message,'error'); }
};

const updateCurrencyPreview = () => {
    const sel = document.getElementById('currencySelect');
    const opt = sel.options[sel.selectedIndex];
    const code = opt.value, symbol = opt.dataset.symbol, locale = opt.dataset.locale;
    document.getElementById('currencyPreview').textContent = `Preview: ${new Intl.NumberFormat(locale, {style:'currency',currency:code,numberingSystem:'latn'}).format(1234.56)}`;
};

const setupForms = () => {
    document.getElementById('currencySelect').addEventListener('change', updateCurrencyPreview);
    document.getElementById('currencyForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled=true; btn.textContent='Saving...';
        const sel = document.getElementById('currencySelect');
        const opt = sel.options[sel.selectedIndex];
        try {
            const res = await apiFetch('/user/currency',{method:'PUT',body:JSON.stringify({currency:opt.value,currencySymbol:opt.dataset.symbol})});
            const stored = getUser();
            if(stored){Object.assign(stored,{currency:opt.value,currencySymbol:opt.dataset.symbol});localStorage.setItem('poyshaguni_user',JSON.stringify(stored));}
            showToast(`Currency changed to ${opt.value} ${opt.dataset.symbol} ✓`);
        } catch(err) { showToast(err.message,'error'); }
        finally { btn.disabled=false; btn.textContent='Save Currency'; }
    });
};

const loadAuditLog = async () => {
    try {
        const res = await apiFetch('/user/audit-log?limit=15');
        const container = document.getElementById('auditList');
        if (res.data.length === 0) { container.innerHTML = '<p class="no-data">No activity recorded yet.</p>'; return; }
        const ACTION_LABELS = {
            login:'🔑 Logged in', signup:'🎉 Account created', logout:'🚪 Logged out',
            profile_update:'Profile updated', password_change:'Password changed',
            avatar_update:'📷 Avatar updated', currency_change:'💱 Currency changed',
            expense_add:'Expense added', expense_update:'Expense updated', expense_delete:'Expense deleted',
            income_add:'Income added', income_update:'Income updated', income_delete:'Income deleted',
            onboarding_complete:'🚀 Onboarding completed'
        };
        container.innerHTML = res.data.map(l => `
            <div class="audit-item">
                <div class="audit-action">${ACTION_LABELS[l.action] || l.action}</div>
                <div class="audit-meta">
                    ${l.detail ? `<span>${l.detail}</span> · ` : ''}
                    <span>${new Date(l.createdAt).toLocaleString('en-US')}</span>
                </div>
            </div>`).join('');
    } catch(err) { console.error(err); }
};

// CSV Export helpers
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('exportExpenseBtn')?.addEventListener('click', async () => {
        const token = getToken();
        const now = new Date();
        window.open(`${API_BASE}/expenses/export?month=${now.getMonth()+1}&year=${now.getFullYear()}&token=${token}`,'_blank');
        // Fetch via apiFetch for auth
        try {
            const res = await fetch(`http://localhost:5000/api/expenses/export`,{headers:{Authorization:`Bearer ${token}`}});
            const text = await res.text();
            downloadCSV(text,'expenses.csv');
        } catch(e) { showToast('Export failed','error'); }
    });
    document.getElementById('exportIncomeBtn')?.addEventListener('click', async () => {
        const token = getToken();
        try {
            const res = await fetch(`http://localhost:5000/api/income/export`,{headers:{Authorization:`Bearer ${token}`}});
            const text = await res.text();
            downloadCSV(text,'income.csv');
        } catch(e) { showToast('Export failed','error'); }
    });
});
