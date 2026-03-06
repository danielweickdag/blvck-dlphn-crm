const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  // User and Strategy References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  strategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingStrategy',
    required: true
  },

  // Related News Event
  newsEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NewsEvent'
  },

  // Trade Details
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  exchange: {
    type: String,
    required: true
  },

  // Order Information
  orderType: {
    type: String,
    enum: ['market', 'limit', 'stop_loss', 'take_profit'],
    default: 'market'
  },
  side: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },

  // Entry Details
  entryPrice: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  entryTime: {
    type: Date,
    default: Date.now
  },

  // Exit Details
  exitPrice: Number,
  exitTime: Date,
  exitReason: {
    type: String,
    enum: ['take_profit', 'stop_loss', 'manual', 'timeout', 'strategy_condition', 'daily_target_reached']
  },

  // Stop Loss and Take Profit
  stopLoss: {
    price: Number,
    percentage: Number
  },
  takeProfit: {
    price: Number,
    percentage: Number
  },

  // Trade Status
  status: {
    type: String,
    enum: ['pending', 'open', 'closed', 'cancelled', 'failed'],
    default: 'pending'
  },

  // Financial Details
  profit: {
    type: Number,
    default: 0
  },
  profitPercentage: {
    type: Number,
    default: 0
  },
  fees: {
    entry: { type: Number, default: 0 },
    exit: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  totalCost: Number,
  totalReturn: Number,
  netProfit: Number,

  // Trade Signal Details
  signal: {
    confidence: Number,
    reasoning: String,
    sentimentScore: Number,
    marketImpact: String
  },

  // Risk Metrics
  riskRewardRatio: Number,
  maxDrawdown: Number,

  // Execution Details
  executionDetails: {
    orderId: String,
    fillPrice: Number,
    slippage: Number,
    executionTime: Number, // milliseconds
    partialFills: [{
      price: Number,
      quantity: Number,
      timestamp: Date
    }]
  },

  // Position Tracking
  position: {
    current: { type: Number, default: 0 },
    average: Number,
    realized: { type: Number, default: 0 },
    unrealized: { type: Number, default: 0 }
  },

  // Automation Details
  isAutomated: {
    type: Boolean,
    default: true
  },
  automationRules: {
    autoClose: { type: Boolean, default: true },
    trailingStop: {
      enabled: { type: Boolean, default: false },
      percentage: Number,
      activationPrice: Number
    }
  },

  // Notes and Metadata
  notes: String,
  tags: [String],

  // Error Handling
  errors: [{
    message: String,
    code: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Audit Trail
  history: [{
    action: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
tradeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate total fees
  if (this.fees.entry || this.fees.exit) {
    this.fees.total = (this.fees.entry || 0) + (this.fees.exit || 0);
  }

  // Calculate profit if trade is closed
  if (this.status === 'closed' && this.exitPrice) {
    const priceChange = this.side === 'buy'
      ? this.exitPrice - this.entryPrice
      : this.entryPrice - this.exitPrice;

    this.profit = priceChange * this.quantity;
    this.profitPercentage = (priceChange / this.entryPrice) * 100;
    this.netProfit = this.profit - this.fees.total;

    // Calculate total cost and return
    this.totalCost = this.entryPrice * this.quantity + this.fees.entry;
    this.totalReturn = this.exitPrice * this.quantity - this.fees.exit;
  }

  next();
});

// Method to close trade
tradeSchema.methods.closeTrade = function(exitPrice, reason) {
  this.status = 'closed';
  this.exitPrice = exitPrice;
  this.exitTime = new Date();
  this.exitReason = reason;

  // Add to history
  this.history.push({
    action: 'trade_closed',
    details: { exitPrice, reason },
    timestamp: new Date()
  });

  return this.save();
};

// Method to update stop loss
tradeSchema.methods.updateStopLoss = function(newPrice) {
  this.stopLoss.price = newPrice;
  this.stopLoss.percentage = ((this.entryPrice - newPrice) / this.entryPrice) * 100;

  this.history.push({
    action: 'stop_loss_updated',
    details: { newPrice },
    timestamp: new Date()
  });

  return this.save();
};

// Method to update take profit
tradeSchema.methods.updateTakeProfit = function(newPrice) {
  this.takeProfit.price = newPrice;
  this.takeProfit.percentage = ((newPrice - this.entryPrice) / this.entryPrice) * 100;

  this.history.push({
    action: 'take_profit_updated',
    details: { newPrice },
    timestamp: new Date()
  });

  return this.save();
};

// Calculate current profit/loss for open trades
tradeSchema.methods.calculateCurrentPnL = function(currentPrice) {
  if (this.status !== 'open') {
    return this.netProfit || 0;
  }

  const priceChange = this.side === 'buy'
    ? currentPrice - this.entryPrice
    : this.entryPrice - currentPrice;

  const unrealizedProfit = priceChange * this.quantity;
  this.position.unrealized = unrealizedProfit - this.fees.entry;

  return this.position.unrealized;
};

// Indexes for performance
tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ strategyId: 1 });
tradeSchema.index({ status: 1 });
tradeSchema.index({ symbol: 1, exchange: 1 });
tradeSchema.index({ newsEventId: 1 });
tradeSchema.index({ entryTime: -1 });

module.exports = mongoose.model('Trade', tradeSchema);
