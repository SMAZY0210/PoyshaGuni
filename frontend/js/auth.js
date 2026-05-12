redirectIfLoggedIn();

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button[type="submit"]');
        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;
        btn.textContent = 'Logging in...'; btn.disabled = true;
        try {
            const data = await apiFetch('/auth/login', { method:'POST', body:JSON.stringify({email,password}) });
            setAuth(data.token, data.user);
            showToast(`Welcome back, ${data.user.name}! 👋`);
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
        } catch(err) { showToast(err.message,'error'); btn.textContent='Login'; btn.disabled=false; }
    });
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = signupForm.querySelector('button[type="submit"]');
        const name = signupForm.querySelector('input[type="text"]').value;
        const email = signupForm.querySelector('input[type="email"]').value;
        const password = signupForm.querySelector('input[type="password"]').value;
        if (password.length < 6) return showToast('Password must be at least 6 characters','error');
        btn.textContent = 'Creating account...'; btn.disabled = true;
        try {
            const data = await apiFetch('/auth/signup', { method:'POST', body:JSON.stringify({name,email,password}) });
            setAuth(data.token, data.user);
            showToast('Account created! Welcome 🎉');
            // Send to onboarding for new users
            setTimeout(() => { window.location.href = data.user.onboardingComplete ? 'dashboard.html' : 'onboarding.html'; }, 700);
        } catch(err) { showToast(err.message,'error'); btn.textContent='Sign Up'; btn.disabled=false; }
    });
}
