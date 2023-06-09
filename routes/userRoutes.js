const express = require('express');
const router = express.Router();

//* Import controllers
const { requireSignin, authMiddleware } = require('../controllers/authController');
const { read, publicProfile, update, photo } = require('../controllers/userController');

//* Routes
router.get('/user/profile', requireSignin, authMiddleware, read); //* Private profile
router.get('/user/:username', publicProfile); //* Public profile - 'username' is unique
router.put('/user/update', requireSignin, authMiddleware, update); //* Update user (private) profile
router.get('/user/photo/:username', photo); //* To get user profile photo

module.exports = router;
