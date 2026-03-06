const Trade = require('../models/Trade');
const TradingConfig = require('../models/TradingConfig');
const newsEngine = require('./newsEngine');

// Simulated base prices for assets
const BASE_PRICES = {
  'AAPL': 195, 'TSLA': 250, 'NVDA': 880, 'AMZN': 185, 'GOOGL': 155,
  'META': 510, 'MSFT': 420, 'AMD': 175, 'NFLX': 620, 'DIS': 115,
  'JPM': 195, 'V': 280, 'WMT': 170, 'XOM': 105, 'COIN': 220,
  'SQ': 80, 'PLTR': 25, 'RIVN': 18, 'BTC': 68000, 'ETH': 3500,
  'SPY': 510
};

// Track live prices with random walk
const livePrices = { ...BASE_PRICES };

class TradingEngine {
  constructor() {
    this.activeIntervals = new Map(); // userId -> intervalId
    this.io = null;
    this.eventLog = new Map(); // userId -> recent events array
  }

  /**
   * Set Socket.IO instance for real-time updates
   */
  setIO(io) {
    this.io = io;
  }

  /**
   * Start auto-trading for a user
   */
  async start(userId) {
    if (this.activeIntervals.has(userId.toString())) {
      return { success: false, message: 'Trading bot is already running' };
    }

    const config = await TradingConfig.findOne({ user: userId });
    if (!config) {
      return { success: false, message: 'No trading configuration found. Please configure settings first.' };
    }

    config.isActive = true;
    config.checkDailyReset();
    await config.save();

    // Run immediately once
    this._executeCycle(userId, config);

    // Then run on interval
    const intervalMs = (config.scanInterval || 30) * 1000;
    const intervalId = setInterval(() => {
      this._executeCycle(userId, config);
    }, intervalMs);

    this.activeIntervals.set(userId.toString(), intervalId);

    this._emit(userId, 'bot_status', { active: true, message: 'Auto-trading started' });

    return { success: true, message: 'Auto-trading started' };
  }

  /**
   * Stop auto-trading for a user
   */
  async stop(userId) {
    const intervalId = this.activeIntervals.get(userId.toString());
    if (intervalId) {
      clearInterval(intervalId);
      this.activeIntervals.delete(userId.toString());
    }

    const config = await TradingConfig.findOne({ user: userId });
    if (config) {
      config.isActive = false;
      await config.save();
    }

    this._emit(userId, 'bot_status', { active: false, message: 'Auto-trading stopped' });

    return { success: true, message: 'Auto-trading stopped' };
  }

  /**
   * Check if bot is running for user
   */
  isRunning(userId) {
    return this.activeIntervals.has(userId.toString());
  }

  /**
   * Main trading cycle
   */
  async _executeCycle(userId, configParam) {
    try {
      // Reload config to get latest settings
      const config = await TradingConfig.findOne({ user: userId });
      if (!config || !config.isActive) {
        this.stop(userId);
        return;
      }

      // Check daily reset
      config.checkDailyReset();

      // Check if daily target already reached
      if (config.dailyStats.targetReached) {
        this._emit(userId, 'bot_status', {
          active: true,
          message: 'Daily profit target reached! Bot paused until tomorrow.',
          targetReached: true
        });
        return;
      }

      // Check if loss limit hit
      if (config.dailyStats.lossLimitHit) {
        this._emit(userId, 'bot_status', {
          active: true,
          message: 'Daily loss limit hit! Bot paused until tomorrow.',
          lossLimitHit: true
        });
        return;
      }

      // Check trading hours
      if (config.tradingHours.enabled) {
        const hour = new Date().getUTCHours();
        if (hour < config.tradingHours.startHour || hour >= config.tradingHours.endHour) {
          return; // Outside trading hours
        }
      }

      // Update live prices
      this._updatePrices();

      // Check and close existing positions
      await this._manageOpenPositions(userId, config);

      // Fetch and process news signals
      const signals = await newsEngine.processNews(
        config.watchlist,
        config.newsSources,
        config.minSentimentScore
      );

      // Emit news events
      for (const signal of signals) {
        this._addEvent(userId, {
          type: 'news',
          symbol: signal.symbol,
          headline: signal.article.headline,
          source: signal.article.source,
          sentiment: signal.sentiment,
          sentimentScore: signal.sentimentScore,
          timestamp: new Date()
        });
      }

      this._emit(userId, 'news_events', this.getEvents(userId));

      // Check open trade count
      const openTrades = await Trade.countDocuments({ user: userId, status: 'open' });
      if (openTrades >= config.maxOpenTrades) {
        return; // Max open trades reached
      }

      // Filter signals by enabled strategies and assets
      const validSignals = signals.filter(s => {
        const assetType = ['BTC', 'ETH', 'COIN'].includes(s.symbol) ? 'crypto' : 'stock';
        return config.enabledAssets.includes(assetType);
      });

      // Execute trades for top signals
      const slotsAvailable = config.maxOpenTrades - openTrades;
      const toExecute = validSignals.slice(0, Math.min(slotsAvailable, 2)); // Max 2 new trades per cycle

      for (const signal of toExecute) {
        // Check if we already have an open position in this symbol
        const existing = await Trade.findOne({ user: userId, symbol: signal.symbol, status: 'open' });
        if (existing) continue;

        await this._executeTrade(userId, signal, config);
      }

      // Recalculate daily P&L
      await this._updateDailyPnl(userId, config);

      // Emit P&L update
      this._emit(userId, 'pnl_update', {
        dailyStats: config.dailyStats,
        dailyTarget: config.dailyProfitTarget,
        dailyLossLimit: config.dailyLossLimit,
        progress: Math.min(100, (config.dailyStats.realizedPnl / config.dailyProfitTarget) * 100)
      });

    } catch (error) {
      console.error(`Trading cycle error for user ${userId}:`, error.message);
      this._emit(userId, 'bot_error', { message: error.message });
    }
  }

