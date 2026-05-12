(function () {
    const saved = localStorage.getItem('fintrack_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
})();

const getTheme = () => localStorage.getItem('fintrack_theme') || 'dark';

const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fintrack_theme', theme);
    updateFAB(theme);
};

const toggleTheme = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark');

const sunSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const moonSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

const updateFAB = (theme) => {
    const fab = document.getElementById('themeFAB');
    if (fab) {
        fab.innerHTML = theme === 'dark' ? sunSvg : moonSvg;
        fab.setAttribute('title', theme === 'dark' ? 'Light mode' : 'Dark mode');
        fab.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const fab = document.createElement('button');
    fab.id = 'themeFAB';
    fab.className = 'theme-fab';
    const theme = getTheme();
    fab.innerHTML = theme === 'dark' ? sunSvg : moonSvg;
    fab.setAttribute('title', theme === 'dark' ? 'Light mode' : 'Dark mode');
    fab.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    fab.addEventListener('click', () => {
        fab.classList.add('spin');
        setTimeout(() => fab.classList.remove('spin'), 400);
        toggleTheme();
    });
    document.body.appendChild(fab);
});
