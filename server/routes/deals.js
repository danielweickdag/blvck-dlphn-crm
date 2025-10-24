const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const Property = require('../models/Property');
const propertyAnalysis = require('../services/propertyAnalysis');

// Get all deals
router.get('/', async (req, res) => {
  try {
    const { status, userId, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.assignedTo = userId;
    
    const deals = await Deal.find(filter)
      .populate('assignedTo', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Deal.countDocuments(filter);
    
    res.json({
      deals,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deal by ID
router.get('/:id', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('assignedTo', 'username email');
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new deal
router.post('/', async (req, res) => {
  try {
    const { address, offerAmount, assignedTo } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    // Check if deal already exists for this address
    const existingDeal = await Deal.findOne({ address });
    if (existingDeal) {
      return res.status(400).json({ error: 'Deal already exists for this address' });
    }
    
    // Analyze property
    const analysis = await propertyAnalysis.analyzeProperty(address, offerAmount);
    
    // Create deal with analysis data
    const dealData = {
      address,
      city: analysis.city || 'Unknown',
      state: analysis.state || 'Unknown',
      zipCode: analysis.zipCode || 'Unknown',
      propertyType: analysis.propertyType,
      bedrooms: analysis.bedrooms,
      bathrooms: analysis.bathrooms,
      squareFootage: analysis.squareFootage,
      yearBuilt: analysis.yearBuilt,
      offerAmount,
      arv: analysis.analysis?.arv,
      mao: analysis.analysis?.mao,
      rehabCosts: analysis.analysis?.rehabCosts?.total,
      wholesaleProfit: analysis.analysis?.wholesale?.profit,
      rehabberGrossProfit: analysis.analysis?.rehab?.netProfit,
      novationPotential: analysis.analysis?.novation?.profit,
      brrrPotential: analysis.analysis?.brrrr?.cashFlow * 12,
      aiAnalysis: analysis.aiInsights,
      zillowData: analysis.zillowData,
      realtorData: analysis.realtorData,
      comparables: analysis.comparables,
      fundingPotential: analysis.fundingOptions,
      assignedTo
    };
    
    const deal = new Deal(dealData);
    await deal.save();
    
    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update deal
router.put('/:id', async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update deal status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const oldStatus = deal.status;
    deal.status = status;
    
    // Add to activity log
    deal.activityLog.push({
      action: 'status_update',
      description: `Status changed from ${oldStatus} to ${status}${note ? `: ${note}` : ''}`,
      userId: req.user?.id || 'system'
    });
    
    await deal.save();
    
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add activity to deal
router.post('/:id/activity', async (req, res) => {
  try {
    const { action, description } = req.body;
    
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    deal.activityLog.push({
      action,
      description,
      userId: req.user?.id || 'system'
    });
    
    await deal.save();
    
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deal analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    const filter = {};
    if (userId) filter.assignedTo = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const analytics = await Deal.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDeals: { $sum: 1 },
          totalProfit: { $sum: '$wholesaleProfit' },
          averageProfit: { $avg: '$wholesaleProfit' },
          dealsByStatus: {
            $push: '$status'
          }
        }
      }
    ]);
    
    // Count deals by status
    const statusCounts = await Deal.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      summary: analytics[0] || {
        totalDeals: 0,
        totalProfit: 0,
        averageProfit: 0
      },
      statusBreakdown: statusCounts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete deal
router.delete('/:id', async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update deals
router.patch('/bulk/update', async (req, res) => {
  try {
    const { dealIds, updates } = req.body;
    
    const result = await Deal.updateMany(
      { _id: { $in: dealIds } },
      { ...updates, updatedAt: Date.now() }
    );
    
    res.json({
      message: `${result.modifiedCount} deals updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deals by Discord user
router.get('/discord/:discordUserId', async (req, res) => {
  try {
    const deals = await Deal.find({ discordUserId: req.params.discordUserId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Re-analyze deal
router.post('/:id/reanalyze', async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Re-run analysis
    const analysis = await propertyAnalysis.analyzeProperty(deal.address, deal.offerAmount);
    
    // Update deal with new analysis
    deal.arv = analysis.analysis?.arv;
    deal.mao = analysis.analysis?.mao;
    deal.rehabCosts = analysis.analysis?.rehabCosts?.total;
    deal.wholesaleProfit = analysis.analysis?.wholesale?.profit;
    deal.rehabberGrossProfit = analysis.analysis?.rehab?.netProfit;
    deal.novationPotential = analysis.analysis?.novation?.profit;
    deal.brrrPotential = analysis.analysis?.brrrr?.cashFlow * 12;
    deal.aiAnalysis = analysis.aiInsights;
    deal.zillowData = analysis.zillowData;
    deal.realtorData = analysis.realtorData;
    deal.comparables = analysis.comparables;
    deal.fundingPotential = analysis.fundingOptions;
    
    deal.activityLog.push({
      action: 'reanalysis',
      description: 'Property re-analyzed with updated data',
      userId: req.user?.id || 'system'
    });
    
    await deal.save();
    
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;