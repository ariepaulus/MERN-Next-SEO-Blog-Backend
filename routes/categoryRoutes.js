const express = require('express');
const router = express.Router();

//* Import controllers
const { requireSignin, adminMiddleware } = require('../controllers/authController');
const { create, list, read, remove } = require('../controllers/categoryController');

//* Import validators
const { runValidation } = require('../validators/indexValidators');
const { categoryCreateValidator } = require('../validators/categoryValidators');

//* Routes
router.post('/category', categoryCreateValidator, runValidation, requireSignin, adminMiddleware, create);
router.get('/categories', list);
router.get('/category/:slug', read);
router.delete('/category/:slug', requireSignin, adminMiddleware, remove);

module.exports = router;
