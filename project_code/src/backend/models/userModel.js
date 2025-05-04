// backend/models/userModel.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    passwordHash: { 
      type: String, 
      required: true 
    },
    tenantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Tenant',
      required: true, 
      index: true 
    },
    role: { 
      type: String, 
      enum: ['admin', 'user', 'manager'], 
      default: 'user' 
    },
    isEmailVerified: { 
      type: Boolean, 
      default: false 
    },
    businessProfile: {
      nom: String,
      secteur: String,
      nombreEmployes: Number,
      caMensuel: Number,
      horaires: String,
      objectifs: String,
      reseauxSociaux: [String]
    },
    familyProfile: {
      nomFoyer: String,
      membres: [{ 
        nom: String, 
        relation: String 
      }],
      routines: [String]
    },
    lastLogin: Date
  },
  { timestamps: true }
);

// Index composé pour les requêtes filtrées par tenant
userSchema.index({ tenantId: 1, createdAt: -1 });

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Méthode pour hacher le mot de passe avant de sauvegarder
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model("User", userSchema);

export default User;
