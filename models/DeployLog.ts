import mongoose from 'mongoose';

const DeployLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  actionType: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true,
  },
  entityType: {
    type: String,
    enum: ['domain', 'script', 'route'],
    required: true,
  },
  entityId: {
    type: String,
    required: true,
  },
  snapshot: {
    type: Object,
    required: true,
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    required: true,
  },
  errorMessage: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

export default mongoose.models.DeployLog || mongoose.model('DeployLog', DeployLogSchema);