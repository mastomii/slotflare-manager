import mongoose from 'mongoose';

const WorkerScriptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  scriptName: {
    type: String,
    required: true,
    unique: true,
  },
  keywords: [{
    type: String,
  }],
  whitelistPaths: [{
    type: String,
  }],
  enableAlert: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default mongoose.models.WorkerScript || mongoose.model('WorkerScript', WorkerScriptSchema); 