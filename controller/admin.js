const Trend = require('../models/trend');
const TrendVideo = require('../models/trendvideo');
const TrendEvidence = require('../models/trendevidence');
const Admin = require('../models/admin');
const User = require('../models/user');
const Prediction = require('../models/prediction');
const Subscription = require('../models/subscription');
const WatchlistItem = require('../models/watchlistem');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Category=require('../models/category')
const Tag = require('../models/tag');
const TrendComment=require('../models/trendcomment')
exports.createTrend = async (req, res) => {
  try {
    const {
      title, description, category, tags,
      rfciScore, rfciType, growthRate,
      status, isHidden, isPublished,
      videos, evidence,purpose
    } = req.body;

    if (!title || !category)
      return res.status(400).json({ message: 'Title and category are required' });

    const slug = title
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existing = await Trend.findOne({ slug });
    if (existing)
      return res.status(400).json({ message: 'A trend with this title already exists' });

   
    let tagIds = [];
    if (tags && tags.length > 0) {
      tagIds = await Promise.all(
        tags.map(async (name) => {
          const trimmed = name.trim();
          let tag = await Tag.findOne({ name: trimmed });
          if (!tag) tag = await Tag.create({ name: trimmed });
          return tag._id;
        })
      );
    }

    const trend = await Trend.create({
      title, slug, description, category,
      tags: tagIds,
      rfciScore, rfciType,
      growthRate: growthRate || 0,
      status: status || 'detected',
      isHidden: isHidden || false,
      isPublished: isPublished || false,
      publishedAt: isPublished ? new Date() : null,
      purpose
    });

    if (videos && videos.length > 0) {
      const videosDocs = videos.map((v) => ({
        trend: trend._id,
        videoUrl: v.videoUrl,
        creatorHandle: v.creatorHandle || '',
        viewCount: v.viewCount || 0,
        commentCount: v.commentCount || 0,
        capturedAt: v.capturedAt || new Date(),
      }));
      await TrendVideo.insertMany(videosDocs);
    }

    if (evidence && evidence.length > 0) {
      const evidenceDocs = evidence.map((e) => ({
        trend: trend._id,
        platform: e.platform,
        screenshotUrl: e.screenshotUrl,
        pageUrl: e.pageUrl || '',
        capturedAt: e.capturedAt || new Date(),
      }));
      await TrendEvidence.insertMany(evidenceDocs);
    }

    res.status(201).json({ message: 'Trend created successfully', trend });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.updateTrend = async (req, res) => {
  try {
    const updates = { ...req.body };

  
    if (updates.tags && updates.tags.length > 0) {
      updates.tags = await Promise.all(
        updates.tags.map(async (name) => {
          const trimmed = name.trim();
          let tag = await Tag.findOne({ name: trimmed });
          if (!tag) tag = await Tag.create({ name: trimmed });
          return tag._id;
        })
      );
    }

    const trend = await Trend.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!trend)
      return res.status(404).json({ message: 'Trend not found' });

    res.json({ message: 'Trend updated', trend });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};




exports.deleteTrend = async (req, res) => {
  try {
    const trend = await Trend.findById(req.params.id);

    if (!trend) {
      return res.status(404).json({ message: 'Trend not found' });
    }

    await TrendVideo.deleteMany({ trend: trend._id });
    await TrendEvidence.deleteMany({ trend: trend._id });
    await trend.deleteOne();

    res.status(200).json({ message: 'Trend and all related data deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getAllTrends = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const trends = await Trend.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Trend.countDocuments();

    res.status(200).json({
      page,
      totalPages: Math.ceil(total / limit),
      total,
      trends,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.addVideo = async (req, res) => {
  try {
    const trend = await Trend.findById(req.params.id);
    if (!trend) {
      return res.status(404).json({ message: 'Trend not found' });
    }

    const { creatorHandle, viewCount, commentCount, capturedAt } = req.body;
    let { videoUrl } = req.body;

    if (req.file) {
      videoUrl = `${process.env.backendurl}/uploads/videos/${req.file.filename}`;
    }

    if (!videoUrl) {
      return res.status(400).json({ message: 'videoUrl or a video file is required' });
    }

    const video = await TrendVideo.create({
      trend: trend._id,
      videoUrl,
      creatorHandle: creatorHandle || '',
      viewCount: viewCount || 0,
      commentCount: commentCount || 0,
      capturedAt: capturedAt || new Date(),
    });

    res.status(201).json({ message: 'Video added', video });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addEvidence = async (req, res) => {
  try {
    const trend = await Trend.findById(req.params.id);
    if (!trend) {
      return res.status(404).json({ message: 'Trend not found' });
    }

    const { platform, pageUrl, capturedAt } = req.body;
    let { screenshotUrl } = req.body;

   
    if (req.file) {
      screenshotUrl = `${process.env.backendurl}/uploads/images/${req.file.filename}`;
    }

    if (!platform) {
      return res.status(400).json({ message: 'platform is required' });
    }

    if (!screenshotUrl) {
      return res.status(400).json({ message: 'screenshotUrl or an image file is required' });
    }

    const evidence = await TrendEvidence.create({
      trend: trend._id,
      platform,
      screenshotUrl,
      pageUrl: pageUrl || '',
      capturedAt: capturedAt || new Date(),
    });

    res.status(201).json({ message: 'Evidence added', evidence });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.createAdmin = async (req, res) => {
  try {
  
    const { email, password } = req.body;
   

    if (!email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const existing = await Admin.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Admin already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ email, password: hashed });

    res.status(201).json({ message: 'Admin created successfully', admin });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: 'Login successful', token, admin });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const [trends, users, subscriptions, predictions] = await Promise.all([
      Trend.countDocuments(),
      User.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Prediction.countDocuments(),
    ]);

    res.status(200).json({ trends, users, activeSubscriptions: subscriptions, predictions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};




exports.createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug)
      return res.status(400).json({ message: 'Name and slug are required' });

    const exists = await Category.findOne({ $or: [{ name }, { slug }] });
    if (exists)
      return res.status(409).json({ message: 'Category with this name or slug already exists' });

    const category = await Category.create({ name, slug });
    res.status(201).json({ message: 'Category created', category });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json({ categories });
  } catch (err) {
    console.log(err.message)
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category)
      return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};




exports.getTrendById = async (req, res) => {
  try {
   
    const trend = await Trend.findById(req.params.id)
      .populate('category')
      .populate('tags');

    
    if (!trend) {
      return res.status(404).json({ message: 'Trend not found.' });
    }

    res.json({ trend });
  } catch (err) {
    console.error('GET /trend/:id error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};
exports.createTag = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name)
      return res.status(400).json({ message: 'Name is required' });

    const exists = await Tag.findOne({ name });
    if (exists)
      return res.status(409).json({ message: 'Tag already exists' });

    const tag = await Tag.create({ name, type });
    res.status(201).json({ message: 'Tag created', tag });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ createdAt: -1 });
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateTag = async (req, res) => {
  try {
    const { name, type } = req.body;
    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { name, type },
      { new: true, runValidators: true }
    );
    if (!tag)
      return res.status(404).json({ message: 'Tag not found' });
    res.json({ message: 'Tag updated', tag });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag)
      return res.status(404).json({ message: 'Tag not found' });
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};




exports.getAllPredictionsAdmin = async (req, res) => {
  try {
    const { outcome, search } = req.query;
 
   
    const predFilter = {};
    if (outcome && ['correct', 'incorrect', 'pending'].includes(outcome)) {
      predFilter.outcome = outcome;
    }
 
  
    let trendIdFilter = null;
    if (search && search.trim()) {
      const matchingTrends = await Trend.find({
        title: { $regex: search.trim(), $options: 'i' },
      }).select('_id');
      trendIdFilter = matchingTrends.map((t) => t._id);
      predFilter.trend = { $in: trendIdFilter };
    }
 
    const predictions = await Prediction.find(predFilter)
      .populate({
        path: 'trend',
        select: 'title slug category rfciScore rfciType growthRate status detectedAt daysToViral',
        populate: { path: 'category', select: 'name slug' },
      })
      .sort({ createdAt: -1 });
 
   
    const allPredictions = await Prediction.find({});
    const totalCorrect = allPredictions.filter((p) => p.outcome === 'correct').length;
    const totalIncorrect = allPredictions.filter((p) => p.outcome === 'incorrect').length;
    const resolved = totalCorrect + totalIncorrect;
    const accuracyRate = resolved > 0 ? Math.round((totalCorrect / resolved) * 100) : null;
 
    res.json({
      predictions,
      stats: {
        total: allPredictions.length,
        totalCorrect,
        totalIncorrect,
        totalPending: allPredictions.filter((p) => p.outcome === 'pending').length,
        accuracyRate,
      },
    });
  } catch (err) {
    console.error('getAllPredictionsAdmin error:', err);
    res.status(500).json({ message: 'Server error fetching predictions.' });
  }
};
 
exports.createPrediction = async (req, res) => {
  try {
    const { trendId, outcome, confirmedAt, peakGrowthRate, notes } = req.body;
 
    if (!trendId) {
      return res.status(400).json({ message: 'trendId is required.' });
    }
 
    const trend = await Trend.findById(trendId);
    if (!trend) {
      return res.status(404).json({ message: 'Trend not found.' });
    }
 
  
    const existing = await Prediction.findOne({ trend: trendId });
    if (existing) {
      return res.status(409).json({
        message: 'A prediction already exists for this trend. Use PATCH to update it.',
      });
    }
 
    
    let daysToViral = null;
    if (confirmedAt && trend.detectedAt) {
      const diff = new Date(confirmedAt) - new Date(trend.detectedAt);
      daysToViral = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
    }
 

    const prediction = await Prediction.create({
      trend: trendId,
      outcome: outcome || 'pending',
      confirmedAt: confirmedAt ? new Date(confirmedAt) : undefined,
      peakGrowthRate: peakGrowthRate != null ? Number(peakGrowthRate) : undefined,
      notes: notes || '',
    });
 
   
    if (daysToViral !== null) {
      await Trend.findByIdAndUpdate(trendId, { daysToViral });
    }
 
    
    const populated = await prediction.populate({
      path: 'trend',
      select: 'title slug category rfciScore rfciType growthRate status detectedAt daysToViral',
      populate: { path: 'category', select: 'name slug' },
    });

    
    res.status(201).json({ prediction: populated });
  } catch (err) {
    console.error('createPrediction error:', err);
    res.status(500).json({ message: 'Server error creating prediction.' });
  }
};
 
exports.updatePrediction = async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, confirmedAt, peakGrowthRate, notes } = req.body;
 
    const prediction = await Prediction.findById(id).populate('trend');
    if (!prediction) {
      return res.status(404).json({ message: 'Prediction not found.' });
    }
 
 
    if (outcome !== undefined) prediction.outcome = outcome;
    if (confirmedAt !== undefined) prediction.confirmedAt = confirmedAt ? new Date(confirmedAt) : null;
    if (peakGrowthRate !== undefined) prediction.peakGrowthRate = peakGrowthRate != null ? Number(peakGrowthRate) : null;
    if (notes !== undefined) prediction.notes = notes;
 
    await prediction.save();
 
    const trend = prediction.trend;
    if (prediction.confirmedAt && trend?.detectedAt) {
      const diff = new Date(prediction.confirmedAt) - new Date(trend.detectedAt);
      const daysToViral = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
      await Trend.findByIdAndUpdate(trend._id, { daysToViral });
    }
 
  
    const updated = await Prediction.findById(id).populate({
      path: 'trend',
      select: 'title slug category rfciScore rfciType growthRate status detectedAt daysToViral',
      populate: { path: 'category', select: 'name slug' },
    });
 
    res.json({ prediction: updated });
  } catch (err) {
    console.error('updatePrediction error:', err);
    res.status(500).json({ message: 'Server error updating prediction.' });
  }
};
 
exports.deletePrediction = async (req, res) => {
  try {
    const { id } = req.params;
 
    const prediction = await Prediction.findByIdAndDelete(id);
    if (!prediction) {
      return res.status(404).json({ message: 'Prediction not found.' });
    }
 
    res.json({ message: 'Prediction deleted successfully.', deletedId: id });
  } catch (err) {
    console.error('deletePrediction error:', err);
    res.status(500).json({ message: 'Server error deleting prediction.' });
  }
};




exports.getTrendPrediction = async (req, res) => {
  try {
    const prediction = await Prediction.findOne({ trend: req.params.id });
    res.json({ prediction: prediction || null });
  } catch (err) {
    console.error('GET /admin/trends/:id/prediction error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getTrendComments = async (req, res) => {
  try {
    const comments = await TrendComment.find({ trend: req.params.id })
      .sort({ capturedAt: -1 })
      .limit(50);
    res.json({ comments });
  } catch (err) {
    console.error('GET /admin/trends/:id/comments error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getTrendVideos = async (req, res) => {
  try {
    const videos = await TrendVideo.find({ trend: req.params.id })
      .sort({ viewCount: -1, capturedAt: -1 })
      .limit(20);
    res.json({ videos });
  } catch (err) {
    console.error('GET /admin/trends/:id/videos error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getTrendEvidence = async (req, res) => {
  try {
    const evidence = await TrendEvidence.find({ trend: req.params.id })
      .sort({ capturedAt: -1 });
    res.json({ evidence });
  } catch (err) {
    console.error('GET /admin/trends/:id/evidence error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};





exports.addComment = async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.file) {
      body.sourceVideoUrl = `${process.env.backendurl}/uploads/videos/${req.file.filename}`;
    }
    const comment = await TrendComment.create({ trend: req.params.id, ...body });
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};


exports.deleteComment = async (req, res) => {
  try {
    await TrendComment.findByIdAndDelete(req.params.cid);
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};



exports.deleteEvidence = async (req, res) => {
  try {
    await TrendEvidence.findByIdAndDelete(req.params.eid);
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    await TrendVideo.findByIdAndDelete(req.params.vid);
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};