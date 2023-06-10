const formidable = require('formidable');
const _ = require('lodash');
const fs = require('fs');

const User = require('../models/userModel');
const Blog = require('../models/blogModel');
const { errorHandler } = require('../helpers/dbErrorHandler');

//* Private profile: /user/profile (requires signed-in user with token)
exports.read = (req, res) => {
  req.profile.hashed_password = undefined;
  return res.json(req.profile);
};

//* Public profile: url: /user/:username (accessible to any visitor to website by clicking on blog author's name)
exports.publicProfile = async (req, res) => {
  // console.log('userController - publicProfile - req params: ', req.params);
  let username = req.params.username;
  let userFromDB;
  try {
    userFromDB = await User.findOne({ username });
  } catch (error) {
    return res.status(400).json({
      error: 'User not found!',
    });
  }

  let user = userFromDB;
  // console.log('userController - publicProfile - userFromDB: ', user);

  let data;
  try {
    data = await Blog.find({ postedBy: user._id })
      .select('-photo')
      .select('-hashed_password')
      .populate('categories', '_id name slug')
      .populate('tags', '_id name slug')
      .populate('postedBy', '_id name')
      .limit(10)
      .select('_id title slug excerpt categories tags postedBy created modified');
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  // console.log('userController - publicProfile - data for specific userId: ', data);
  user.photo = undefined;
  user.hashed_password = undefined;
  return res.json({
    user,
    blogs: data,
  });
};

//* Update private profile
exports.update = async (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: 'Photo could not be uploaded!',
      });
    }
    let user = req.profile;

    //* User's existing role and email before update
    let existingRole = user.role;
    let existingEmail = user.email;

    if (fields && fields.username && fields.username.length > 12) {
      return res.status(400).json({
        error: 'Username should not be longer than 12 characters!',
      });
    }

    if (fields.password && fields.password.length < 6) {
      return res.status(400).json({
        error: 'Password should be at least six characters long!',
      });
    }

    //* Update fields that have been changed
    user = _.extend(user, fields);

    //* User's role and email cannot be changed
    user.role = existingRole;
    user.email = existingEmail;

    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: 'Image may not be more than 1MB in size!',
        });
      }
      user.photo.data = fs.readFileSync(files.photo.filepath);
      user.photo.contentType = files.photo.mimetype;
    }

    try {
      await user.save();
    } catch (error) {
      return res.status(400).json({
        error: errorHandler(error),
      });
    }

    user.hashed_password = undefined;
    user.salt = undefined;
    user.photo = undefined;
    return res.json(user);
  });
};

exports.photo = async (req, res) => {
  // console.log('userController - photo - req params: ', req.params);
  const username = req.params.username;
  let user;
  try {
    user = await User.findOne({ username });
  } catch (error) {
    return res.status(400).json({
      error: `User with this username: ${user}, could not be found!`,
    });
  }

  if (user && user.photo.data) {
    res.set('Content-Type', user.photo.contentType);
    return res.send(user.photo.data);
  }
};
