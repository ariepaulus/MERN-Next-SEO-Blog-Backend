const express = require('express');
const router = express.Router();

//* Import auth controllers
const {
  requireSignin,
  adminMiddleware,
  authMiddleware,
  canUpdateDeleteBlog,
} = require('../controllers/authController');

//* Import blog controllers
const {
  create,
  list,
  listAllBlogsCategoriesTags,
  read,
  remove,
  update,
  photo,
  listRelated,
  listSearch,
  listByUser,
} = require('../controllers/blogController');

//* Routes
//? For administrator
router.post('/blog', requireSignin, adminMiddleware, create);
router.delete('/blog/:slug', requireSignin, adminMiddleware, remove);
router.put('/blog/:slug', requireSignin, adminMiddleware, update);

//? For all users
//! Note 'POST' routes are needed for queries to 'get' all blogs, categories & tags; and to 'get' related blogs
router.get('/blogs', list);
router.get('/blog/:slug', read);
router.post('/blogs-categories-tags', listAllBlogsCategoriesTags);
router.get('/blog/photo/:slug', photo);
router.post('/blogs/related', listRelated);
router.get('/blogs/search', listSearch);

//? CRUD for logged-in users
router.post('/user/blog', requireSignin, authMiddleware, create);
router.get('/:username/blogs', listByUser);
router.put('/user/blog/:slug', requireSignin, authMiddleware, canUpdateDeleteBlog, update);
router.delete('/user/blog/:slug', requireSignin, authMiddleware, canUpdateDeleteBlog, remove);

module.exports = router;
