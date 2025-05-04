// backend/models/accountingEntryModel.js
import mongoose from "mongoose";

const accountingEntrySchema = new mongoose.Schema(
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
    description: { 
      type: String, 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    type: { 
      type: String, 
      enum: ['revenu', 'dépense'], 
      required: true 
    },
    category: { 
      type: String, 
      required: true 
    },
    paymentMethod: { 
      type: String, 
      enum: ['espèces', 'carte', 'chèque', 'virement', 'autre'], 
      default: 'espèces' 
    },
    relatedSaleId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Sale' 
    },
    relatedEmployeeId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Employee' 
    },
    notes: { 
      type: String 
    },
    attachments: [String]
  },
  { timestamps: true }
);

// Index composés pour les requêtes filtrées par tenant
accountingEntrySchema.index({ tenantId: 1, createdAt: -1 });
accountingEntrySchema.index({ tenantId: 1, userId: 1 });
accountingEntrySchema.index({ tenantId: 1, date: -1 });
accountingEntrySchema.index({ tenantId: 1, type: 1, category: 1 });

const AccountingEntry = mongoose.model("AccountingEntry", accountingEntrySchema);

export default AccountingEntry;
