const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const TradingStrategy = require('../models/TradingStrategy');
const Trade = require('../models/Trade');
const NewsEvent = require('../models/NewsEvent');

// @route   GET /api/trading/strategies
// @desc    Get all trading strategies for user
// @access  Private
router.get('/strategies', protect, async (req, res) => {
  try {
    const strategies = await TradingStrategy.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: strategies.length,
      data: strategies
    });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trading strategies'
    });
  }
});

// @route   GET /api/trading/strategies/:id
// @desc    Get single trading strategy
// @access  Private
router.get('/strategies/:id', protect, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching strategy'
    });
  }
});

// @route   POST /api/trading/strategies
// @desc    Create new trading strategy
// @access  Private
router.post('/strategies', protect, async (req, res) => {
  try {
    const strategyData = {
      ...req.body,
      userId: req.user._id
    };

    const strategy = new TradingStrategy(strategyData);
    await strategy.save();

    res.status(201).json({
      success: true,
      data: strategy
    });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating trading strategy',
      error: error.message
    });
  }
});

// @route   PUT /api/trading/strategies/:id
// @desc    Update trading strategy
// @access  Private
router.put('/strategies/:id', protect, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    // Update fields
    Object.assign(strategy, req.body);
    await strategy.save();

    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    console.error('Error updating strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating strategy'
    });
  }
});

// @route   DELETE /api/trading/strategies/:id
// @desc    Delete trading strategy
// @access  Private
router.delete('/strategies/:id', protect, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    await strategy.deleteOne();

    res.json({
      success: true,
      message: 'Strategy deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting strategy'
    });
  }
});

// @route   POST /api/trading/strategies/:id/activate
// @desc    Activate a trading strategy
// @access  Private
router.post('/strategies/:id/activate', protect, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    strategy.isActive = true;
    await strategy.save();

    // Activate in trading engine
    if (req.app.locals.tradingEngine) {
      await req.app.locals.tradingEngine.activateStrategy(strategy._id);
    }

    res.json({
      success: true,
      data: strategy,
      message: 'Strategy activated successfully'
    });
  } catch (error) {
    console.error('Error activating strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating strategy'
    });
  }
});

// @route   POST /api/trading/strategies/:id/deactivate
// @desc    Deactivate a trading strategy
// @access  Private
router.post('/strategies/:id/deactivate', protect, async (req, res) => {
  try {
    const strategy = await TradingStrategy.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    strategy.isActive = false;
    await strategy.save();

    // Deactivate in trading engine
    if (req.app.locals.tradingEngine) {
      await req.app.locals.tradingEngine.deactivateStrategy(strategy._id);
    }

    res.json({
      success: true,
      data: strategy,
      message: 'Strategy deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating strategy:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating strategy'
    });
  }
});

// @route   GET /api/trading/trades
// @desc    Get all trades for user
// @access  Private
router.get('/trades', protect, async (req, res) => {
  try {
    const { status, strategyId, limit = 50 } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (strategyId) query.strategyId = strategyId;

    const trades = await Trade.find(query)
      .populate('strategyId', 'name')
      .populate('newsEventId', 'title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: trades.length,
      data: trades
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trades'
    });
  }
});

// @route   GET /api/trading/trades/:id
// @desc    Get single trade
// @access  Private
router.get('/trades/:id', protect, async (req, res) => {
  try {
    const trade = await Trade.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('strategyId', 'name')
      .populate('newsEventId');

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    console.error('Error fetching trade:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trade'
    });
  }
});

// @route   POST /api/trading/trades/:id/close
// @desc    Manually close a trade
// @access  Private
router.post('/trades/:id/close', protect, async (req, res) => {
  try {
    const { exitPrice } = req.body;

    const trade = await Trade.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found'
      });
    }

    if (trade.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Trade is not open'
      });
    }

    await trade.closeTrade(exitPrice, 'manual');

    // Update strategy performance
    const strategy = await TradingStrategy.findById(trade.strategyId);
    if (strategy) {
      strategy.updatePerformance({ profit: trade.netProfit });
      await strategy.save();
    }

    res.json({
      success: true,
      data: trade,
      message: 'Trade closed successfully'
    });
  } catch (error) {
    console.error('Error closing trade:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing trade'
    });
  }
});

