const { validationResult } = require('express-validator');

//* This middleware function is responsible for showing the result of validation, if any, from all the other validators
exports.runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //* 422 -> unprocessible entity (due to invalid data)
    return res.status(422).json({ error: errors.array()[0].msg });
  }
  next();
};
