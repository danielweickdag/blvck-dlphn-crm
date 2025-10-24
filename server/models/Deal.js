const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  // Basic Deal Information
  dealId: {
    type: String,
    unique: true,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  },
  
  // Deal Pipeline Status
  status: {
    type: String,
    enum: [
      'new_deal',
      'offer_sent', 
      'offer_accepted',
      'walkthrough_scheduled',
      'walkthrough_completed',
      'under_contract',
      'disposition',
      'end_deposit_collected',
      'clear_to_close',
      'sold',
      'passed'
    ],
    default: 'new_deal'
  },
  
  // Property Details
  propertyType: {
    type: String,
    enum: ['single_family', 'multi_family', 'condo', 'townhouse', 'land', 'commercial']
  },
  bedrooms: Number,
  bathrooms: Number,
  squareFootage: Number,
  lotSize: Number,
  yearBuilt: Number,
  
  // Financial Information
  listPrice: Number,
  offerAmount: Number,
  acceptedOffer: Number,
  wholesaleFee: Number,
  mao: Number, // Maximum Allowable Offer
  arv: Number, // After Repair Value
  rehabCosts: Number,
  
  // Profit Calculations
  wholesaleProfit: Number,
  rehabberGrossProfit: Number,
  novationPotential: Number,
  brrrPotential: Number,
  
  // Property Analysis
  comparables: [{
    address: String,
    soldPrice: Number,
    soldDate: Date,
    squareFootage: Number,
    distance: Number
  }],
  
  // Property Images
  images: [{
    url: String,
    description: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  
  // AI Analysis
  aiAnalysis: {
    marketAnalysis: String,
    investmentRecommendation: String,
    riskAssessment: String,
    profitProjection: String,
    confidenceScore: Number
  },
  
  // External Data
  zillowData: {
    zestimate: Number,
    rentEstimate: Number,
    priceHistory: Array,
    lastUpdated: Date
  },
  
  realtorData: {
    mlsNumber: String,
    daysOnMarket: Number,
    pricePerSqFt: Number,
    lastUpdated: Date
  },
  
  // Contract Information
  contractGenerated: { type: Boolean, default: false },
  contractSent: { type: Boolean, default: false },
  contractSigned: { type: Boolean, default: false },
  contractPath: String,
  
  // Funding Information
  fundingPotential: {
    hardMoney: Boolean,
    privateInvestor: Boolean,
    bankFinancing: Boolean,
    cashDeal: Boolean,
    estimatedLTV: Number
  },
  
  // User Information
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  discordUserId: String,
  discordChannelId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Activity Log
  activityLog: [{
    action: String,
    description: String,
    timestamp: { type: Date, default: Date.now },
    userId: String
  }]
});

// Update the updatedAt field before saving
dealSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate deal ID
dealSchema.pre('save', async function(next) {
  if (!this.dealId) {
    const count = await mongoose.model('Deal').countDocuments();
    this.dealId = `BLVCK-${Date.now()}-${count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Deal', dealSchema);