const shortId = require('shortid');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');
const _ = require('lodash');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/userModel');
const Blog = require('../models/blogModel');
const { errorHandler } = require('../helpers/dbErrorHandler');

exports.preSignup = async (req, res) => {
  //* Get user details from request body
  const { name, email, password } = req.body;
  //* Check if the user already exists
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    return res.status(400).json({
      error: 'Email is taken',
    });
  } else {
    //* Generate a jsonwebtoken and send it to client
    const token = jwt.sign({ name, email, password }, process.env.JWT_ACCOUNT_ACTIVATION, {
      expiresIn: '10m',
    });

    //* Send email client
    const emailData = {
      to: email,
      from: process.env.EMAIL_FROM, //* Verified sender for my SendGrid account
      subject: `Account activation link`,
      html: `
      <p>To activate your account, please use the following link:</p>
      <p>${process.env.CLIENT_URL}/auth/account/activate/${token}</p>
      <hr />
      <p>This email may contain sensitive information</p>
      <p>https://seoblog.com</p>
    `,
    };

    sgMail.send(emailData).then(sent => {
      return res.status(201).json({
        message: `An email has been sent to ${email}. Please follow the instructions to activate your account!`,
      });
    });
  }
};

exports.signup = async (req, res) => {
  //* Get user details from request body
  const { name, email, password } = req.body;
  //* Check if the user already exists
  const user = await User.findOne({ email: email });
  if (user) {
    return res.status(400).json({ message: 'User already exists' });
  } else {
    //* Generate a short ID for the user
    let username = shortId.generate();
    let profile = `${process.env.CLIENT_URL}/profile/${username}`;
    //* Create a new user
    let newUser = new User({
      name,
      email,
      password,
      profile,
      username,
    });
    //* Save the user to the database
    await newUser.save();
    //* Send response to user
    return res.status(201).json({
      message: 'You have signed up successfully! Please sign in.',
    });
  }
};

exports.signin = async (req, res) => {
  //* Get user email and password from request body
  const { email, password } = req.body;
  //* Check if user exists
  const user = await User.findOne({ email: email });
  if (!user) {
    return res.status(400).json({
      error: 'User with that email does not exist! Please sign up first.',
    });
  } else {
    //* Authenticate matching of user's email and password
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: 'Authentication failed! Please try again.',
      });
    }
    //* Generate a jsonwebtoken consisting of user id and secret
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.cookie('token', token, { expiresIn: process.env.JWT_COOKIE_EXPIRES_IN, algorithm: 'HS256' });
    const { _id, username, name, email, role } = user;
    return res.status(201).json({
      token,
      user: { _id, username, name, email, role },
    });
  }
};

exports.signout = async (req, res) => {
  res.clearCookie('token');
  return res.status(201).json({
    message: 'You have signed out successfully!',
  });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  userProperty: 'auth',
});

exports.authMiddleware = async (req, res, next) => {
  const authUserId = req.auth._id;

  if (!authUserId) {
    return res.status(400).json({
      error: 'User id is undefined!',
    });
  }
  const user = await User.findById({ _id: authUserId });
  if (!user) {
    return res.status(400).json({
      error: 'The user could not be found!',
    });
  }
  req.profile = user;
  next();
};

exports.adminMiddleware = async (req, res, next) => {
  const adminUserId = req.auth._id;
  const user = await User.findById({ _id: adminUserId });
  if (!user) {
    return res.status(400).json({
      error: 'User not found!',
    });
  }
  if (user.role !== 1) {
    return res.status(400).json({
      error: 'The user is not an administrator. Access denied!',
    });
  }
  req.profile = user;
  next();
};

exports.canUpdateDeleteBlog = async (req, res, next) => {
  // console.log('authController - canUpdateDeleteBlog - req params: ', req.params);
  const slug = req.params.slug.toLowerCase();
  let data;

  try {
    data = await Blog.findOne({ slug });
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(err),
    });
  }

  let authorisedUser = data.postedBy._id.toString() === req.profile._id.toString();
  if (!authorisedUser) {
    return res.status(400).json({
      error: 'You are not authorised to perform this action!',
    });
  }
  next();
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({
      error: 'User with this email does not exist!',
    });
  }
  const token = jwt.sign({ _id: user._id }, process.env.JWT_RESET_PASSWORD, {
    expiresIn: '10m',
  });

  const emailData = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: `Password reset link`,
    html: `
      <p>To reset your password, please use the following link:</p>
      <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
      <hr />
      <p>This email may contain sensitive information</p>
      <p>https://seoblog.com</p>
    `,
  };

  try {
    await user.updateOne({ resetPasswordLink: token });
  } catch (error) {
    return res.json({ error: errorHandler(error) });
  }

  sgMail.send(emailData).then(sent => {
    return res.status(201).json({
      message: `An email has been sent to ${email}. Please follow the instructions to reset your password. The reset link expires in 10 minutes!`,
    });
  });
};

exports.resetPassword = async (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  if (resetPasswordLink) {
    jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function (err, decoded) {
      if (err) {
        return res.status(401).json({
          error: 'Expired link! Please try again.',
        });
      }
    });

    let user;
    try {
      user = await User.findOne({ resetPasswordLink });
    } catch (error) {
      if (error) {
        return res.status(401).json({
          error: 'Something went wrong! Please try again.',
        });
      }
    }

    const updatedFields = {
      password: newPassword,
      resetPasswordLink: '',
    };

    user = _.extend(user, updatedFields);

    try {
      await user.save();
    } catch (error) {
      return res.status(400).json({
        error: errorHandler(error),
      });
    }

    return res.status(201).json({
      message: 'Success! Now you can log in with your new password.',
    });
  }
};

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    return { payload: ticket.getPayload() };
  } catch (error) {
    return { error: 'Invalid user detected. Please try again' };
  }
}

exports.googleLogin = async (req, res) => {
  try {
    // console.log(req.body.tokenId);
    let verificationResponse;
    try {
      verificationResponse = await verifyGoogleToken(req.body.tokenId);
    } catch (error) {
      console.log(error);
    }

    const profile = verificationResponse?.payload;
    // console.log(profile);
    const { email_verified, name, email, jti } = profile;

    let user;
    if (email_verified) {
      try {
        user = await User.findOne({ email });
      } catch (error) {
        return res.status(400).json({
          error: errorHandler(error),
        });
      }
      if (user) {
        // console.log(user);
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, { expiresIn: '1d' });
        const { _id, email, name, role, username } = user;
        return res.json({ token, user: { _id, email, name, role, username } });
      } else {
        let username = shortId.generate();
        let profile = `${process.env.CLIENT_URL}/profile/${username}`;
        let password = jti;
        let user;
        user = new User({ name, email, profile, username, password });
        let data;
        try {
          data = await user.save();
          const token = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
          res.cookie('token', token, { expiresIn: '1d' });
          const { _id, email, name, role, username } = data;
          return res.json({ token, user: { _id, email, name, role, username } });
        } catch (error) {
          return res.status(400).json({
            error: errorHandler(error),
          });
        }
      }
    }
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred! Registration failed.',
    });
  }
};
