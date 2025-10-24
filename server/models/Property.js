const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Property Identification
  address: {
    type: String,
    required: true,
    unique: true
  },
  fullAddress: String,
  city: String,
  state: String,
  zipCode: String,
  county: String,
  parcelNumber: String,
  
  // Property Characteristics
  propertyType: {
    type: String,
    enum: ['single_family', 'multi_family', 'condo', 'townhouse', 'land', 'commercial', 'mixed_use']
  },
  bedrooms: Number,
  bathrooms: Number,
  halfBaths: Number,
  squareFootage: Number,
  lotSize: Number,
  yearBuilt: Number,
  stories: Number,
  garage: {
    spaces: Number,
    type: String // attached, detached, carport
  },
  
  // Property Condition
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'needs_major_repair']
  },
  
  // Market Data
  currentValue: {
    zestimate: Number,
    realtorEstimate: Number,
    assessedValue: Number,
    lastSoldPrice: Number,
    lastSoldDate: Date
  },
  
  // Rental Information
  rentalData: {
    currentRent: Number,
    marketRent: Number,
    rentHistory: [{
      amount: Number,
      date: Date,
      source: String
    }],
    capRate: Number,
    grossRentMultiplier: Number
  },
  
  // Comparable Sales
  comparables: [{
    address: String,
    soldPrice: Number,
    soldDate: Date,
    squareFootage: Number,
    bedrooms: Number,
    bathrooms: Number,
    distance: Number, // in miles
    pricePerSqFt: Number,
    daysOnMarket: Number
  }],
  
  // Investment Analysis
  analysis: {
    arv: Number, // After Repair Value
    asIsValue: Number,
    rehabCosts: {
      total: Number,
      breakdown: {
        kitchen: Number,
        bathrooms: Number,
        flooring: Number,
        paint: Number,
        roof: Number,
        hvac: Number,
        plumbing: Number,
        electrical: Number,
        windows: Number,
        exterior: Number,
        other: Number
      }
    },
    mao: Number, // Maximum Allowable Offer
    wholesaleFee: Number,
    
    // Investment Strategies
    wholesale: {
      buyPrice: Number,
      wholesaleFee: Number,
      profit: Number,
      roi: Number
    },
    
    rehab: {
      buyPrice: Number,
      rehabCost: Number,
      arv: Number,
      grossProfit: Number,
      netProfit: Number,
      roi: Number
    },
    
    brrrr: {
      buyPrice: Number,
      rehabCost: Number,
      arv: Number,
      refinanceAmount: Number,
      cashLeft: Number,
      monthlyRent: Number,
      monthlyExpenses: Number,
      cashFlow: Number,
      coc: Number // Cash on Cash return
    },
    
    novation: {
      currentValue: Number,
      potentialValue: Number,
      improvementCost: Number,
      profit: Number,
      timeframe: Number // months
    }
  },
  
  // External API Data
  zillowData: {
    zpid: String,
    zestimate: Number,
    rentZestimate: Number,
    priceHistory: Array,
    taxHistory: Array,
    lastUpdated: Date
  },
  
  realtorData: {
    mlsNumber: String,
    listingStatus: String,
    listPrice: Number,
    daysOnMarket: Number,
    priceHistory: Array,
    lastUpdated: Date
  },
  
  // Property Images
  images: [{
    url: String,
    type: String, // exterior, interior, kitchen, bathroom, etc.
    description: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  
  // AI Analysis
  aiInsights: {
    marketTrends: String,
    investmentRecommendation: String,
    riskFactors: [String],
    opportunities: [String],
    confidenceScore: Number,
    lastAnalyzed: Date
  },
  
  // Funding Potential
  fundingOptions: {
    hardMoney: {
      eligible: Boolean,
      maxLTV: Number,
      estimatedRate: Number
    },
    conventional: {
      eligible: Boolean,
      maxLTV: Number,
      estimatedRate: Number
    },
    portfolio: {
      eligible: Boolean,
      maxLTV: Number,
      estimatedRate: Number
    },
    cash: {
      recommended: Boolean,
      advantages: [String]
    }
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastAnalyzed: Date,
  
  // Data Sources
  dataSources: {
    zillow: { lastUpdated: Date, status: String },
    realtor: { lastUpdated: Date, status: String },
    mls: { lastUpdated: Date, status: String },
    county: { lastUpdated: Date, status: String }
  }
});

// Update the updatedAt field before saving
propertySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster searches
propertySchema.index({ address: 1 });
propertySchema.index({ city: 1, state: 1 });
propertySchema.index({ zipCode: 1 });

module.exports = mongoose.model('Property', propertySchema);