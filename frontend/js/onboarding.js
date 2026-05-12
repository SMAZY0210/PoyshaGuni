if (!requireAuth()) throw new Error();
const user = getUser();
if (user?.onboardingComplete) { window.location.href = 'dashboard.html'; }

let step = 1;
const TOTAL_STEPS = 3;

document.addEventListener('DOMContentLoaded', () => {
    renderStep();

    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('backBtn').addEventListener('click', prevStep);
    document.getElementById('skipBtn').addEventListener('click', finishOnboarding);
});

const renderStep = () => {
    document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`)?.classList.add('active');
    document.getElementById('progressFill').style.width = `${(step / TOTAL_STEPS) * 100}%`;
    document.getElementById('stepLabel').textContent = `Step ${step} of ${TOTAL_STEPS}`;
    document.getElementById('backBtn').style.display = step > 1 ? 'inline-flex' : 'none';
    document.getElementById('nextBtn').textContent = step === TOTAL_STEPS ? 'Get Started 🚀' : 'Next →';
};

const nextStep = async () => {
    if (step === 1) {
        // Save currency
        const sel = document.getElementById('currencySelect');
        const opt = sel.options[sel.selectedIndex];
        try {
            await apiFetch('/user/currency', {
                method: 'PUT',
                body: JSON.stringify({ currency: opt.value, currencySymbol: opt.dataset.symbol, locale: opt.dataset.locale })
            });
            const stored = getUser();
            if (stored) { stored.currency = opt.value; stored.currencySymbol = opt.dataset.symbol; stored.locale = opt.dataset.locale; localStorage.setItem('fintrack_user', JSON.stringify(stored)); }
        } catch (e) { showToast(e.message, 'error'); return; }
    }
    if (step === 2) {
        // Save first income if filled
        const source = document.getElementById('firstIncomeSource').value.trim();
        const amount = document.getElementById('firstIncomeAmount').value;
        if (source && amount) {
            try {
                await apiFetch('/income', { method: 'POST', body: JSON.stringify({ source, amount: parseFloat(amount), date: new Date().toISOString() }) });
            } catch (e) { /* non-blocking */ }
        }
    }
    if (step === TOTAL_STEPS) return finishOnboarding();
    step++;
    renderStep();
};

const prevStep = () => { if (step > 1) { step--; renderStep(); } };

const finishOnboarding = async () => {
    try { await apiFetch('/user/onboarding-complete', { method: 'POST' }); } catch (e) {}
    const stored = getUser();
    if (stored) { stored.onboardingComplete = true; localStorage.setItem('fintrack_user', JSON.stringify(stored)); }
    window.location.href = 'dashboard.html';
};
