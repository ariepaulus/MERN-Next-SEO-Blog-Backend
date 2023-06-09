const formidable = require('formidable');
const slugify = require('slugify');
const _ = require('lodash');
const fs = require('fs');

const { errorHandler } = require('../helpers/dbErrorHandler');
const { smartTrim } = require('../helpers/blogTrimHandler');
const User = require('../models/userModel');
const Blog = require('../models/blogModel');
const Category = require('../models/categoryModel');
const Tag = require('../models/tagModel');

//* Remove all HTML tags from the text.
function stripHtml(text) {
  return text.replace(/<[^>]+>/g, '');
}

exports.create = (req, res) => {
  let form = new formidable.IncomingForm();

  form.keepExtensions = true;
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: 'Image could not be uploaded!',
      });
    }

    const { title, body, categories, tags } = fields;

    if (!title || !title.length) {
      return res.status(400).json({
        error: 'Title is required!',
      });
    }

    if (!body || body.length < 200) {
      return res.status(400).json({
        error: 'There is too little content!',
      });
    }

    if (!categories || categories.length === 0) {
      return res.status(400).json({
        error: 'At least one category is required!',
      });
    }

    if (!tags || tags.length === 0) {
      return res.status(400).json({
        error: 'At least one tag is required!',
      });
    }

    let blog = new Blog();
    blog.title = title;
    blog.body = body;
    blog.excerpt = smartTrim(body, 320, ' ', ' ...');
    blog.slug = slugify(title).toLowerCase();
    blog.mtitle = `${title} | ${process.env.APP_NAME}`;
    blog.mdesc = stripHtml(body.substring(0, 160));
    blog.postedBy = req.auth._id;

    //* Categories and Tags
    let arrayOfCategories = categories && categories.split(',');
    let arrayOfTags = tags && tags.split(',');

    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: 'Image must be less than 1MB in size!',
        });
      }

      blog.photo.data = fs.readFileSync(files.photo.filepath);
      blog.photo.contentType = files.photo.mimetype;
    }

    let result;
    try {
      result = await blog.save();
    } catch (error) {
      return res.status(400).json({
        error: errorHandler(error),
      });
    }

    try {
      await Blog.findByIdAndUpdate(result._id, { $push: { categories: arrayOfCategories } }, { new: true });
    } catch (error) {
      return res.status(400).json({
        error: errorHandler(error),
      });
    }

    try {
      await Blog.findByIdAndUpdate(
        result._id,
        {
          $push: { tags: arrayOfTags },
        },
        { new: true }
      );
    } catch (error) {
      return res.status(400).json({
        error: errorHandler(error),
      });
    }

    return res.json(result);
  });
};

exports.list = async (req, res) => {
  let data;

  try {
    data = await Blog.find({})
      .populate('categories', '_id name slug') //* Sending associated categories with id, name & slug
      .populate('tags', '_id name slug') //* Sending associated tags with id, name & slug
      .populate('postedBy', '_id name username') //* Sending associated blogger with id, name & username
      .select('_id title slug excerpt categories tags postedBy created modified'); //* Selected fields
  } catch (error) {
    return res.json({
      error: errorHandler(error),
    });
  }

  return res.json(data);
};

exports.listAllBlogsCategoriesTags = async (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10; //* Only 10 will be returned each time
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  let blogs;
  let categories;
  let tags;
  let data;

  //* Get all blogs
  try {
    data = await Blog.find({})
      .populate('categories', '_id name slug')
      .populate('tags', '_id name slug')
      .populate('postedBy', '_id name username profile')
      .sort({ created: -1 }) //* Newest blogs first
      .skip(skip)
      .limit(limit)
      .select('_id title slug excerpt categories tags postedBy created modified');
  } catch (error) {
    return res.json({
      error: errorHandler(error),
    });
  }

  blogs = data; //* Blogs

  //* Get all categories

  try {
    data = await Category.find({});
  } catch (error) {
    return res.json({
      error: errorHandler(error),
    });
  }
  categories = data; //* Categories

  //* Get all tags
  try {
    data = await Tag.find({});
  } catch (error) {
    return res.json({
      error: errorHandler(error),
    });
  }
  tags = data; //* Tags

  //* Return all blogs, categories, and tags
  return res.json({ blogs, categories, tags, size: blogs.length }); //* size to be used for load more button
};

