const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { log } = require('../utils/auditLog');
const { sendEmail, emailTemplates } = require('../utils/email');

const userPayload = (u) => ({
    id: u._id, name: u.name, email: u.email, avatar: u.avatar || null,
    currency: u.currency || 'USD', currencySymbol: u.currencySymbol || '$',
    locale: u.locale || 'en-US', onboardingComplete: u.onboardingComplete || false,
    createdAt: u.createdAt
});

const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'Email already registered.' });
        const user = await User.create({ name, email, password });
        const token = generateToken(user._id);
        log(user._id, 'signup', email, req);
        const { subject, html } = emailTemplates.welcome(name);
        sendEmail({ to: email, subject, html }).catch(() => {});
        res.status(201).json({ success: true, message: 'Account created successfully.', token, user: userPayload(user) });
    } catch (err) { next(err); }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        const token = generateToken(user._id);
        log(user._id, 'login', email, req);
        res.json({ success: true, message: 'Logged in successfully.', token, user: userPayload(user) });
    } catch (err) { next(err); }
};

const getMe = async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: userPayload(user) });
};

module.exports = { signup, login, getMe };
