const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  isPremium: { type: Boolean, default: false },
  avatar:{type:String,default:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRd_XRGE9j0tQkvkYFKQU5MlZw86IXuV9TbfA&s'},
 
  resetPasswordToken:   { type: String },
  resetPasswordExpires: { type: Date },

  settings: {
   
    preferredCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],

    
    preferredRfciType: {
      type: String,
      enum: ['impact', 'acceleration', 'widespread', null],
      default: null,
    },

    
    emailNotifications: {
      newTrendAlerts:      { type: Boolean, default: true  },
      predictionConfirmed: { type: Boolean, default: true  }, 
      weeklyDigest:        { type: Boolean, default: false },
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);