if (!requireAuth()) throw new Error('Not authenticated');

let user = getUser();
let cropCanvas = null;
let cropCtx = null;
let cropImg = null;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let cropOffset = { x: 0, y: 0 };
let cropScale = 1;
let lastTouchDist = 0;

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.user-name').forEach(el => el.textContent = user.name);
    document.getElementById('logoutBtn')?.addEventListener('click', () => { clearAuth(); window.location.href = 'index.html'; });
    document.getElementById('logoutBtnMobile')?.addEventListener('click', () => { clearAuth(); window.location.href = 'index.html'; });

    await loadProfile();
    setupForms();
    setupDeleteModal();
    setupAvatarUI();
});

// ── Load profile ──────────────────────────────────────────────────
const loadProfile = async () => {
    try {
        const res = await apiFetch('/user/profile');
        populateProfile(res.user);
    } catch (err) {
        showToast('Failed to load profile: ' + err.message, 'error');
    }
};

const populateProfile = (u) => {
    user = u;
    const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // Big avatar on profile page
    renderProfileAvatar(u);

    // Nav avatars everywhere
    updateNavAvatars(u);

    document.getElementById('profileDisplayName').textContent = u.name;
    document.getElementById('profileDisplayEmail').textContent = u.email;
    document.getElementById('profileMemberSince').textContent =
        'Member since ' + new Date(u.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    document.getElementById('nameInput').value = u.name;
    document.getElementById('emailInput').value = u.email;

    // Sync to localStorage
    const stored = getUser();
    if (stored) {
        Object.assign(stored, { name: u.name, email: u.email, avatar: u.avatar });
        localStorage.setItem('fintrack_user', JSON.stringify(stored));
    }
};

const renderProfileAvatar = (u) => {
    const ring = document.getElementById('avatarRing');
    const removeBtn = document.getElementById('removeAvatarBtn');

    if (u.avatar) {
        ring.innerHTML = `
            <div class="avatar-circle">
                <img src="${u.avatar}" alt="${u.name}" class="avatar-img">
            </div>`;
        removeBtn.style.display = 'inline-flex';
    } else {
        const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        ring.innerHTML = `
            <div class="avatar-circle">
                <span id="avatarInitials">${initials}</span>
            </div>`;
        removeBtn.style.display = 'none';
    }
};

// ── Avatar UI ─────────────────────────────────────────────────────
const setupAvatarUI = () => {
    const fileInput = document.getElementById('avatarFileInput');
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const removeBtn = document.getElementById('removeAvatarBtn');
    const avatarWrap = document.getElementById('avatarWrap');

    // Click avatar or button to pick file
    uploadBtn.addEventListener('click', () => fileInput.click());
    avatarWrap.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return showToast('Please select an image file.', 'error');
        if (file.size > 5 * 1024 * 1024) return showToast('Image must be under 5MB.', 'error');
        openCropModal(file);
        fileInput.value = ''; // reset so same file can be re-picked
    });

    removeBtn.addEventListener('click', async () => {
        if (!confirm('Remove your profile picture?')) return;
        removeBtn.disabled = true;
        try {
            await apiFetch('/user/avatar', { method: 'DELETE' });
            user.avatar = null;
            renderProfileAvatar(user);
            updateNavAvatars(user);
            const stored = getUser();
            if (stored) { stored.avatar = null; localStorage.setItem('fintrack_user', JSON.stringify(stored)); }
            showToast('Profile picture removed.');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            removeBtn.disabled = false;
        }
    });

    // Crop modal controls
    document.getElementById('closeCropModal').addEventListener('click', closeCropModal);
    document.getElementById('cancelCropBtn').addEventListener('click', closeCropModal);
    document.getElementById('saveCropBtn').addEventListener('click', saveAvatar);
    document.getElementById('cropZoomIn').addEventListener('click', () => { cropScale = Math.min(cropScale + 0.15, 4); drawCrop(); });
    document.getElementById('cropZoomOut').addEventListener('click', () => { cropScale = Math.max(cropScale - 0.15, 0.5); drawCrop(); });
    document.getElementById('cropZoomSlider').addEventListener('input', (e) => { cropScale = parseFloat(e.target.value); drawCrop(); });

    document.getElementById('cropModal').addEventListener('click', (e) => {
        if (e.target.id === 'cropModal') closeCropModal();
    });
};

// ── Crop modal ────────────────────────────────────────────────────
const openCropModal = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        cropImg = new Image();
        cropImg.onload = () => {
            cropOffset = { x: 0, y: 0 };
            cropScale = 1;
            initCropCanvas();
            document.getElementById('cropModal').classList.add('open');
        };
        cropImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

const closeCropModal = () => {
    document.getElementById('cropModal').classList.remove('open');
    cropImg = null;
};

