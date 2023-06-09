const express = require('express');
const router = express.Router();

//* Import controllers
const {
  preSignup,
  signup,
  signin,
  signout,
  forgotPassword,
  resetPassword,
  googleLogin,
} = require('../controllers/authController');

//* Import validators
const { runValidation } = require('../validators/indexValidators');
const {
  userSignupValidator,
  userSigninValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidators');

//* Routes
router.post('/pre-signup', userSignupValidator, runValidation, preSignup);
router.post('/signup', signup);
router.post('/signin', userSigninValidator, runValidation, signin);
router.get('/signout', signout);
router.put('/forgot-password', forgotPasswordValidator, runValidation, forgotPassword);
router.put('/reset-password', resetPasswordValidator, runValidation, resetPassword);

//* Google Login
router.post('/google-login', googleLogin);

module.exports = router;
