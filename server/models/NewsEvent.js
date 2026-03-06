const mongoose = require('mongoose');

const newsEventSchema = new mongoose.Schema({
  // News Source Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  content: String,
  url: {
    type: String,
    required: true,
    unique: true
  },
  urlHash: {
    type: String,
    unique: true,
    index: true
  },

  // Source Details
  source: {
    name: String,
    id: String,
    url: String
  },
  author: String,
  publishedAt: {
    type: Date,
    required: true
  },

  // Categorization
  category: {
    type: String,
    enum: ['politics', 'economics', 'technology', 'finance', 'energy', 'healthcare', 'crypto', 'forex', 'stocks', 'commodities', 'general'],
    default: 'general'
  },
  tags: [String],
  keywords: [String],

  // Geographic Information
  region: {
    type: String,
    default: 'global'
  },
  country: String,

  // Sentiment Analysis
  sentiment: {
    score: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    },
    label: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    analyzedAt: Date
  },

  // Impact Assessment
  marketImpact: {
    potential: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    affectedMarkets: [{
      type: String,
      enum: ['stocks', 'forex', 'crypto', 'commodities', 'bonds', 'real_estate']
    }],
    affectedSymbols: [String], // Specific trading symbols affected
    volatilityScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 5
    }
  },

  // Trading Signal Generation
  tradingSignals: [{
    symbol: String,
    exchange: String,
    action: {
      type: String,
      enum: ['buy', 'sell', 'hold', 'watch']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    reasoning: String,
    targetPrice: Number,
    stopLoss: Number,
    takeProfit: Number,
    generatedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date
  }],

  // Processing Status
  processed: {
    type: Boolean,
    default: false
  },
  processedAt: Date,

  // Event Relevance
  relevanceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },

  // Related Events
  relatedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NewsEvent'
  }],

  // Media
  images: [{
    url: String,
    caption: String
  }],
  video: {
    url: String,
    thumbnail: String
  },

  // Engagement Metrics
  engagement: {
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    reactions: { type: Number, default: 0 }
  },

  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: String,

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
newsEventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Generate URL hash if not exists
  if (!this.urlHash && this.url) {
    const crypto = require('crypto');
    this.urlHash = crypto.createHash('md5').update(this.url).digest('hex');
  }

  next();
});

// Method to analyze sentiment
newsEventSchema.methods.analyzeSentiment = async function(sentimentAnalyzer) {
  // This will be implemented with actual sentiment analysis service
  const text = `${this.title} ${this.description}`;
  const analysis = await sentimentAnalyzer.analyze(text);

  this.sentiment = {
    score: analysis.score,
    label: analysis.label,
    confidence: analysis.confidence,
    analyzedAt: new Date()
  };

  return this.sentiment;
};

// Method to generate trading signals
newsEventSchema.methods.generateTradingSignals = function(strategies) {
  // This will be implemented with trading signal generation logic
  // Based on sentiment, keywords, and market impact
  const signals = [];

  // Example signal generation logic
  if (this.sentiment.score > 0.5 && this.marketImpact.potential === 'high') {
    // Generate buy signals for affected symbols
    this.marketImpact.affectedSymbols.forEach(symbol => {
      signals.push({
        symbol,
        action: 'buy',
        confidence: this.sentiment.confidence,
        reasoning: `Positive news event: ${this.title}`,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    });
  }

  this.tradingSignals = signals;
  return signals;
};

// Indexes for performance
newsEventSchema.index({ publishedAt: -1 });
newsEventSchema.index({ category: 1 });
newsEventSchema.index({ 'sentiment.score': 1 });
newsEventSchema.index({ 'marketImpact.potential': 1 });
newsEventSchema.index({ processed: 1 });
newsEventSchema.index({ urlHash: 1 });

module.exports = mongoose.model('NewsEvent', newsEventSchema);
