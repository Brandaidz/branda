// backend/models/conversationSummaryModel.js
import mongoose from "mongoose";

const conversationSummarySchema = new mongoose.Schema(
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
    conversationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Conversation',
      required: true 
    },
    summary: { 
      type: String, 
      required: true 
    },
    keyPoints: [String],
    entities: [{ 
      type: String, 
      value: String 
    }],
    lastMessageTimestamp: { 
      type: Date 
    }
  },
  { timestamps: true }
);

// Index composés pour les requêtes filtrées par tenant
conversationSummarySchema.index({ tenantId: 1, createdAt: -1 });
conversationSummarySchema.index({ tenantId: 1, userId: 1 });
conversationSummarySchema.index({ tenantId: 1, conversationId: 1 });

const ConversationSummary = mongoose.model("ConversationSummary", conversationSummarySchema);

export default ConversationSummary;
