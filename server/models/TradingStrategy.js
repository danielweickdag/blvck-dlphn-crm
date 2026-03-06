const mongoose = require('mongoose');

const tradingStrategySchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Strategy Configuration
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,

  // Trading Settings
  isActive: {
    type: Boolean,
    default: false
  },

  // Daily Profit Target
  dailyProfitTarget: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    achieved: {
      type: Boolean,
      default: false
    },
    currentProfit: {
      type: Number,
      default: 0
    },
    lastReset: {
      type: Date,
      default: Date.now
    }
  },

  // Risk Management
  riskManagement: {
    maxTradeSize: {
      type: Number,
      required: true,
      min: 0
    },
    stopLossPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 5
    },
    takeProfitPercentage: {
      type: Number,
      min: 0,
      default: 10
    },
    maxDailyLoss: {
      type: Number,
      min: 0
    },
    maxOpenTrades: {
      type: Number,
      default: 5,
      min: 1
    }
  },

  // News Event Filters
  newsFilters: {
    categories: [{
      type: String,
      enum: ['politics', 'economics', 'technology', 'finance', 'energy', 'healthcare', 'crypto', 'forex', 'stocks', 'commodities', 'general']
    }],
    keywords: [String],
    excludeKeywords: [String],
    minSentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    },
    sources: [String], // Specific news sources to monitor
    regions: [String] // Geographic regions
  },

  // Trading Pairs/Assets
  tradingPairs: [{
    symbol: String,
    exchange: String,
    allocation: Number, // Percentage of capital
    minConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7
    }
  }],

  // Strategy Type
  strategyType: {
    type: String,
    enum: ['news_based', 'sentiment', 'event_driven', 'hybrid'],
    default: 'news_based'
  },

  // Performance Metrics
  performance: {
    totalTrades: { type: Number, default: 0 },
    successfulTrades: { type: Number, default: 0 },
    failedTrades: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalLoss: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    averageProfit: { type: Number, default: 0 },
    sharpeRatio: Number,
    maxDrawdown: Number,
    lastTradeDate: Date
  },

  // Schedule
  tradingSchedule: {
    enabled: { type: Boolean, default: true },
    timezone: { type: String, default: 'UTC' },
    activeHours: {
      start: { type: String, default: '00:00' },
      end: { type: String, default: '23:59' }
    },
    activeDays: [{
      type: Number,
      min: 0,
      max: 6 // 0=Sunday, 6=Saturday
    }]
  },

  // Notifications
  notifications: {
    tradeExecuted: { type: Boolean, default: true },
    dailyProfitReached: { type: Boolean, default: true },
    stopLossHit: { type: Boolean, default: true },
    errors: { type: Boolean, default: true },
    discord: { type: Boolean, default: false },
    email: { type: Boolean, default: true }
  },

  // Status tracking
  lastExecuted: Date,
  lastError: {
    message: String,
    timestamp: Date
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
tradingStrategySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if daily profit target is reached
tradingStrategySchema.methods.isProfitTargetReached = function() {
  return this.dailyProfitTarget.currentProfit >= this.dailyProfitTarget.amount;
};

// Method to reset daily profit tracking
tradingStrategySchema.methods.resetDailyProfit = function() {
  const now = new Date();
  const lastReset = new Date(this.dailyProfitTarget.lastReset);

  // Reset if it's a new day
  if (now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()) {
    this.dailyProfitTarget.currentProfit = 0;
    this.dailyProfitTarget.achieved = false;
    this.dailyProfitTarget.lastReset = now;
    return true;
  }
  return false;
};

// Method to update performance metrics
tradingStrategySchema.methods.updatePerformance = function(trade) {
  this.performance.totalTrades += 1;

  if (trade.profit > 0) {
    this.performance.successfulTrades += 1;
    this.performance.totalProfit += trade.profit;
  } else {
    this.performance.failedTrades += 1;
    this.performance.totalLoss += Math.abs(trade.profit);
  }

  this.performance.winRate = (this.performance.successfulTrades / this.performance.totalTrades) * 100;
  this.performance.averageProfit = this.performance.totalProfit / this.performance.totalTrades;
  this.performance.lastTradeDate = new Date();

  // Update daily profit
  this.dailyProfitTarget.currentProfit += trade.profit;
  if (this.isProfitTargetReached()) {
    this.dailyProfitTarget.achieved = true;
  }
};

// Index for faster queries
tradingStrategySchema.index({ userId: 1 });
tradingStrategySchema.index({ isActive: 1 });
tradingStrategySchema.index({ 'dailyProfitTarget.achieved': 1 });

module.exports = mongoose.model('TradingStrategy', tradingStrategySchema);
