const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const registerValidation = [
    body('phone').isMobilePhone('any', { strictMode: false }).withMessage('Must be a valid phone number.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    validateRequest
];

const loginValidation = [
    body('phone').notEmpty().withMessage('Phone number is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
    validateRequest
];

const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.'),
    validateRequest
];

const depositVerificationValidation = [
    body('depositorPhone').isMobilePhone('any', { strictMode: false }).withMessage('Depositor phone must be a valid phone number.'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),
    validateRequest
];

const withdrawalRequestValidation = [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),
    validateRequest
];

// Basic validation for betting to ensure it's in the right format
const placeBetValidation = [
    body('bets').isObject().withMessage('Bets must be an object.'),
    body('bets.*').isArray().withMessage('Each slot bet must be an array of box IDs.'),
    validateRequest
];

module.exports = {
    registerValidation,
    loginValidation,
    changePasswordValidation,
    depositVerificationValidation,
    withdrawalRequestValidation,
    placeBetValidation
};