  /**
   * Execute a single trade
   */
  async _executeTrade(userId, signal, config) {
    const price = this._getPrice(signal.symbol);
    if (!price) return;

    // Calculate position size based on risk
    const quantity = Math.max(1, Math.floor(config.maxPositionSize / price));
    const stopLossPrice = signal.side === 'buy'
      ? price * (1 - config.stopLossPercent / 100)
      : price * (1 + config.stopLossPercent / 100);
    const takeProfitPrice = signal.side === 'buy'
      ? price * (1 + config.takeProfitPercent / 100)
      : price * (1 - config.takeProfitPercent / 100);

    const trade = new Trade({
      user: userId,
      symbol: signal.symbol,
      assetType: ['BTC', 'ETH'].includes(signal.symbol) ? 'crypto' : 'stock',
      side: signal.side,
      entryPrice: price,
      currentPrice: price,
      quantity,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      strategy: 'news_momentum',
      triggerEvent: {
        headline: signal.article.headline,
        source: signal.article.source,
        url: signal.article.url,
        sentiment: signal.sentiment,
        sentimentScore: signal.sentimentScore,
        detectedAt: signal.timestamp
      },
      fees: Math.round(price * quantity * 0.001 * 100) / 100 // 0.1% fee
    });

    await trade.save();

    // Update config stats
    config.dailyStats.totalTrades += 1;
    config.allTimeStats.totalTrades += 1;
    await config.save();

    const tradeData = trade.toObject();
    this._addEvent(userId, {
      type: 'trade_opened',
      tradeId: trade.tradeId,
      symbol: trade.symbol,
      side: trade.side,
      price: trade.entryPrice,
      quantity: trade.quantity,
      reason: signal.article.headline,
      timestamp: new Date()
    });

    this._emit(userId, 'trade_executed', tradeData);
  }

  /**
   * Manage open positions - check SL/TP and update prices
   */
  async _manageOpenPositions(userId, config) {
    const openTrades = await Trade.find({ user: userId, status: 'open' });

    for (const trade of openTrades) {
      const currentPrice = this._getPrice(trade.symbol);
      if (!currentPrice) continue;

      trade.currentPrice = currentPrice;
      trade.calculatePnl();

      let shouldClose = false;
      let closeReason = '';

      // Check take profit
      if (trade.side === 'buy' && currentPrice >= trade.takeProfit) {
        shouldClose = true;
        closeReason = 'Take profit hit';
      } else if (trade.side === 'sell' && currentPrice <= trade.takeProfit) {
        shouldClose = true;
        closeReason = 'Take profit hit';
      }

      // Check stop loss
      if (trade.side === 'buy' && currentPrice <= trade.stopLoss) {
        shouldClose = true;
        closeReason = 'Stop loss hit';
      } else if (trade.side === 'sell' && currentPrice >= trade.stopLoss) {
        shouldClose = true;
        closeReason = 'Stop loss hit';
      }

      // Random chance to close (simulates market movement completing)
      const holdTime = Date.now() - new Date(trade.openedAt).getTime();
      if (holdTime > 120000 && Math.random() < 0.15) { // After 2 min, 15% chance per cycle
        shouldClose = true;
        closeReason = 'Position closed by strategy';
      }

      if (shouldClose) {
        trade.exitPrice = currentPrice;
        trade.status = 'closed';
        trade.closedAt = new Date();
        trade.calculatePnl();

        // Update config stats
        if (trade.realizedPnl > 0) {
          config.dailyStats.winningTrades += 1;
          config.allTimeStats.winningTrades += 1;
        } else {
          config.dailyStats.losingTrades += 1;
          config.allTimeStats.losingTrades += 1;
        }

        config.dailyStats.realizedPnl += trade.realizedPnl;
        config.allTimeStats.totalPnl += trade.realizedPnl;

        this._addEvent(userId, {
          type: 'trade_closed',
          tradeId: trade.tradeId,
          symbol: trade.symbol,
          side: trade.side,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          pnl: trade.realizedPnl,
          reason: closeReason,
          timestamp: new Date()
        });

        this._emit(userId, 'trade_closed', trade.toObject());

        // Check if daily target reached
        if (config.dailyStats.realizedPnl >= config.dailyProfitTarget) {
          config.dailyStats.targetReached = true;
          this._emit(userId, 'daily_target_reached', {
            pnl: config.dailyStats.realizedPnl,
            target: config.dailyProfitTarget
          });
          this._addEvent(userId, {
            type: 'target_reached',
            pnl: config.dailyStats.realizedPnl,
            target: config.dailyProfitTarget,
            timestamp: new Date()
          });
        }

        // Check if loss limit hit
        if (config.dailyStats.realizedPnl <= -config.dailyLossLimit) {
          config.dailyStats.lossLimitHit = true;
          this._emit(userId, 'loss_limit_hit', {
            pnl: config.dailyStats.realizedPnl,
            limit: config.dailyLossLimit
          });
        }
      }

      await trade.save();
    }

    await config.save();
  }