const initCropCanvas = () => {
    cropCanvas = document.getElementById('cropCanvas');
    cropCtx = cropCanvas.getContext('2d');

    const size = Math.min(window.innerWidth - 80, 320);
    cropCanvas.width = size;
    cropCanvas.height = size;

    // Fit image to canvas initially
    const scale = Math.max(size / cropImg.width, size / cropImg.height);
    cropScale = scale;
    cropOffset = {
        x: (size - cropImg.width * scale) / 2,
        y: (size - cropImg.height * scale) / 2
    };

    document.getElementById('cropZoomSlider').min = scale * 0.5;
    document.getElementById('cropZoomSlider').max = scale * 4;
    document.getElementById('cropZoomSlider').step = scale * 0.01;
    document.getElementById('cropZoomSlider').value = cropScale;

    drawCrop();
    setupCropDrag();
};

const drawCrop = () => {
    if (!cropCtx || !cropImg) return;
    const size = cropCanvas.width;
    cropCtx.clearRect(0, 0, size, size);

    // Draw image
    cropCtx.save();
    cropCtx.drawImage(cropImg, cropOffset.x, cropOffset.y, cropImg.width * cropScale, cropImg.height * cropScale);
    cropCtx.restore();

    // Dim outside circle
    cropCtx.save();
    cropCtx.fillStyle = 'rgba(0,0,0,0.5)';
    cropCtx.fillRect(0, 0, size, size);
    cropCtx.globalCompositeOperation = 'destination-out';
    cropCtx.beginPath();
    cropCtx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    cropCtx.fill();
    cropCtx.restore();

    // Circle border
    cropCtx.save();
    cropCtx.strokeStyle = 'rgba(255,255,255,0.8)';
    cropCtx.lineWidth = 2;
    cropCtx.beginPath();
    cropCtx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    cropCtx.stroke();
    cropCtx.restore();

    // Update slider
    document.getElementById('cropZoomSlider').value = cropScale;
};

const setupCropDrag = () => {
    cropCanvas.onmousedown = (e) => {
        isDragging = true;
        dragStart = { x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y };
    };

    cropCanvas.onmousemove = (e) => {
        if (!isDragging) return;
        cropOffset = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
        drawCrop();
    };

    cropCanvas.onmouseup = () => { isDragging = false; };
    cropCanvas.onmouseleave = () => { isDragging = false; };

    // Touch support
    cropCanvas.ontouchstart = (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            isDragging = true;
            dragStart = { x: e.touches[0].clientX - cropOffset.x, y: e.touches[0].clientY - cropOffset.y };
        } else if (e.touches.length === 2) {
            lastTouchDist = getTouchDist(e.touches);
        }
    };

    cropCanvas.ontouchmove = (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
            cropOffset = { x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y };
            drawCrop();
        } else if (e.touches.length === 2) {
            const dist = getTouchDist(e.touches);
            const ratio = dist / lastTouchDist;
            cropScale = Math.min(Math.max(cropScale * ratio, 0.3), 5);
            lastTouchDist = dist;
            drawCrop();
        }
    };

    cropCanvas.ontouchend = () => { isDragging = false; };

    // Mouse wheel zoom
    cropCanvas.onwheel = (e) => {
        e.preventDefault();
        cropScale = Math.min(Math.max(cropScale - e.deltaY * 0.001, 0.3), 5);
        drawCrop();
    };
};

const getTouchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
};

const saveAvatar = async () => {
    const btn = document.getElementById('saveCropBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        // Export circular crop to a smaller canvas
        const exportSize = 400;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportSize;
        exportCanvas.height = exportSize;
        const exportCtx = exportCanvas.getContext('2d');

        // Clip to circle
        exportCtx.beginPath();
        exportCtx.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2);
        exportCtx.clip();

        // Scale and draw from the crop canvas coordinates
        const srcSize = cropCanvas.width;
        const scaleRatio = exportSize / srcSize;
        exportCtx.drawImage(
            cropImg,
            cropOffset.x, cropOffset.y,
            cropImg.width * cropScale, cropImg.height * cropScale
        );
        // Re-draw scaled to export canvas
        const exportCanvas2 = document.createElement('canvas');
        exportCanvas2.width = exportSize;
        exportCanvas2.height = exportSize;
        const ctx2 = exportCanvas2.getContext('2d');
        ctx2.beginPath();
        ctx2.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2);
        ctx2.clip();
        const scaledOffX = cropOffset.x * scaleRatio;
        const scaledOffY = cropOffset.y * scaleRatio;
        const scaledW = cropImg.width * cropScale * scaleRatio;
        const scaledH = cropImg.height * cropScale * scaleRatio;
        ctx2.drawImage(cropImg, scaledOffX, scaledOffY, scaledW, scaledH);

        const avatarDataUrl = exportCanvas2.toDataURL('image/jpeg', 0.85);

        const res = await apiFetch('/user/avatar', {
            method: 'PUT',
            body: JSON.stringify({ avatar: avatarDataUrl })
        });

        user.avatar = res.avatar;
        renderProfileAvatar(user);
        updateNavAvatars(user);

        const stored = getUser();
        if (stored) { stored.avatar = res.avatar; localStorage.setItem('fintrack_user', JSON.stringify(stored)); }

        closeCropModal();
        showToast('Profile picture updated! ✓');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Photo';
    }
};

