const AuditLog = require('../models/AuditLog');

const getAuditLog = async (req, res, next) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip  = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments({ userId: req.user._id })
        ]);

        res.json({ success: true, data: logs, page, pages: Math.ceil(total / limit), total });
    } catch (err) { next(err); }
};

module.exports = { getAuditLog };
