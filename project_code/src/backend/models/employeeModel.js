// backend/models/employeeModel.js
import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
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
    firstName: { 
      type: String, 
      required: true 
    },
    lastName: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String 
    },
    phone: { 
      type: String 
    },
    position: { 
      type: String, 
      required: true 
    },
    department: { 
      type: String 
    },
    salary: { 
      type: Number 
    },
    hireDate: { 
      type: Date, 
      default: Date.now 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    notes: { 
      type: String 
    }
  },
  { timestamps: true }
);

// Index composés pour les requêtes filtrées par tenant
employeeSchema.index({ tenantId: 1, createdAt: -1 });
employeeSchema.index({ tenantId: 1, userId: 1 });
employeeSchema.index({ tenantId: 1, department: 1 });
employeeSchema.index({ tenantId: 1, isActive: 1 });

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
