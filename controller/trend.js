const Trend = require('../models/trend');
const Category = require('../models/category');
const Prediction = require('../models/prediction');

exports.getHomepageTrends = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip  = (page - 1) * limit;

    const filter = { isPublished: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.rfciType)  filter.rfciType  = req.query.rfciType;

    const isPremium = req.user?.isPremium || false;

  
    const [trends, total, popularTrends] = await Promise.all([
      Trend.find(filter)
        .select('title slug rfciScore rfciType growthRate status isHidden detectedAt category description')
        .populate('category', 'name slug')
        .sort({ detectedAt: -1 })
        .skip(skip)
        .limit(limit),

      Trend.countDocuments(filter),

      
      Trend.find({ isPublished: true })
        .select('title slug rfciScore rfciType growthRate status detectedAt category description')
        .populate('category', 'name slug')
        .sort({ rfciScore: -1 })
        .limit(6),
    ]);

    const maskTrend = (trend) => {
      if (trend.isHidden && !isPremium) {
        return {
          _id: trend._id,
          isHidden: true,
          isLocked: true,
          category: trend.category,
          detectedAt: trend.detectedAt,
        };
      }
      return trend;
    };

    res.status(200).json({
      page,
      totalPages: Math.ceil(total / limit),
      totalTrends: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
      trends: trends.map(maskTrend),
      popularTrends, 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getLiveTrends = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip  = (page - 1) * limit;

    const filter = { isPublished: true };

    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }


    if (req.query.category) {
     
      const isObjectId = /^[a-f\d]{24}$/i.test(req.query.category);
      if (isObjectId) {
        filter.category = req.query.category;
      } else {
        const cat = await Category.findOne({ slug: req.query.category });
        if (cat) filter.category = cat._id;
        else return res.status(200).json({ page: 1, totalPages: 0, totalTrends: 0, trends: [] });
      }
    }

   
    if (req.query.rfciType) {
      const validTypes = ['impact', 'acceleration', 'widespread'];
      if (validTypes.includes(req.query.rfciType)) {
        filter.rfciType = req.query.rfciType;
      }
    }

   
    if (req.query.status) {
      const validStatuses = ['detected', 'trending', 'peaked', 'dead', 'never_took_off'];
      if (validStatuses.includes(req.query.status)) {
        filter.status = req.query.status;
      }
    } else if (req.query.statusGroup) {
      const groups = {
        correct:   { $in: ['trending', 'peaked', 'dead'] },
        incorrect: 'never_took_off',
        pending:   'detected',
      };
      if (groups[req.query.statusGroup]) {
        filter.status = groups[req.query.statusGroup];
      }
    }
    if (req.query.purpose) {
      const validPurposes = ['seo', 'business_idea', 'content_creation', 'keyword_research'];
      if (validPurposes.includes(req.query.purpose)) {
        filter.purpose = req.query.purpose;
      }
    }
  
    if (req.query.minScore || req.query.maxScore) {
      filter.rfciScore = {};
      if (req.query.minScore) filter.rfciScore.$gte = parseFloat(req.query.minScore);
      if (req.query.maxScore) filter.rfciScore.$lte = parseFloat(req.query.maxScore);
    }

   
    const sortOptions = {
      rfciScore:   { rfciScore: -1 },
      growthRate:  { growthRate: -1 },
      detectedAt:  { detectedAt: -1 },
    };
    const sort = sortOptions[req.query.sortBy] || { detectedAt: -1 };

    const [trends, total] = await Promise.all([
      Trend.find(filter)
      .select('title slug rfciScore rfciType growthRate status isHidden detectedAt category tags purpose')
        .populate('category', 'name slug')
        .populate('tags', 'name type')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Trend.countDocuments(filter),
    ]);

   
    const trendIds = trends.map((t) => t._id);
    const predictions = await Prediction.find({ trend: { $in: trendIds } })
      .select('trend outcome confirmedAt');

    const predictionMap = {};
    predictions.forEach((p) => {
      predictionMap[p.trend.toString()] = {
        outcome: p.outcome,
        confirmedAt: p.confirmedAt,
      };
    });

   
    const isPremium = req.user?.isPremium || false;

    const result = trends.map((trend) => {
      const trendObj = trend.toObject();

    
      trendObj.prediction = predictionMap[trend._id.toString()] || { outcome: 'pending' };

     
      if (trend.isHidden && !isPremium) {
        return {
          _id: trend._id,
          isHidden: true,
          isLocked: true,
          category: trend.category,
          detectedAt: trend.detectedAt,
          prediction: trendObj.prediction,
        };
      }

      return trendObj;
    });

    res.status(200).json({
      page,
      totalPages: Math.ceil(total / limit),
      totalTrends: total,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
      trends: result,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getLiveTrendStats = async (req, res) => {
  try {
    const [correct, incorrect, pending, total, currentlyTrending, totalTrends] = await Promise.all([
      Prediction.countDocuments({ outcome: 'correct' }),
      Prediction.countDocuments({ outcome: 'incorrect' }),
      Prediction.countDocuments({ outcome: 'pending' }),
      Prediction.countDocuments({}),
      Trend.countDocuments({ isPublished: true, status: 'trending' }),
      Trend.countDocuments({ isPublished: true }),
    ]);

    const accuracyRate = (correct + incorrect) > 0
      ? Math.round((correct / (correct + incorrect)) * 100)
      : 0;  

    res.status(200).json({
      correct,
      incorrect,
      pending,
      total,
      accuracyRate,
      currentlyTrending,
      totalTrends,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getTrendBySlug = async (req, res) => {
  try {
    const trend = await Trend.findOne({ slug: req.params.slug, isPublished: true })
      .populate('category', 'name slug')
      .populate('tags', 'name type');

    if (!trend) {
      return res.status(404).json({ message: 'Trend not found' });
    }

    const isPremium = req.user?.isPremium || false;
    if (trend.isHidden && !isPremium) {
      return res.status(403).json({
        message: 'This trend is for premium members only',
        isLocked: true,
      });
    }


    const prediction = await Prediction.findOne({ trend: trend._id })
      .select('outcome confirmedAt peakGrowthRate');

    res.status(200).json({ trend, prediction: prediction || { outcome: 'pending' } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().select('name slug');
    res.status(200).json({ categories });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};










exports.getTrendPageData = async (req, res) => {
    try {
     
      const trend = await Trend.findOne({ slug: req.params.slug, isPublished: true })
        .populate('category', 'name slug')
        .populate('tags', 'name type');
  
      if (!trend) {
        return res.status(404).json({ message: 'Trend not found' });
      }
  
    
      const isPremium = req.user?.isPremium || false;
      if (trend.isHidden && !isPremium) {
        return res.status(403).json({
          message: 'This trend is for premium members only',
          isLocked: true,
          trend: {
            _id: trend._id,
            title: trend.title,
            slug: trend.slug,
            category: trend.category,
            detectedAt: trend.detectedAt,
            isHidden: true,
          },
        });
      }
  
    
      const [
        videos,
        comments,
        evidence,
        relatedTrends,
        prediction,
      ] = await Promise.all([
      
        TrendVideo.find({ trend: trend._id })
          .select('videoUrl creatorHandle viewCount commentCount capturedAt')
          .sort({ viewCount: -1 })
          .limit(20),
  
        
        TrendComment.find({ trend: trend._id })
          .select('platform authorHandle commentText likeCount sourceVideoUrl capturedAt')
          .sort({ likeCount: -1 })
          .limit(30),
  

        TrendEvidence.find({ trend: trend._id })
          .select('platform screenshotUrl pageUrl capturedAt')
          .sort({ capturedAt: 1 }), 
  
        
        RelatedTrend.find({ trend: trend._id, isTrending: true })
          .select('title description platform videoLinks viewCount')
          .limit(5),
  
       
        Prediction.findOne({ trend: trend._id })
          .select('outcome confirmedAt peakGrowthRate'),
      ]);
  
      const hashtags = trend.tags.filter((t) => t.type === 'hashtag').map((t) => t.name);
      const keywords = trend.tags.filter((t) => t.type === 'keyword').map((t) => t.name);
  
     
      const coverageContext = {
        detectedAt: trend.detectedAt,
       
        earliestEvidence: evidence.length > 0 ? evidence[0] : null,
        totalEvidenceItems: evidence.length,
      };
  
      
      res.status(200).json({
        trend: {
          _id: trend._id,
          title: trend.title,
          slug: trend.slug,
          description: trend.description,
          category: trend.category,
          rfciScore: trend.rfciScore,
          rfciType: trend.rfciType,
          growthRate: trend.growthRate,
          status: trend.status,
          detectedAt: trend.detectedAt,
        },
  
        prediction: prediction
          ? {
              outcome: prediction.outcome,      
              confirmedAt: prediction.confirmedAt,
              peakGrowthRate: prediction.peakGrowthRate,
            }
          : { outcome: 'pending' },
  
       
        tiktokComments: comments,
  
       
        videos,
  
      
        hashtags,
        keywords,
  
       
        proof: {
          coverageContext,
          evidence, 
        },
  
       
        relatedTrends,
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };



  

  exports.getPastPredictions = async (req, res) => {
    try {
      const { page = 1, limit = 9 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
  
      const filter = {};
  
      const [predictions, total, totalCorrect, totalIncorrect] = await Promise.all([
        Prediction.find(filter)
          .populate({
            path: 'trend',
            select:
              'title slug description category rfciScore rfciType growthRate status detectedAt daysToViral isHidden',
            populate: { path: 'category', select: 'name slug' },
          })
          .sort({ confirmedAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Prediction.countDocuments(filter),
        Prediction.countDocuments({ outcome: 'correct' }),
        Prediction.countDocuments({ outcome: 'incorrect' }),
      ]);
  
      const resolved = totalCorrect + totalIncorrect;
      const isPremium = req.user?.isPremium || false;
  
      res.json({
        predictions: predictions.map((p) => {
          const trend = p.trend?.toObject?.() || p.trend; 
  
          const maskedTrend = (trend?.isHidden && !isPremium)
            ? {
                _id: trend._id,
                isHidden: true,
                isLocked: true,
                category: trend.category,
                detectedAt: trend.detectedAt,
              }
            : trend;
  
          return {
            prediction: {
              _id: p._id,
              outcome: p.outcome,
              confirmedAt: p.confirmedAt,
              peakGrowthRate: p.peakGrowthRate,
            },
            trend: maskedTrend,
          };
        }),
        hasNextPage: skip + predictions.length < total,
        totalCount: total,
        stats: {
          totalCorrect,
          totalIncorrect,
          accuracyRate: resolved > 0 ? Math.round((totalCorrect / resolved) * 100) : null,
        },
      });
    } catch (err) {
      console.error('getPastPredictions error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  };