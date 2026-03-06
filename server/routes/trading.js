const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const TradingConfig = require('../models/TradingConfig');
const Trade = require('../models/Trade');
const tradingEngine = require('../services/tradingEngine');
const newsEngine = require('../services/newsEngine');

// All routes require authentication
router.use(protect);

// ============================================
// TRADING CONFIG
// ============================================

/**
 * GET /api/trading/config
 * Get user's trading configuration
 */
router.get('/config', async (req, res) => {
  try {
    let config = await TradingConfig.findOne({ user: req.user._id });

    if (!config) {
      // Create default config
      config = await TradingConfig.create({ user: req.user._id });
    }

    config.checkDailyReset();
    await config.save();

    res.json({ success: true, config });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/trading/config
 * Update trading configuration
 */
router.put('/config', async (req, res) => {
  try {
    const allowedFields = [
      'dailyProfitTarget', 'dailyLossLimit', 'riskPerTrade', 'maxPositionSize',
      'maxOpenTrades', 'enabledAssets', 'watchlist', 'strategies',
      'minSentimentScore', 'takeProfitPercent', 'stopLossPercent',
      'scanInterval', 'newsSources', 'tradingHours'
    ];

    let config = await TradingConfig.findOne({ user: req.user._id });
    if (!config) {
      config = new TradingConfig({ user: req.user._id });
    }

    // Update only allowed fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        config[field] = req.body[field];
      }
    }

    await config.save();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// BOT CONTROL
// ============================================

/**
 * POST /api/trading/start
 * Start the auto-trading bot
 */
router.post('/start', async (req, res) => {
  try {
    const result = await tradingEngine.start(req.user._id);
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    console.error('Start bot error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/trading/stop
 * Stop the auto-trading bot
 */
router.post('/stop', async (req, res) => {
  try {
    const result = await tradingEngine.stop(req.user._id);
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    console.error('Stop bot error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/trading/status
 * Get bot status
 */
router.get('/status', async (req, res) => {
  try {
    const running = tradingEngine.isRunning(req.user._id);
    const config = await TradingConfig.findOne({ user: req.user._id });

    res.json({
      success: true,
      running,
      isActive: config?.isActive || false,
      dailyStats: config?.dailyStats || {},
      allTimeStats: config?.allTimeStats || {}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// DASHBOARD DATA
// ============================================

/**
 * GET /api/trading/dashboard
 * Get full dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const summary = await tradingEngine.getDailySummary(req.user._id);

    if (!summary) {
      // Create default config and return empty dashboard
      const config = await TradingConfig.create({ user: req.user._id });
      return res.json({
        success: true,
        data: {
          config: {
            isActive: false,
            dailyProfitTarget: config.dailyProfitTarget,
            dailyLossLimit: config.dailyLossLimit,
            scanInterval: config.scanInterval,
            watchlist: config.watchlist,
            strategies: config.strategies
          },
          dailyStats: config.dailyStats,
          allTimeStats: config.allTimeStats,
          todayTrades: [],
          openTrades: [],
          prices: tradingEngine.getPrices(),
          events: [],
          botRunning: false
        }
      });
    }

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/trading/prices
 * Get current simulated prices
 */
router.get('/prices', async (req, res) => {
  try {
    res.json({ success: true, prices: tradingEngine.getPrices() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// TRADES
// ============================================

/**
 * GET /api/trading/trades
 * Get trade history with pagination and filters
 */
router.get('/trades', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, symbol, side, startDate, endDate } = req.query;

    const result = await tradingEngine.getTradeHistory(
      req.user._id,
      parseInt(page),
      parseInt(limit),
      { status, symbol, side, startDate, endDate }
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/trading/trades/open
 * Get open trades only
 */
router.get('/trades/open', async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id, status: 'open' }).sort({ openedAt: -1 });

    // Update current prices
    const prices = tradingEngine.getPrices();
    for (const trade of trades) {
      if (prices[trade.symbol]) {
        trade.currentPrice = prices[trade.symbol];
        trade.calculatePnl();
      }
    }

    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/trading/trades/daily-summary
 * Get P&L summary grouped by day
 */
router.get('/trades/daily-summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const summary = await Trade.aggregate([
      {
        $match: {
          user: req.user._id,
          status: 'closed',
          closedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$tradingDay',
          totalPnl: { $sum: '$realizedPnl' },
          totalTrades: { $sum: 1 },
          winningTrades: {
            $sum: { $cond: [{ $gt: ['$realizedPnl', 0] }, 1, 0] }
          },
          losingTrades: {
            $sum: { $cond: [{ $lt: ['$realizedPnl', 0] }, 1, 0] }
          },
          totalVolume: {
            $sum: { $multiply: ['$entryPrice', '$quantity'] }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// NEWS & EVENTS
// ============================================

/**
 * GET /api/trading/news
 * Get latest news and signals
 */
router.get('/news', async (req, res) => {
  try {
    const config = await TradingConfig.findOne({ user: req.user._id });
    const watchlist = config?.watchlist || ['AAPL', 'TSLA', 'NVDA', 'BTC', 'ETH'];
    const categories = config?.newsSources || ['business', 'technology'];

    const signals = await newsEngine.processNews(watchlist, categories, 0.3);

    res.json({ success: true, signals, count: signals.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/trading/events
 * Get recent event log
 */
router.get('/events', async (req, res) => {
  try {
    const events = tradingEngine.getEvents(req.user._id);
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// MANUAL TRADE CLOSE
// ============================================

/**
 * POST /api/trading/trades/:tradeId/close
 * Manually close a trade
 */
router.post('/trades/:tradeId/close', async (req, res) => {
  try {
    const trade = await Trade.findOne({ tradeId: req.params.tradeId, user: req.user._id });

    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }

    if (trade.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Trade is already closed' });
    }

    const prices = tradingEngine.getPrices();
    const currentPrice = prices[trade.symbol] || trade.currentPrice || trade.entryPrice;

    trade.exitPrice = currentPrice;
    trade.currentPrice = currentPrice;
    trade.status = 'closed';
    trade.closedAt = new Date();
    trade.notes = 'Manually closed';
    trade.calculatePnl();
    await trade.save();

    // Update config stats
    const config = await TradingConfig.findOne({ user: req.user._id });
    if (config) {
      if (trade.realizedPnl > 0) {
        config.dailyStats.winningTrades += 1;
        config.allTimeStats.winningTrades += 1;
      } else {
        config.dailyStats.losingTrades += 1;
        config.allTimeStats.losingTrades += 1;
      }
      config.dailyStats.realizedPnl += trade.realizedPnl;
      config.allTimeStats.totalPnl += trade.realizedPnl;
      await config.save();
    }

    res.json({ success: true, trade });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/trading/reset-daily
 * Reset daily stats manually
 */
router.post('/reset-daily', async (req, res) => {
  try {
    const config = await TradingConfig.findOne({ user: req.user._id });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Config not found' });
    }

    config.dailyStats = {
      date: new Date().toISOString().split('T')[0],
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      targetReached: false,
      lossLimitHit: false
    };

    await config.save();
    res.json({ success: true, message: 'Daily stats reset', dailyStats: config.dailyStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
