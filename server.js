const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const favicon = require('serve-favicon');
const path = require('path');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

//* Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const tagRoutes = require('./routes/tagRoutes');
const blogRoutes = require('./routes/blogRoutes');
const formRoutes = require('./routes/formRoutes');

const PORT = process.env.PORT || 8000;
require('dotenv').config();

//* Express app
const app = express();

//* Connecting to the database
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful!'))
  .catch(err => {
    console.log('DB connection failed!', err);
  });

//* Middleware for app
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(
    cors({
      origin: [`${process.env.CLIENT_URL}`],
      methods: 'GET, POST, PUT, DELETE, OPTIONS',
    })
  );
}

//* Middleware for setting a favicon
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));

//* Middleware for API routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', categoryRoutes);
app.use('/api', tagRoutes);
app.use('/api', blogRoutes);
app.use('/api', formRoutes);

//* Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}!`);
});
