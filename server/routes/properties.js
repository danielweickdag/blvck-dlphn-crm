const express = require('express');
const Property = require('../models/Property');
const { protect, managerOrAdmin } = require('../middleware/auth');
const { analyzeProperty, getComparables } = require('../services/propertyAnalysis');

const router = express.Router();

// @desc    Get all properties
// @route   GET /api/properties
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      city,
      state,
      propertyType,
      minPrice,
      maxPrice,
      strategy,
      status
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (city) filter.city = new RegExp(city, 'i');
    if (state) filter.state = state.toUpperCase();
    if (propertyType) filter.propertyType = propertyType;
    if (status) filter.status = status;
    if (strategy) filter['investmentAnalysis.strategies'] = { $in: [strategy] };
    
    if (minPrice || maxPrice) {
      filter['marketData.currentValue'] = {};
      if (minPrice) filter['marketData.currentValue'].$gte = parseInt(minPrice);
      if (maxPrice) filter['marketData.currentValue'].$lte = parseInt(maxPrice);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'assignedTo', select: 'firstName lastName email' }
      ]
    };

    const properties = await Property.paginate(filter, options);

    res.json(properties);
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get property by ID
// @route   GET /api/properties/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create new property
// @route   POST /api/properties
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      createdBy: req.user._id
    };

    const property = await Property.create(propertyData);

    // Populate the created property
    await property.populate('createdBy', 'firstName lastName email');

    res.status(201).json(property);
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user can update this property
    const canUpdate = req.user.role === 'admin' || 
                     req.user.role === 'manager' ||
                     property.createdBy.toString() === req.user._id.toString() ||
                     property.assignedTo.includes(req.user._id);

    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized to update this property' });
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email')
     .populate('assignedTo', 'firstName lastName email');

    res.json(updatedProperty);
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Admin/Manager only)
router.delete('/:id', protect, managerOrAdmin, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Analyze property
// @route   POST /api/properties/:id/analyze
// @access  Private
router.post('/:id/analyze', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const analysis = await analyzeProperty(property.address, property.city, property.state);

    // Update property with analysis results
    property.aiAnalysis = analysis.aiAnalysis;
    property.investmentAnalysis = analysis.investmentAnalysis;
    property.marketData = { ...property.marketData, ...analysis.marketData };
    property.comparables = analysis.comparables;
    property.fundingPotential = analysis.fundingPotential;
    property.lastAnalyzed = new Date();

    await property.save();

    res.json({
      message: 'Property analysis completed',
      property,
      analysis
    });
  } catch (error) {
    console.error('Analyze property error:', error);
    res.status(500).json({ message: 'Property analysis failed', error: error.message });
  }
});

// @desc    Get property comparables
// @route   GET /api/properties/:id/comparables
// @access  Private
router.get('/:id/comparables', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const comparables = await getComparables(
      property.address,
      property.city,
      property.state,
      property.bedrooms,
      property.bathrooms,
      property.squareFootage
    );

    res.json(comparables);
  } catch (error) {
    console.error('Get comparables error:', error);
    res.status(500).json({ message: 'Failed to get comparables', error: error.message });
  }
});

// @desc    Search properties by address
// @route   GET /api/properties/search
// @access  Private
router.get('/search/address', protect, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 3) {
      return res.status(400).json({ message: 'Search query must be at least 3 characters' });
    }

    const properties = await Property.find({
      $or: [
        { address: new RegExp(q, 'i') },
        { city: new RegExp(q, 'i') },
        { zipCode: new RegExp(q, 'i') }
      ]
    })
    .select('address city state zipCode propertyType marketData.currentValue')
    .limit(10);

    res.json(properties);
  } catch (error) {
    console.error('Search properties error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// @desc    Get property analytics
// @route   GET /api/properties/analytics
// @access  Private
router.get('/analytics/summary', protect, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '90d':
        dateFilter = { createdAt: { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) } };
        break;
    }

    const analytics = await Property.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalProperties: { $sum: 1 },
          avgValue: { $avg: '$marketData.currentValue' },
          totalValue: { $sum: '$marketData.currentValue' },
          avgSquareFootage: { $avg: '$squareFootage' },
          propertyTypes: { $push: '$propertyType' },
          cities: { $push: '$city' },
          states: { $push: '$state' }
        }
      }
    ]);

    const result = analytics[0] || {
      totalProperties: 0,
      avgValue: 0,
      totalValue: 0,
      avgSquareFootage: 0,
      propertyTypes: [],
      cities: [],
      states: []
    };

    // Count unique values
    result.uniquePropertyTypes = [...new Set(result.propertyTypes)].length;
    result.uniqueCities = [...new Set(result.cities)].length;
    result.uniqueStates = [...new Set(result.states)].length;

    delete result.propertyTypes;
    delete result.cities;
    delete result.states;

    res.json(result);
  } catch (error) {
    console.error('Get property analytics error:', error);
    res.status(500).json({ message: 'Analytics failed' });
  }
});

module.exports = router;