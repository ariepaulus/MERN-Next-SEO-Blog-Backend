const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema;

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      minLength: 3,
      maxLength: 160,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    body: {
      type: {},
      required: true,
      minLength: 200,
      maxLength: 2000000,
    },
    excerpt: {
      type: String,
      maxLength: 1000,
    },
    mtitle: {
      type: String,
    },
    mdesc: {
      type: String,
    },
    photo: {
      data: Buffer,
      contentType: String,
    },
    categories: [
      {
        type: ObjectId,
        ref: 'Category',
        required: true,
      },
    ],
    tags: [
      {
        type: ObjectId,
        ref: 'Tag',
        required: true,
      },
    ],
    postedBy: {
      type: ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: {
      createdAt: 'created',
      updatedAt: 'modified',
    },
  }
);

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
