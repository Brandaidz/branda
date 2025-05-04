// backend/models/scheduleModel.js
import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema({
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  breakDuration: { 
    type: Number, 
    default: 0 
  }, // en minutes
  notes: { 
    type: String 
  }
});

const scheduleSchema = new mongoose.Schema(
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
    employeeId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Employee',
      required: true 
    },
    date: { 
      type: Date, 
      required: true 
    },
    shifts: [shiftSchema],
    totalHours: { 
      type: Number 
    },
    status: { 
      type: String, 
      enum: ['planifié', 'confirmé', 'complété', 'annulé'], 
      default: 'planifié' 
    },
    isRecurring: { 
      type: Boolean, 
      default: false 
    },
    recurringPattern: { 
      type: String 
    } // ex: "weekly", "biweekly", etc.
  },
  { timestamps: true }
);

// Index composés pour les requêtes filtrées par tenant
scheduleSchema.index({ tenantId: 1, createdAt: -1 });
scheduleSchema.index({ tenantId: 1, userId: 1 });
scheduleSchema.index({ tenantId: 1, employeeId: 1 });
scheduleSchema.index({ tenantId: 1, date: 1 });
scheduleSchema.index({ tenantId: 1, status: 1 });

const Schedule = mongoose.model("Schedule", scheduleSchema);

export default Schedule;
