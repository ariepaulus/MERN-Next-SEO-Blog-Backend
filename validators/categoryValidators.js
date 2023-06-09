const { check } = require('express-validator');

exports.categoryCreateValidator = [
  check('name')
    .not()
    .isEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Cannot be more than 50 characters'),
];
