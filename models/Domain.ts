import mongoose from 'mongoose';

const DomainSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  zoneName: {
    type: String,
    required: true,
  },
  zoneId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'inactive'],
    default: 'active',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Domain || mongoose.model('Domain', DomainSchema);