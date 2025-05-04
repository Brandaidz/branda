// backend/models/conversationModel.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ['user', 'assistant', 'system'], 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const conversationSchema = new mongoose.Schema(
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
    title: { 
      type: String,
      default: "Nouvelle conversation" 
    },
    messages: [messageSchema],
    lastActivity: { 
      type: Date, 
      default: Date.now 
    },
    context: {
      type: Object,
      default: {}
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { timestamps: true }
);

// Index composés pour les requêtes filtrées par tenant
conversationSchema.index({ tenantId: 1, createdAt: -1 });
conversationSchema.index({ tenantId: 1, userId: 1, lastActivity: -1 });
conversationSchema.index({ tenantId: 1, isActive: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
