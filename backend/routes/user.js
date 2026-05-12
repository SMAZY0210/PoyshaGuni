const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, updateCurrency, completeOnboarding, updateAvatar, removeAvatar, changePassword, deleteAccount } = require('../controllers/userController');
const { getAuditLog } = require('../controllers/auditController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/profile').get(getProfile).put(updateProfile).delete(deleteAccount);
router.route('/avatar').put(updateAvatar).delete(removeAvatar);
router.put('/password', changePassword);
router.put('/currency', updateCurrency);
router.post('/onboarding-complete', completeOnboarding);
router.get('/audit-log', getAuditLog);

module.exports = router;
