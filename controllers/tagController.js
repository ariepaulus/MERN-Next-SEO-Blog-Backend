const slugify = require('slugify');

const { errorHandler } = require('../helpers/dbErrorHandler');
const Tag = require('../models/tagModel');
const Blog = require('../models/blogModel');

exports.create = async (req, res) => {
  const { name } = req.body;
  let slug = slugify(name).toLowerCase();

  let tag = new Tag({ name, slug });
  let data;

  try {
    data = await tag.save();
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  return res.status(201).json(data);
};

exports.list = async (req, res) => {
  let data;
  try {
    data = await Tag.find({});
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  return res.status(201).json(data);
};

exports.read = async (req, res) => {
  // console.log('tagController - read - req params: ', req.params);
  const slug = req.params.slug.toLowerCase();
  let tag;

  try {
    tag = await Tag.findOne({ slug });
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  let blog;

  try {
    blog = await Blog.find({ tags: tag })
      .populate('categories', '_id name slug')
      .populate('tags', '_id name slug')
      .populate('postedBy', '_id name')
      .select('_id title slug excerpt categories postedBy tags created modified');
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  return res.status(201).json({ tag: tag, blogs: blog });
};

exports.remove = async (req, res) => {
  // console.log('tagController - remove - req params: ', req.params);
  const slug = req.params.slug.toLowerCase();
  let tag;

  try {
    tag = await Tag.findOne({ slug });
    if (!tag) {
      return res.status(400).json({
        message: 'No tag by that name was found!',
      });
    }
    await Tag.findOneAndRemove({ slug });
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  return res.status(201).json({
    message: `${tag.name} was successfully removed!`,
  });
};
