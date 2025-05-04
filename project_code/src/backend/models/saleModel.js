// backend/models/saleModel.js
import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    required: true
  },
  productName: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  unitPrice: { 
    type: Number, 
    required: true 
  },
  totalPrice: { 
    type: Number, 
    required: true 
  }
});

const saleSchema = new mongoose.Schema(
  {
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant',
      required: true, 
      index: true 
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    date: { 
      type: Date, 
      default: Date.now, 
      index: true 
    },
    customer: { 
      type: String 
    },
    items: [saleItemSchema],
    totalAmount: { 
      type: Number, 
      required: true 
    },
    paymentMethod: { 
      type: String, 
      enum: ['espèces', 'carte', 'chèque', 'autre'], 
      default: 'espèces' 
    },
    notes: { 
      type: String 
    },
    status: { 
      type: String, 
      enum: ['complétée', 'annulée', 'remboursée'], 
      default: 'complétée' 
    }
  },
  { timestamps: true }
);

// Index composés pour les requêtes filtrées par tenant
saleSchema.index({ tenantId: 1, createdAt: -1 });
saleSchema.index({ tenantId: 1, userId: 1 });
saleSchema.index({ tenantId: 1, date: -1 });
saleSchema.index({ tenantId: 1, status: 1 });

const Sale = mongoose.model("Sale", saleSchema);

export default Sale;
