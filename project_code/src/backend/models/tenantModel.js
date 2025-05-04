// backend/models/tenantModel.js
import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    // Add other tenant-specific fields if needed later
    ownerId: { // Link to the user who created/owns the tenant
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    }
  },
  { timestamps: true }
);

const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;

