const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['hashtag', 'keyword'], default: 'keyword' },
}, { timestamps: true });

module.exports = mongoose.model('Tag', tagSchema);