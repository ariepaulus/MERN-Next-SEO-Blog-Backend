const express = require('express');
const router = express.Router();

//* Controllers
const { requireSignin, adminMiddleware } = require('../controllers/authController');
const { create, list, read, remove } = require('../controllers/tagController');

//* Validators
const { runValidation } = require('../validators/indexValidators');
const { tagCreateValidator } = require('../validators/tagValidators');

//* Routers
router.post('/tag', tagCreateValidator, runValidation, requireSignin, adminMiddleware, create);
router.get('/tags', list);
router.get('/tag/:slug', read);
router.delete('/tag/:slug', requireSignin, adminMiddleware, remove);

module.exports = router;
