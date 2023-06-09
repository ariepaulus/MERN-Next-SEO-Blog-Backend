const { check } = require('express-validator');

exports.tagCreateValidator = [
  check('name')
    .not()
    .isEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Cannot be longer than 50 characters'),
];
