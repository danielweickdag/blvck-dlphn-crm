const mongoose = require('mongoose');

const tradingConfigSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Bot state
  isActive: {
    type: Boolean,
    default: false
  },

  // Daily profit target
  dailyProfitTarget: {
    type: Number,
    default: 500, // $500 default daily target
    min: 10
  },

  // Daily loss limit (stop trading if hit)
  dailyLossLimit: {
    type: Number,
    default: 200,
    min: 10
  },

  // Risk per trade (as dollar amount)
  riskPerTrade: {
    type: Number,
    default: 50,
    min: 5
  },

  // Max position size
  maxPositionSize: {
    type: Number,
    default: 1000,
    min: 100
  },

  // Max concurrent open trades
  maxOpenTrades: {
    type: Number,
    default: 5,
    min: 1,
    max: 20
  },

  // Enabled asset types
  enabledAssets: [{
    type: String,
    enum: ['stock', 'crypto', 'forex', 'commodity']
  }],

  // Watchlist symbols
  watchlist: [{
    type: String,
    uppercase: true,
    trim: true
  }],

  // Strategy preferences
  strategies: [{
    type: String,
    enum: ['news_momentum', 'sentiment_reversal', 'event_breakout', 'trend_follow']
  }],

  // Minimum sentiment score to trigger trade (0-1)
  minSentimentScore: {
    type: Number,
    default: 0.6,
    min: 0.1,
    max: 1.0
  },

  // Auto take-profit percentage
  takeProfitPercent: {
    type: Number,
    default: 2.0,
    min: 0.5
  },

  // Auto stop-loss percentage
  stopLossPercent: {
    type: Number,
    default: 1.0,
    min: 0.25
  },

  // Scan interval in seconds
  scanInterval: {
    type: Number,
    default: 30,
    min: 10,
    max: 300
  },

  // News sources to monitor
  newsSources: [{
    type: String,
    enum: ['general', 'business', 'technology', 'crypto', 'finance']
  }],

  // Trading hours (UTC)
  tradingHours: {
    enabled: { type: Boolean, default: false },
    startHour: { type: Number, default: 13, min: 0, max: 23 }, // 9 AM ET
    endHour: { type: Number, default: 20, min: 0, max: 23 }    // 4 PM ET
  },

  // Daily stats (reset daily)
  dailyStats: {
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    totalTrades: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
    losingTrades: { type: Number, default: 0 },
    realizedPnl: { type: Number, default: 0 },
    unrealizedPnl: { type: Number, default: 0 },
    targetReached: { type: Boolean, default: false },
    lossLimitHit: { type: Boolean, default: false }
  },

  // Cumulative stats
  allTimeStats: {
    totalTrades: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
    losingTrades: { type: Number, default: 0 },
    totalPnl: { type: Number, default: 0 },
    bestDay: { type: Number, default: 0 },
    worstDay: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Reset daily stats if new day
tradingConfigSchema.methods.checkDailyReset = function() {
  const today = new Date().toISOString().split('T')[0];
  if (this.dailyStats.date !== today) {
    // Archive yesterday's stats into allTime
    if (this.dailyStats.realizedPnl > this.allTimeStats.bestDay) {
      this.allTimeStats.bestDay = this.dailyStats.realizedPnl;
    }
    if (this.dailyStats.realizedPnl < this.allTimeStats.worstDay) {
      this.allTimeStats.worstDay = this.dailyStats.realizedPnl;
    }

    // Reset daily
    this.dailyStats = {
      date: today,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      targetReached: false,
      lossLimitHit: false
    };
  }
  return this;
};

// Defaults for new configs
tradingConfigSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.enabledAssets || this.enabledAssets.length === 0) {
      this.enabledAssets = ['stock', 'crypto'];
    }
    if (!this.watchlist || this.watchlist.length === 0) {
      this.watchlist = ['AAPL', 'TSLA', 'NVDA', 'AMZN', 'BTC', 'ETH', 'GOOGL', 'META', 'MSFT', 'AMD'];
    }
    if (!this.strategies || this.strategies.length === 0) {
      this.strategies = ['news_momentum', 'event_breakout'];
    }
    if (!this.newsSources || this.newsSources.length === 0) {
      this.newsSources = ['business', 'technology', 'finance'];
    }
  }
  next();
});

module.exports = mongoose.model('TradingConfig', tradingConfigSchema);
