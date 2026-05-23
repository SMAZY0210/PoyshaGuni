const express = require('express');
const router = express.Router();
const {
    getRecurring, addRecurring, updateRecurring,
    toggleRecurring, deleteRecurring, processRecurring, processAllRecurring, getUpcoming
} = require('../controllers/recurringController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/upcoming', getUpcoming);
router.post('/process', processRecurring);
router.post('/process-all', processAllRecurring);

router.route('/')
    .get(getRecurring)
    .post(addRecurring);

router.route('/:id')
    .put(updateRecurring)
    .delete(deleteRecurring);

router.patch('/:id/toggle', toggleRecurring);

module.exports = router;
