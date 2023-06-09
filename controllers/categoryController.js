const slugify = require('slugify');

const { errorHandler } = require('../helpers/dbErrorHandler');
const Category = require('../models/categoryModel');
const Blog = require('../models/blogModel');

exports.create = async (req, res) => {
  const { name } = req.body;
  let slug = slugify(name).toLowerCase();

  let category = new Category({ name, slug });
  let data;

  try {
    data = await category.save();
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
    data = await Category.find({});
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  return res.status(201).json(data);
};

exports.read = async (req, res) => {
  // console.log('categoryController - read - req params: ', req.params);
  const slug = req.params.slug.toLowerCase();
  let category;

  try {
    category = await Category.findOne({ slug });
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  let blog;

  try {
    blog = await Blog.find({ categories: category })
      .populate('categories', '_id name slug')
      .populate('tags', '_id name slug')
      .populate('postedBy', '_id name')
      .select('_id title slug excerpt categories postedBy tags created modified');
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  return res.status(201).json({ category: category, blogs: blog });
};

exports.remove = async (req, res) => {
  // console.log('categoryController - remove - req params: ', req.params);
  const slug = req.params.slug.toLowerCase();
  let category;

  try {
    category = await Category.findOne({ slug });
    if (!category) {
      return res.status(400).json({
        message: 'No category by that name was found!',
      });
    }
    await Category.findOneAndRemove({ slug });
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  return res.status(201).json({
    message: `${category.name} was successfully removed!`,
  });
};
