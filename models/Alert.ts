import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  scriptName: {
    type: String,
    required: true,
  },
  fullPath: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    required: true,
  },
  sourceIP: {
    type: String,
    required: true,
  },
  responseCode: {
    type: Number,
    required: true,
  },
  detectedKeywords: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['new', 'read', 'resolved'],
    default: 'new',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Alert || mongoose.model('Alert', AlertSchema); 