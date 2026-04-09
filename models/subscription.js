
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String},
  status: { type: String, enum: ['active','inactive'], default: 'active' },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  currentPeriodEnd: { type: Date, default: null }, 
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);