// ── Profile & Password forms ──────────────────────────────────────
const setupForms = () => {
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const name = document.getElementById('nameInput').value.trim();
        const email = document.getElementById('emailInput').value.trim();
        if (!name) return showToast('Name cannot be empty.', 'error');
        if (!email) return showToast('Email cannot be empty.', 'error');
        setLoading(btn, true, 'Saving...');
        try {
            const res = await apiFetch('/user/profile', { method: 'PUT', body: JSON.stringify({ name, email }) });
            populateProfile(res.user);
            document.querySelectorAll('.user-name').forEach(el => el.textContent = res.user.name);
            showToast('Profile updated successfully! ✓');
            showFieldSuccess('profileForm');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(btn, false, 'Save Changes');
        }
    });

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (newPassword !== confirmPassword) return showToast('New passwords do not match.', 'error');
        if (newPassword.length < 6) return showToast('Password must be at least 6 characters.', 'error');
        setLoading(btn, true, 'Changing...');
        try {
            await apiFetch('/user/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
            document.getElementById('passwordForm').reset();
            document.getElementById('strengthBar').style.width = '0';
            document.getElementById('strengthBar').className = 'strength-bar';
            document.getElementById('strengthLabel').textContent = '';
            showToast('Password changed successfully! ✓');
            showFieldSuccess('passwordForm');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(btn, false, 'Change Password');
        }
    });

    document.getElementById('newPassword').addEventListener('input', (e) => updateStrength(e.target.value));
    document.querySelectorAll('.toggle-pw').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            const isText = input.type === 'text';
            input.type = isText ? 'password' : 'text';
            btn.textContent = isText ? '👁️' : '🙈';
        });
    });
};

const updateStrength = (pw) => {
    const bar = document.getElementById('strengthBar');
    const label = document.getElementById('strengthLabel');
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
        { label: '', width: '0%', cls: '' },
        { label: 'Very Weak', width: '20%', cls: 'very-weak' },
        { label: 'Weak', width: '40%', cls: 'weak' },
        { label: 'Fair', width: '60%', cls: 'fair' },
        { label: 'Strong', width: '80%', cls: 'strong' },
        { label: 'Very Strong', width: '100%', cls: 'very-strong' },
    ];
    const level = pw.length === 0 ? levels[0] : levels[Math.min(score, 5)];
    bar.style.width = level.width;
    bar.className = `strength-bar ${level.cls}`;
    label.textContent = level.label;
    label.className = `strength-label ${level.cls}`;
};

// ── Delete modal ──────────────────────────────────────────────────
const setupDeleteModal = () => {
    document.getElementById('openDeleteBtn').addEventListener('click', () => {
        document.getElementById('deleteModal').classList.add('open');
        document.getElementById('deletePasswordInput').value = '';
        document.getElementById('deleteConfirmText').value = '';
        updateDeleteBtn();
    });
    document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('deleteModal').addEventListener('click', (e) => { if (e.target.id === 'deleteModal') closeDeleteModal(); });
    document.getElementById('deleteConfirmText').addEventListener('input', updateDeleteBtn);
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        const password = document.getElementById('deletePasswordInput').value;
        if (!password) return showToast('Enter your password to confirm.', 'error');
        const btn = document.getElementById('confirmDeleteBtn');
        setLoading(btn, true, 'Deleting...');
        try {
            await apiFetch('/user/profile', { method: 'DELETE', body: JSON.stringify({ password }) });
            clearAuth();
            showToast('Account deleted. Goodbye.');
            setTimeout(() => window.location.href = 'index.html', 1200);
        } catch (err) {
            showToast(err.message, 'error');
            setLoading(btn, false, 'Delete My Account');
        }
    });
};

const closeDeleteModal = () => document.getElementById('deleteModal').classList.remove('open');
const updateDeleteBtn = () => {
    document.getElementById('confirmDeleteBtn').disabled =
        document.getElementById('deleteConfirmText').value !== 'DELETE';
};

// ── Helpers ───────────────────────────────────────────────────────
const setLoading = (btn, loading, text) => { btn.disabled = loading; btn.textContent = text; };
const showFieldSuccess = (formId) => {
    const form = document.getElementById(formId);
    form.classList.add('form-success');
    setTimeout(() => form.classList.remove('form-success'), 1800);
};
