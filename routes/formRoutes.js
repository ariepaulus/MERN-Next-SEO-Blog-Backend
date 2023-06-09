const express = require('express');
const router = express.Router();

const { contactForm, contactBlogAuthorForm } = require('../controllers/formController');

//* Validators
const { runValidation } = require('../validators/indexValidators');
const { contactFormValidator } = require('../validators/formValidators');

//* Routes
router.post('/contact', contactFormValidator, runValidation, contactForm);
router.post('/contact-blog-author', contactFormValidator, runValidation, contactBlogAuthorForm);

module.exports = router;
