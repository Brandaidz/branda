// backend/models/productModel.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant',
      required: true, 
      index: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String 
    },
    price: { 
      type: Number, 
      required: true 
    },
    cost: { 
      type: Number 
    },
    stock: { 
      type: Number, 
      default: 0 
    },
    category: { 
      type: String 
    },
    imageUrl: { 
      type: String 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { timestamps: true }
);

// Index composé pour les requêtes filtrées par tenant
productSchema.index({ tenantId: 1, createdAt: -1 });
productSchema.index({ tenantId: 1, name: 1 });
productSchema.index({ tenantId: 1, category: 1 });
productSchema.index({ tenantId: 1, isActive: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
