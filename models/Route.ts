import mongoose from 'mongoose';

const RouteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true,
  },
  scriptName: {
    type: String,
    required: true,
  },
  routePattern: {
    type: String,
    required: true,
  },
  routeId: {
    type: String, // Cloudflare route id
    required: false,
  },
  status: {
    type: String,
    enum: ['active', 'deleted', 'error'],
    default: 'active',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Route || mongoose.model('Route', RouteSchema); 