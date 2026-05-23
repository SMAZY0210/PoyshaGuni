const express = require('express');
const router = express.Router();
const {
    getLoans, getLoanSummary, addLoan, updateLoan,
    repayLoan, settleLoan, deleteLoan
} = require('../controllers/loanController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getLoanSummary);

router.route('/')
    .get(getLoans)
    .post(addLoan);

router.route('/:id')
    .put(updateLoan)
    .delete(deleteLoan);

router.post('/:id/repay', repayLoan);
router.patch('/:id/settle', settleLoan);

module.exports = router;
