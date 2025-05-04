// backend/models/performanceModel.js
import mongoose from "mongoose";

const metricSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  value: { 
    type: Number, 
    required: true 
  },
  unit: { 
    type: String 
  },
  target: { 
    type: Number 
  },
  previousValue: { 
    type: Number 
  }
});

const performanceSchema = new mongoose.Schema(
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
    period: { 
      type: String, 
      enum: ['jour', 'semaine', 'mois', 'trimestre', 'année'], 
      required: true 
    },
    startDate: { 
      type: Date, 
      required: true 
    },
    endDate: { 
      type: Date, 
      required: true 
    },
    metrics: [metricSchema],
    comments: { 
      type: String 
    },
    overallRating: { 
      type: Number, 
      min: 0, 
      max: 5 
    }
  },
  { timestamps: true }
);

// Index composés pour les requêtes filtrées par tenant
performanceSchema.index({ tenantId: 1, createdAt: -1 });
performanceSchema.index({ tenantId: 1, userId: 1 });
performanceSchema.index({ tenantId: 1, employeeId: 1 });
performanceSchema.index({ tenantId: 1, period: 1, startDate: -1 });

const Performance = mongoose.model("Performance", performanceSchema);

export default Performance;
