const express = require('express');
const router = express.Router();
const { getBudgets, setBudget, deleteBudget } = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.route('/').get(getBudgets).post(setBudget);
router.delete('/:id', deleteBudget);
module.exports = router;
