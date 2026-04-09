const User          = require('../models/user');
const WatchlistItem = require('../models/watchlistem');
const Trend         = require('../models/trend');
const Prediction    = require('../models/prediction');
const Category      = require('../models/category');
const Admin=require('../models/admin')
const bcrypt = require('bcryptjs');


const nodemailer = require('nodemailer')

exports.getAccountDashboard = async (req, res) => {
  try {
   
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('settings.preferredCategories', 'name slug');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

   
    const watchlistItems = await WatchlistItem.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'trend',
        select: 'title slug category rfciScore rfciType growthRate status detectedAt isHidden',
        populate: { path: 'category', select: 'name slug' },
      });

    
    const trendIds = watchlistItems
      .filter((w) => w.trend) 
      .map((w) => w.trend._id);

    const predictions = await Prediction.find({ trend: { $in: trendIds } })
      .select('trend outcome confirmedAt peakGrowthRate');

    const predictionMap = {};
    predictions.forEach((p) => {
      predictionMap[p.trend.toString()] = {
        outcome:        p.outcome,
        confirmedAt:    p.confirmedAt,
        peakGrowthRate: p.peakGrowthRate,
      };
    });

    const watchlist = watchlistItems
      .filter((w) => w.trend) 
      .map((w) => ({
        watchlistItemId: w._id,
        addedAt:         w.createdAt,
        trend: {
          _id:        w.trend._id,
          title:      w.trend.title,
          slug:       w.trend.slug,
          category:   w.trend.category,
          rfciScore:  w.trend.rfciScore,
          rfciType:   w.trend.rfciType,
          growthRate: w.trend.growthRate,
          status:     w.trend.status,    
          detectedAt: w.trend.detectedAt,
          isHidden:   w.trend.isHidden,
        },
        prediction: predictionMap[w.trend._id.toString()] || { outcome: 'pending' },
      }));

    const watchlistStats = {
      total:      watchlist.length,
      trending:   watchlist.filter((w) => w.trend.status === 'trending').length,
      correct:    watchlist.filter((w) => w.prediction.outcome === 'correct').length,
      pending:    watchlist.filter((w) => w.prediction.outcome === 'pending').length,
      incorrect:  watchlist.filter((w) => w.prediction.outcome === 'incorrect').length,
    };

    res.status(200).json({
      user: {
        id:        user._id,
        name:      user.name,
        email:     user.email,
        isPremium: user.isPremium,
        role:      user.role,
        createdAt: user.createdAt,
      },

      
      settings: user.settings,

    
      watchlistStats,
      watchlist,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.addToWatchlist = async (req, res) => {
  try {
    const { trendId } = req.params;


    const trend = await Trend.findOne({ _id: trendId, isPublished: true });
    if (!trend) {
      return res.status(404).json({ message: 'Trend not found' });
    }

  
    if (trend.isHidden && !req.user.isPremium) {
      return res.status(403).json({ message: 'Upgrade to premium to watchlist this trend' });
    }

  
    const item = await WatchlistItem.create({
      user:  req.user.id,
      trend: trendId,
    });

    res.status(201).json({
      message: 'Added to watchlist',
      watchlistItemId: item._id,
    });
  } catch (err) {
  
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Trend is already in your watchlist' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.removeFromWatchlist = async (req, res) => {
  try {
    const deleted = await WatchlistItem.findOneAndDelete({
      user:  req.user.id,
      trend: req.params.trendId,
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Item not found in your watchlist' });
    }

    res.status(200).json({ message: 'Removed from watchlist' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



exports.updateSettings = async (req, res) => {
  try {
    const { preferredCategories, preferredRfciType, emailNotifications } = req.body;

  
    const settingsUpdate = {};

    if (preferredCategories !== undefined) {
    
      if (!Array.isArray(preferredCategories)) {
        return res.status(400).json({ message: 'preferredCategories must be an array' });
      }
      const validCategories = await Category.find({ _id: { $in: preferredCategories } });
      if (validCategories.length !== preferredCategories.length) {
        return res.status(400).json({ message: 'One or more category IDs are invalid' });
      }
      settingsUpdate['settings.preferredCategories'] = preferredCategories;
    }

    if (preferredRfciType !== undefined) {
      const valid = ['impact', 'acceleration', 'widespread', null];
      if (!valid.includes(preferredRfciType)) {
        return res.status(400).json({ message: 'Invalid preferredRfciType value' });
      }
      settingsUpdate['settings.preferredRfciType'] = preferredRfciType;
    }

    if (emailNotifications !== undefined) {
      const { newTrendAlerts, predictionConfirmed, weeklyDigest } = emailNotifications;
      if (newTrendAlerts      !== undefined) settingsUpdate['settings.emailNotifications.newTrendAlerts']      = newTrendAlerts;
      if (predictionConfirmed !== undefined) settingsUpdate['settings.emailNotifications.predictionConfirmed'] = predictionConfirmed;
      if (weeklyDigest        !== undefined) settingsUpdate['settings.emailNotifications.weeklyDigest']        = weeklyDigest;
    }

    if (Object.keys(settingsUpdate).length === 0) {
      return res.status(400).json({ message: 'No valid settings fields provided' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: settingsUpdate },
      { new: true, runValidators: true }
    )
      .select('settings')
      .populate('settings.preferredCategories', 'name slug');

    res.status(200).json({
      message:  'Settings updated successfully',
      settings: user.settings,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};




exports.createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = await Admin.create({ email, password: hashed });

    res.status(201).json({ message: 'Admin created successfully', adminId: admin._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: { id: admin._id, email: admin.email },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



exports.getDashboard = async (req, res) => {
  try {

   
    const totalUsers    = await User.countDocuments();
    const premiumUsers  = await User.countDocuments({ isPremium: true });
    const freeUsers     = totalUsers - premiumUsers;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsers      = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

   
    const totalTrends     = await Trend.countDocuments();
    const publishedTrends = await Trend.countDocuments({ isPublished: true });
    const hiddenTrends    = await Trend.countDocuments({ isHidden: true });
    const draftTrends     = await Trend.countDocuments({ isPublished: false });


    const trendsByStatus = await Trend.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    
    const trendsByCategory = await Trend.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      { $project: { categoryName: '$category.name', count: 1, _id: 0 } },
    ]);

   
    const newTrends = await Trend.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

   
    const totalPredictions     = await Prediction.countDocuments();
    const correctPredictions   = await Prediction.countDocuments({ outcome: 'correct' });
    const incorrectPredictions = await Prediction.countDocuments({ outcome: 'incorrect' });
    const pendingPredictions   = await Prediction.countDocuments({ outcome: 'pending' });

    const accuracy = totalPredictions > 0
      ? ((correctPredictions / totalPredictions) * 100).toFixed(1)
      : 0;

 
    const activeSubscriptions    = await Subscription.countDocuments({ status: 'active', plan: 'pro' });
    const cancelledSubscriptions = await Subscription.countDocuments({ status: 'cancelled' });

   
    const totalWatchlistSaves = await WatchlistItem.countDocuments();

  
    const mostSavedTrends = await WatchlistItem.aggregate([
      { $group: { _id: '$trend', saves: { $sum: 1 } } },
      { $sort: { saves: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'trends',
          localField: '_id',
          foreignField: '_id',
          as: 'trend',
        },
      },
      { $unwind: '$trend' },
      { $project: { trendTitle: '$trend.title', trendSlug: '$trend.slug', saves: 1, _id: 0 } },
    ]);

   
    const recentTrends = await Trend.find({ isPublished: true })
      .select('title slug status rfciScore growthRate createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

 
    const recentUsers = await User.find()
      .select('name email isPremium createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      users: {
        total: totalUsers,
        premium: premiumUsers,
        free: freeUsers,
        newLast30Days: newUsers,
      },
      trends: {
        total: totalTrends,
        published: publishedTrends,
        hidden: hiddenTrends,
        drafts: draftTrends,
        newLast30Days: newTrends,
        byStatus: trendsByStatus,
        byCategory: trendsByCategory,
      },
      predictions: {
        total: totalPredictions,
        correct: correctPredictions,
        incorrect: incorrectPredictions,
        pending: pendingPredictions,
        accuracyPercent: accuracy,
      },
      subscriptions: {
        active: activeSubscriptions,
        cancelled: cancelledSubscriptions,
      },
      watchlist: {
        totalSaves: totalWatchlistSaves,
        mostSavedTrends,
      },
      recentTrends,
      recentUsers,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
exports.getCurrentAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const watchlist = await WatchlistItem.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'trend',
        select: 'title slug category rfciScore rfciType growthRate status detectedAt',
        populate: { path: 'category', select: 'name slug' },
      });

    return res.status(200).json({ user, watchlist });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      avatar,
      preferredCategories,
      preferredRfciType,
      emailNotifications,
    } = req.body;

    const updateFields = {};

    if (name)   updateFields.name   = name.trim();
    if (avatar) updateFields.avatar = avatar.trim();

    
    if (preferredCategories !== undefined)
      updateFields['settings.preferredCategories'] = preferredCategories;

    if (preferredRfciType !== undefined)
      updateFields['settings.preferredRfciType'] = preferredRfciType;

    if (emailNotifications !== undefined) {
      const { newTrendAlerts, predictionConfirmed, weeklyDigest } = emailNotifications;
      if (newTrendAlerts      !== undefined) updateFields['settings.emailNotifications.newTrendAlerts']      = newTrendAlerts;
      if (predictionConfirmed !== undefined) updateFields['settings.emailNotifications.predictionConfirmed'] = predictionConfirmed;
      if (weeklyDigest        !== undefined) updateFields['settings.emailNotifications.weeklyDigest']        = weeklyDigest;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('settings.preferredCategories', 'name');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatar: avatarUrl } },
      { new: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Avatar updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both current and new password are required' });

    if (newPassword.length < 8)
      return res.status(400).json({ message: 'New password must be at least 8 characters' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Current password is incorrect' });

    const salt         = await bcrypt.genSalt(10);
    user.password      = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



exports.contactSupport = async (req, res) => {
  try {
    const { name, email, message } = req.body

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Name, email and message are required.' })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    })

   
    await transporter.sendMail({
      from:    `"TikTokSlang Support" <${process.env.SMTP_EMAIL}>`,
      to:      process.env.SMTP_EMAIL,
      subject: `New Support Message from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:12px;">
          <h2 style="color:#000;margin-bottom:4px;">New Support Request</h2>
          <p style="color:#666;font-size:13px;margin-bottom:24px;">Received via TikTokSlang contact form</p>

          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#888;font-size:13px;width:100px;">Name</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#111;font-size:14px;font-weight:600;">${name}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#888;font-size:13px;">Email</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#111;font-size:14px;font-weight:600;">${email}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#888;font-size:13px;vertical-align:top;">Message</td>
              <td style="padding:10px 0;color:#111;font-size:14px;line-height:1.6;">${message.replace(/\n/g, '<br/>')}</td>
            </tr>
          </table>

          <div style="margin-top:24px;padding:12px 16px;background:#D4F244;border-radius:8px;display:inline-block;">
            <a href="mailto:${email}" style="color:#000;font-weight:700;font-size:13px;text-decoration:none;">
              Reply to ${name} →
            </a>
          </div>
        </div>
      `,
    })


    await transporter.sendMail({
      from:    `"TikTokSlang" <${process.env.SMTP_EMAIL}>`,
      to:      email,
      subject: `We received your message — TikTokSlang Support`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:12px;">
          <h2 style="color:#000;margin-bottom:4px;">Hey ${name}, we got your message 👋</h2>
          <p style="color:#666;font-size:14px;line-height:1.6;margin-bottom:24px;">
            Thanks for reaching out. Our team will get back to you within 24 hours.
          </p>

          <div style="background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="color:#888;font-size:12px;margin:0 0 6px;">Your message</p>
            <p style="color:#111;font-size:14px;line-height:1.6;margin:0;">${message.replace(/\n/g, '<br/>')}</p>
          </div>

          <p style="color:#999;font-size:12px;">— The TikTokSlang Team</p>
        </div>
      `,
    })

    res.status(200).json({ message: 'Message sent successfully. We will get back to you within 24 hours.' })

  } catch (error) {
    console.error('Contact error:', error.message)
    res.status(500).json({ message: 'Failed to send message. Please try again.' })
  }
}














