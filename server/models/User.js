const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Profile Information
  firstName: String,
  lastName: String,
  phone: String,
  avatar: String,
  
  // Discord Integration
  discordId: {
    type: String,
    unique: true,
    sparse: true
  },
  discordUsername: String,
  discordAvatar: String,
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['admin', 'manager', 'agent', 'investor', 'viewer'],
    default: 'agent'
  },
  permissions: [{
    type: String,
    enum: [
      'view_deals',
      'create_deals',
      'edit_deals',
      'delete_deals',
      'view_analytics',
      'manage_users',
      'system_admin',
      'generate_contracts',
      'access_funding'
    ]
  }],
  
  // Investment Preferences
  investmentProfile: {
    preferredStrategies: [{
      type: String,
      enum: ['wholesale', 'rehab', 'brrrr', 'novation', 'rental']
    }],
    maxBudget: Number,
    preferredAreas: [String],
    riskTolerance: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  },
  
  // Performance Metrics
  stats: {
    totalDeals: { type: Number, default: 0 },
    closedDeals: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    averageDealSize: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    lastActivity: Date
  },
  
  // Notification Preferences
  notifications: {
    email: { type: Boolean, default: true },
    discord: { type: Boolean, default: true },
    dealUpdates: { type: Boolean, default: true },
    marketAlerts: { type: Boolean, default: false },
    systemNotifications: { type: Boolean, default: true }
  },
  
  // API Keys and Integrations
  apiKeys: {
    zillow: String,
    realtor: String,
    openai: String
  },
  
  // Account Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Match password method (alias for compatibility)
userSchema.methods.matchPassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Index for faster searches
userSchema.index({ email: 1 });
userSchema.index({ discordId: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);