// @route   GET /api/trading/news
// @desc    Get recent news events
// @access  Private
router.get('/news', protect, async (req, res) => {
  try {
    const { category, limit = 20 } = req.query;

    const query = {};
    if (category) query.category = category;

    const newsEvents = await NewsEvent.find(query)
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: newsEvents.length,
      data: newsEvents
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching news events'
    });
  }
});

// @route   GET /api/trading/news/:id
// @desc    Get single news event
// @access  Private
router.get('/news/:id', protect, async (req, res) => {
  try {
    const newsEvent = await NewsEvent.findById(req.params.id);

    if (!newsEvent) {
      return res.status(404).json({
        success: false,
        message: 'News event not found'
      });
    }

    res.json({
      success: true,
      data: newsEvent
    });
  } catch (error) {
    console.error('Error fetching news event:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching news event'
    });
  }
});

// @route   GET /api/trading/dashboard
// @desc    Get trading dashboard data
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Get active strategies
    const activeStrategies = await TradingStrategy.find({
      userId: req.user._id,
      isActive: true
    });

    // Get today's trades
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTrades = await Trade.find({
      userId: req.user._id,
      createdAt: { $gte: today }
    });

    // Calculate today's profit
    const todayProfit = todayTrades.reduce((sum, trade) => {
      return sum + (trade.netProfit || 0);
    }, 0);

    // Get open trades
    const openTrades = await Trade.find({
      userId: req.user._id,
      status: 'open'
    });

    // Get recent news
    const recentNews = await NewsEvent.find({})
      .sort({ publishedAt: -1 })
      .limit(10);

    // Overall statistics
    const allTrades = await Trade.find({ userId: req.user._id });
    const totalProfit = allTrades.reduce((sum, trade) => sum + (trade.netProfit || 0), 0);
    const successfulTrades = allTrades.filter(t => t.netProfit > 0).length;
    const winRate = allTrades.length > 0 ? (successfulTrades / allTrades.length) * 100 : 0;

    res.json({
      success: true,
      data: {
        strategies: {
          total: await TradingStrategy.countDocuments({ userId: req.user._id }),
          active: activeStrategies.length,
          details: activeStrategies
        },
        trades: {
          total: allTrades.length,
          open: openTrades.length,
          today: todayTrades.length,
          openDetails: openTrades
        },
        profit: {
          today: todayProfit,
          total: totalProfit,
          winRate: winRate.toFixed(2)
        },
        recentNews
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

// @route   GET /api/trading/performance
// @desc    Get trading performance analytics
// @access  Private
router.get('/performance', protect, async (req, res) => {
  try {
    const { strategyId, period = '30d' } = req.query;

    // Calculate date range
    const daysMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const days = daysMap[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query
    const query = {
      userId: req.user._id,
      createdAt: { $gte: startDate }
    };

    if (strategyId) {
      query.strategyId = strategyId;
    }

    // Get trades
    const trades = await Trade.find(query).sort({ createdAt: 1 });

    // Calculate daily performance
    const dailyPerformance = {};
    trades.forEach(trade => {
      const date = trade.createdAt.toISOString().split('T')[0];
      if (!dailyPerformance[date]) {
        dailyPerformance[date] = {
          date,
          profit: 0,
          trades: 0,
          successful: 0
        };
      }
      dailyPerformance[date].profit += trade.netProfit || 0;
      dailyPerformance[date].trades += 1;
      if (trade.netProfit > 0) dailyPerformance[date].successful += 1;
    });

    const performanceData = Object.values(dailyPerformance);

    res.json({
      success: true,
      data: {
        period,
        totalTrades: trades.length,
        totalProfit: trades.reduce((sum, t) => sum + (t.netProfit || 0), 0),
        successfulTrades: trades.filter(t => t.netProfit > 0).length,
        dailyPerformance: performanceData
      }
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching performance data'
    });
  }
});

module.exports = router;
