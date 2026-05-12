const AuditLog = require('../models/AuditLog');

const log = async (userId, action, detail = '', req = null) => {
    try {
        await AuditLog.create({
            userId,
            action,
            detail,
            ip: req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '',
            userAgent: req ? (req.headers['user-agent'] || '') : ''
        });
    } catch (err) {
        console.error('AuditLog error:', err.message);
    }
};

module.exports = { log };
