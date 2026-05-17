// ── FinTrack API Configuration ─────────────────────────────────────
const API_BASE =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://fintrack-backend-jet.vercel.app/api';

// ── Auth Helpers ───────────────────────────────────────────────────
const getToken = () => localStorage.getItem('fintrack_token');

const getUser = () =>
    JSON.parse(localStorage.getItem('fintrack_user') || 'null');

const setAuth = (token, user) => {
    localStorage.setItem('fintrack_token', token);
    localStorage.setItem('fintrack_user', JSON.stringify(user));
};

const clearAuth = () => {
    localStorage.removeItem('fintrack_token');
    localStorage.removeItem('fintrack_user');
};

const isLoggedIn = () => !!getToken();

const requireAuth = () => {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
};

const redirectIfLoggedIn = () => {
    if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
    }
};

// ── Currency ───────────────────────────────────────────────────────
const getCurrency = () => {
    const u = getUser();

    return {
        code: u?.currency || 'USD',
        symbol: u?.currencySymbol || '$',
        locale: u?.locale || 'en-US'
    };
};

const formatMoney = (amount) => {
    const { code, locale } = getCurrency();

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: code
        }).format(amount || 0);
    } catch {
        return `${getCurrency().symbol}${(amount || 0).toFixed(2)}`;
    }
};

// ── Fetch Wrapper ──────────────────────────────────────────────────
const apiFetch = async (endpoint, options = {}) => {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        });
    } catch (networkErr) {
        throw new Error(
            window.location.hostname === 'localhost'
                ? 'Cannot reach local backend server on port 5000.'
                : 'Cannot reach the backend server. Please try again later.'
        );
    }

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {
            message: 'Server returned an invalid response'
        };
    }

    // Auto logout on invalid token
    if (response.status === 401) {
        clearAuth();
        window.location.href = 'login.html';

        throw new Error(
            data.message || 'Session expired. Please log in again.'
        );
    }

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};

// ── Toast ──────────────────────────────────────────────────────────
const showToast = (message, type = 'success') => {
    document.querySelectorAll('.ft-toast').forEach(t => t.remove());

    const toast = document.createElement('div');

    toast.className = `ft-toast ft-toast-${type}`;

    const iconSvg =
        type === 'success'
            ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

    toast.innerHTML = `
        <span class="toast-icon">${iconSvg}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');

        setTimeout(() => toast.remove(), 350);
    }, 3200);
};

// ── Date Formatters ────────────────────────────────────────────────
const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

const formatDateShort = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });

// ── Categories ─────────────────────────────────────────────────────
const CATEGORY_ICONS = {
    Food: 'food',
    Transport: 'transport',
    Shopping: 'shopping',
    Bills: 'bills',
    Healthcare: 'healthcare',
    Entertainment: 'entertainment',
    Education: 'education',
    Other: 'other'
};

const CATEGORIES = [
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Healthcare',
    'Entertainment',
    'Education',
    'Other'
];

const getCatIconSvg = (cat, size = 17) => {
    const key = CATEGORY_ICONS[cat] || 'other';

    return typeof Icon !== 'undefined' && Icon[key]
        ? Icon[key](size)
        : '';
};

// ── Nav Avatar ─────────────────────────────────────────────────────
const updateNavAvatars = (user) => {
    document.querySelectorAll('.nav-avatar').forEach(el => {
        if (user?.avatar) {
            el.innerHTML = `
                <img
                    src="${user.avatar}"
                    alt="${user.name}"
                    style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
                >
            `;
        } else {
            el.textContent = (user?.name || '?')
                .split(' ')
                .map(w => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
    });
};

// ── Confirm Dialog ─────────────────────────────────────────────────
const confirmDialog = (message) => confirm(message);

// ── CSV Download ──────────────────────────────────────────────────
const downloadCSV = (content, filename) => {
    const blob = new Blob([content], {
        type: 'text/csv'
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
};

// ── Pagination ────────────────────────────────────────────────────
const renderPagination = (
    container,
    page,
    pages,
    onPageChange
) => {
    if (!container || pages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="pagination">
            <button
                class="page-btn"
                ${page <= 1 ? 'disabled' : ''}
                data-page="${page - 1}"
            >
                <svg width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </button>

            <span class="page-info">
                Page ${page} of ${pages}
            </span>

            <button
                class="page-btn"
                ${page >= pages ? 'disabled' : ''}
                data-page="${page + 1}"
            >
                <svg width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        </div>
    `;

    container.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            onPageChange(parseInt(btn.dataset.page));
        });
    });
};

// ── Init ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const u = getUser();

    if (!u) return;

    updateNavAvatars(u);

    document.querySelectorAll('.user-name').forEach(el => {
        el.textContent = u.name;
    });
});

// ── Service Worker ────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./sw.js')
            .catch(() => {});
    });
}