exports.read = async (req, res) => {
  // console.log('blogController - read - req params: ', req.params);
  const slug = req.params.slug.toLowerCase();
  let data;

  try {
    data = await Blog.findOne({ slug })
      .select('-photo')
      .populate('categories', '_id name slug')
      .populate('tags', '_id name slug')
      .populate('postedBy', '_id name username')
      .select('_id title body slug mtitle mdesc categories tags postedBy created modified');
  } catch (error) {
    return res.json({
      error: errorHandler(error),
    });
  }

  return res.json(data);
};

exports.remove = async (req, res) => {
  // console.log('blogController - remove = req params: ', req.params);
  const slug = req.params.slug.toLowerCase();

  try {
    await Blog.findOneAndRemove({ slug });
  } catch (error) {
    return res.json({
      error: errorHandler(error),
    });
  }

  return res.status(201).json({
    message: 'Blog was deleted successfully!',
  });
};

exports.update = async (req, res) => {
  // console.log('blogController - update - req params: ', req.params);
  const slug = req.params.slug.toLowerCase();
  let oldBlog;

  try {
    oldBlog = await Blog.findOne({ slug });
    if (!oldBlog) {
      return res.status(400).json({
        message: 'No blog by that name was found!',
      });
    }
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: 'Image could not be uploaded!',
      });
    }
    //* SEO: To ensure that Google still finds the old blog (by merging old with new and keep same slug)
    let slugBeforeMerge = oldBlog.slug;
    oldBlog = _.merge(oldBlog, fields);
    oldBlog.slug = slugBeforeMerge;

    const { body, mdesc, categories, tags } = fields;

    if (body) {
      oldBlog.excerpt = smartTrim(body, 320, ' ', ' ...');
      oldBlog.mdesc = stripHtml(body.substring(0, 160));
    }

    if (categories) {
      oldBlog.categories = categories.split(',');
    }

    if (tags) {
      oldBlog.tags = tags.split(',');
    }

    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({
          error: 'Image must be less than 1MB in size!',
        });
      }
      oldBlog.photo.data = fs.readFileSync(files.photo.filepath);
      oldBlog.photo.contentType = files.photo.mimetype;
    }

    let result;
    try {
      result = await oldBlog.save();
    } catch (error) {
      return res.status(400).json({
        error: errorHandler(error),
      });
    }

    result.photo = undefined;
    return res.json(result);
  });
};

exports.photo = async (req, res) => {
  // console.log('blogController - photo - req params: ', req.params);
  const slug = req.params.slug.toLowerCase();
  let blog;

  try {
    blog = await Blog.findOne({ slug }).select('photo');

    if (!blog) {
      return res.status(400).json({
        message: 'There is no blog by this name!',
      });
    }

    // if (blog.photo.contentType === undefined) {
    //   return res.status(400).json({
    //     message: 'This blog does not have a photo!',
    //   });
    // }
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  res.set('Content-Type', blog.photo.contentType);
  return res.send(blog.photo.data);
};

exports.listRelated = async (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 3;
  const { _id, categories } = req.body.blog;

  let blogs;
  try {
    blogs = await Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
      .limit(limit)
      .populate('postedBy', '_id name username profile')
      .select('title slug excerpt postedBy created modified');
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }
  return res.json(blogs);
};

exports.listSearch = async (req, res) => {
  // console.log('blogController - listSearch: ', req.query);
  const { search } = req.query;
  let blogs;

  if (search) {
    try {
      blogs = await Blog.find({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          {
            body: { $regex: search, $options: 'i' },
          },
        ],
      }).select('-photo -body');
    } catch (error) {
      return res.status(400).json({
        error: errorHandler(error),
      });
    }
  }
  return res.json(blogs);
};

exports.listByUser = async (req, res) => {
  // console.log('blogController - listByUser - req params: ', req.params);
  let user;

  try {
    user = await User.findOne({ username: req.params.username });
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  let userId = user._id;
  let data;

  try {
    data = await Blog.find({ postedBy: userId })
      .populate('categories', '_id name slug')
      .populate('tags', '_id name slug')
      .populate('postedBy', '_id name username')
      .select('_id title slug postedBy created modified');
  } catch (error) {
    return res.status(400).json({
      error: errorHandler(error),
    });
  }

  return res.json(data);
};
