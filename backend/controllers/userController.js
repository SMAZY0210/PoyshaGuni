const User = require('../models/User');
const { log } = require('../utils/auditLog');
const { sendEmail, emailTemplates } = require('../utils/email');

const userPayload = (u, includeAvatar = false) => ({
    id: u._id, name: u.name, email: u.email,
    avatar: includeAvatar ? (u.avatar || null) : undefined,
    currency: u.currency || 'USD',
    currencySymbol: u.currencySymbol || '$',
    locale: u.locale || 'en-US',
    onboardingComplete: u.onboardingComplete,
    createdAt: u.createdAt
});

const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({ success: true, user: userPayload(user, true) });
    } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        if (!name && !email) return res.status(400).json({ success: false, message: 'Provide name or email to update.' });
        if (email && email !== req.user.email) {
            const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
            if (exists) return res.status(400).json({ success: false, message: 'Email already in use.' });
        }
        const updates = {};
        if (name?.trim()) updates.name = name.trim();
        if (email?.trim()) updates.email = email.trim().toLowerCase();
        const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
        log(req.user._id, 'profile_update', `name/email changed`, req);
        res.json({ success: true, message: 'Profile updated.', user: userPayload(updated, true) });
    } catch (err) { next(err); }
};

// Update currency preference
const updateCurrency = async (req, res, next) => {
    try {
        const { currency, currencySymbol, locale } = req.body;
        if (!currency || !currencySymbol) return res.status(400).json({ success: false, message: 'Currency and symbol required.' });
        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { currency, currencySymbol, locale: locale || 'en-US' },
            { new: true }
        );
        log(req.user._id, 'currency_change', currency, req);
        res.json({ success: true, message: 'Currency updated.', user: userPayload(updated, true) });
    } catch (err) { next(err); }
};

// Complete onboarding
const completeOnboarding = async (req, res, next) => {
    try {
        const updated = await User.findByIdAndUpdate(req.user._id, { onboardingComplete: true }, { new: true });
        log(req.user._id, 'onboarding_complete', '', req);
        res.json({ success: true, message: 'Onboarding complete.', user: userPayload(updated, true) });
    } catch (err) { next(err); }
};

const updateAvatar = async (req, res, next) => {
    try {
        const { avatar } = req.body;
        if (!avatar) return res.status(400).json({ success: false, message: 'No avatar data provided.' });
        const validTypes = ['image/jpeg','image/jpg','image/png','image/webp','image/gif'];
        const match = avatar.match(/^data:([^;]+);base64,/);
        if (!match || !validTypes.includes(match[1])) return res.status(400).json({ success: false, message: 'Invalid image format.' });
        const sizeBytes = (avatar.split(',')[1].length * 3) / 4;
        if (sizeBytes > 2 * 1024 * 1024) return res.status(400).json({ success: false, message: 'Image too large. Max 2MB.' });
        const updated = await User.findByIdAndUpdate(req.user._id, { avatar }, { new: true });
        log(req.user._id, 'avatar_update', '', req);
        res.json({ success: true, message: 'Profile picture updated.', avatar: updated.avatar });
    } catch (err) { next(err); }
};

const removeAvatar = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { avatar: null });
        res.json({ success: true, message: 'Profile picture removed.' });
    } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required.' });
        if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        if (currentPassword === newPassword) return res.status(400).json({ success: false, message: 'New password must be different.' });
        const user = await User.findById(req.user._id).select('+password');
        if (!(await user.matchPassword(currentPassword))) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        user.password = newPassword;
        await user.save();
        log(req.user._id, 'password_change', '', req);
        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) { next(err); }
};

const deleteAccount = async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ success: false, message: 'Password required.' });
        const user = await User.findById(req.user._id).select('+password');
        if (!(await user.matchPassword(password))) return res.status(401).json({ success: false, message: 'Incorrect password.' });

        const [Expense, Income, Recurring, Budget, Goal, AuditLog] = [
            require('../models/Expense'), require('../models/Income'),
            require('../models/Recurring'), require('../models/Budget'),
            require('../models/Goal'), require('../models/AuditLog')
        ];
        await Promise.all([
            Expense.deleteMany({ userId: req.user._id }),
            Income.deleteMany({ userId: req.user._id }),
            Recurring.deleteMany({ userId: req.user._id }),
            Budget.deleteMany({ userId: req.user._id }),
            Goal.deleteMany({ userId: req.user._id }),
            AuditLog.deleteMany({ userId: req.user._id }),
            User.findByIdAndDelete(req.user._id)
        ]);
        res.json({ success: true, message: 'Account deleted.' });
    } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile, updateCurrency, completeOnboarding, updateAvatar, removeAvatar, changePassword, deleteAccount };