  /**
   * Update daily P&L calculation
   */
  async _updateDailyPnl(userId, config) {
    const today = new Date().toISOString().split('T')[0];

    // Calculate unrealized P&L from open positions
    const openTrades = await Trade.find({ user: userId, status: 'open' });
    let unrealizedPnl = 0;
    for (const trade of openTrades) {
      unrealizedPnl += trade.unrealizedPnl || 0;
    }
    config.dailyStats.unrealizedPnl = Math.round(unrealizedPnl * 100) / 100;
    await config.save();
  }

  /**
   * Get simulated price for a symbol
   */
  _getPrice(symbol) {
    return livePrices[symbol] || null;
  }

  /**
   * Update prices with random walk
   */
  _updatePrices() {
    for (const [symbol, basePrice] of Object.entries(BASE_PRICES)) {
      const current = livePrices[symbol] || basePrice;
      const volatility = ['BTC', 'ETH'].includes(symbol) ? 0.003 : 0.001;
      const change = current * volatility * (Math.random() * 2 - 1);
      livePrices[symbol] = Math.round((current + change) * 100) / 100;
    }
  }

  /**
   * Get current prices
   */
  getPrices() {
    return { ...livePrices };
  }

  /**
   * Add event to user's event log
   */
  _addEvent(userId, event) {
    const key = userId.toString();
    if (!this.eventLog.has(key)) {
      this.eventLog.set(key, []);
    }
    const events = this.eventLog.get(key);
    events.unshift(event);
    // Keep last 50 events
    if (events.length > 50) events.pop();
  }

  /**
   * Get events for a user
   */
  getEvents(userId) {
    return this.eventLog.get(userId.toString()) || [];
  }

  /**
   * Emit socket event to specific user
   */
  _emit(userId, event, data) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  /**
   * Get daily summary for a user
   */
  async getDailySummary(userId) {
    const config = await TradingConfig.findOne({ user: userId });
    if (!config) return null;

    config.checkDailyReset();
    await config.save();

    const today = new Date().toISOString().split('T')[0];
    const todayTrades = await Trade.find({ user: userId, tradingDay: today }).sort({ openedAt: -1 });
    const openTrades = await Trade.find({ user: userId, status: 'open' });

    // Update current prices on open trades
    for (const trade of openTrades) {
      const price = this._getPrice(trade.symbol);
      if (price) {
        trade.currentPrice = price;
        trade.calculatePnl();
      }
    }

    return {
      config: {
        isActive: config.isActive,
        dailyProfitTarget: config.dailyProfitTarget,
        dailyLossLimit: config.dailyLossLimit,
        scanInterval: config.scanInterval,
        watchlist: config.watchlist,
        strategies: config.strategies
      },
      dailyStats: config.dailyStats,
      allTimeStats: config.allTimeStats,
      todayTrades,
      openTrades,
      prices: this.getPrices(),
      events: this.getEvents(userId),
      botRunning: this.isRunning(userId)
    };
  }

  /**
   * Get trade history with pagination
   */
  async getTradeHistory(userId, page = 1, limit = 20, filters = {}) {
    const query = { user: userId };

    if (filters.status) query.status = filters.status;
    if (filters.symbol) query.symbol = filters.symbol.toUpperCase();
    if (filters.side) query.side = filters.side;
    if (filters.startDate || filters.endDate) {
      query.openedAt = {};
      if (filters.startDate) query.openedAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.openedAt.$lte = new Date(filters.endDate);
    }

    const total = await Trade.countDocuments(query);
    const trades = await Trade.find(query)
      .sort({ openedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Update current prices for open trades
    for (const trade of trades) {
      if (trade.status === 'open') {
        const price = this._getPrice(trade.symbol);
        if (price) {
          trade.currentPrice = price;
          trade.calculatePnl();
        }
      }
    }

    return {
      trades,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new TradingEngine();
