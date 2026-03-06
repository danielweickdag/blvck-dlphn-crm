const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Trade identification
  tradeId: {
    type: String,
    unique: true,
    required: true
  },

  // Asset info
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  assetType: {
    type: String,
    enum: ['stock', 'crypto', 'forex', 'commodity'],
    default: 'stock'
  },

  // Trade direction
  side: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },

  // Pricing
  entryPrice: {
    type: Number,
    required: true
  },
  exitPrice: {
    type: Number,
    default: null
  },
  quantity: {
    type: Number,
    required: true
  },
  currentPrice: {
    type: Number,
    default: null
  },

  // P&L
  realizedPnl: {
    type: Number,
    default: 0
  },
  unrealizedPnl: {
    type: Number,
    default: 0
  },
  fees: {
    type: Number,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['open', 'closed', 'cancelled'],
    default: 'open',
    index: true
  },

  // Event that triggered this trade
  triggerEvent: {
    headline: String,
    source: String,
    url: String,
    sentiment: {
      type: String,
      enum: ['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish']
    },
    sentimentScore: Number,
    detectedAt: Date
  },

  // Strategy info
  strategy: {
    type: String,
    enum: ['news_momentum', 'sentiment_reversal', 'event_breakout', 'trend_follow'],
    default: 'news_momentum'
  },

  // Risk management
  stopLoss: Number,
  takeProfit: Number,

  // Timing
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: Date,

  // Daily tracking
  tradingDay: {
    type: String, // YYYY-MM-DD format
    index: true
  },

  notes: String
}, {
  timestamps: true
});

// Generate trade ID before save
tradeSchema.pre('save', function(next) {
  if (!this.tradeId) {
    this.tradeId = `TRD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  if (!this.tradingDay) {
    this.tradingDay = new Date().toISOString().split('T')[0];
  }
  next();
});

// Calculate P&L on update
tradeSchema.methods.calculatePnl = function() {
  if (this.status === 'closed' && this.exitPrice) {
    const multiplier = this.side === 'buy' ? 1 : -1;
    this.realizedPnl = ((this.exitPrice - this.entryPrice) * this.quantity * multiplier) - this.fees;
    this.unrealizedPnl = 0;
  } else if (this.currentPrice) {
    const multiplier = this.side === 'buy' ? 1 : -1;
    this.unrealizedPnl = (this.currentPrice - this.entryPrice) * this.quantity * multiplier;
  }
  return this;
};

// Indexes
tradeSchema.index({ user: 1, tradingDay: 1 });
tradeSchema.index({ user: 1, status: 1 });
tradeSchema.index({ openedAt: -1 });

module.exports = mongoose.model('Trade', tradeSchema);
