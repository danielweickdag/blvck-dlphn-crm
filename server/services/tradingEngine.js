const TradingStrategy = require('../models/TradingStrategy');
const Trade = require('../models/Trade');
const NewsEvent = require('../models/NewsEvent');
const newsService = require('./newsService');

class TradingEngine {
  constructor(io) {
    this.io = io;
    this.activeStrategies = new Map();
    this.runningIntervals = new Map();
    this.simulationMode = process.env.TRADING_SIMULATION === 'true';
  }

  /**
   * Initialize the trading engine
   */
  async initialize() {
    console.log('Initializing Trading Engine...');

    // Load all active strategies
    const strategies = await TradingStrategy.find({ isActive: true });

    for (const strategy of strategies) {
      await this.activateStrategy(strategy._id);
    }

    console.log(`Trading Engine initialized with ${strategies.length} active strategies`);
  }

  /**
   * Activate a trading strategy
   */
  async activateStrategy(strategyId) {
    try {
      const strategy = await TradingStrategy.findById(strategyId);

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      // Reset daily profit if needed
      strategy.resetDailyProfit();
      await strategy.save();

      // Store in active strategies
      this.activeStrategies.set(strategyId.toString(), strategy);

      // Start monitoring for this strategy
      const interval = setInterval(() => {
        this.executeStrategy(strategyId);
      }, 60000); // Check every minute

      this.runningIntervals.set(strategyId.toString(), interval);

      console.log(`Strategy ${strategy.name} activated`);

      // Emit event
      this.emitEvent('strategy_activated', {
        strategyId: strategy._id,
        name: strategy.name,
        userId: strategy.userId
      });

      return strategy;
    } catch (error) {
      console.error('Error activating strategy:', error.message);
      throw error;
    }
  }

  /**
   * Deactivate a trading strategy
   */
  async deactivateStrategy(strategyId) {
    try {
      const strategyIdStr = strategyId.toString();

      // Clear interval
      const interval = this.runningIntervals.get(strategyIdStr);
      if (interval) {
        clearInterval(interval);
        this.runningIntervals.delete(strategyIdStr);
      }

      // Remove from active strategies
      this.activeStrategies.delete(strategyIdStr);

      // Update database
      await TradingStrategy.findByIdAndUpdate(strategyId, { isActive: false });

      console.log(`Strategy ${strategyId} deactivated`);

      this.emitEvent('strategy_deactivated', { strategyId });
    } catch (error) {
      console.error('Error deactivating strategy:', error.message);
      throw error;
    }
  }

  /**
   * Execute a trading strategy
   */
  async executeStrategy(strategyId) {
    try {
      const strategy = await TradingStrategy.findById(strategyId);

      if (!strategy || !strategy.isActive) {
        return;
      }

      // Reset daily profit if new day
      if (strategy.resetDailyProfit()) {
        await strategy.save();
      }

      // Check if daily profit target is reached
      if (strategy.isProfitTargetReached()) {
        console.log(`Daily profit target reached for strategy ${strategy.name}`);

        if (strategy.notifications.dailyProfitReached) {
          this.emitEvent('daily_profit_reached', {
            strategyId: strategy._id,
            userId: strategy.userId,
            profit: strategy.dailyProfitTarget.currentProfit,
            target: strategy.dailyProfitTarget.amount
          });
        }

        return; // Stop trading for the day
      }

      // Check if within trading hours
      if (!this.isWithinTradingHours(strategy)) {
        return;
      }

      // Get unprocessed news events matching strategy filters
      const newsEvents = await this.getRelevantNews(strategy);

      for (const newsEvent of newsEvents) {
        await this.processNewsEvent(strategy, newsEvent);
      }

      strategy.lastExecuted = new Date();
      await strategy.save();

    } catch (error) {
      console.error(`Error executing strategy ${strategyId}:`, error.message);

      // Update strategy with error
      await TradingStrategy.findByIdAndUpdate(strategyId, {
        lastError: {
          message: error.message,
          timestamp: new Date()
        }
      });
    }
  }

  /**
   * Check if current time is within trading hours
   */
  isWithinTradingHours(strategy) {
    if (!strategy.tradingSchedule.enabled) {
      return true;
    }

    const now = new Date();
    const day = now.getDay();

    // Check if today is an active day
    if (strategy.tradingSchedule.activeDays.length > 0 &&
        !strategy.tradingSchedule.activeDays.includes(day)) {
      return false;
    }

    // Check time range
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const startTime = strategy.tradingSchedule.activeHours.start;
    const endTime = strategy.tradingSchedule.activeHours.end;

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Get relevant news events for a strategy
   */
  async getRelevantNews(strategy) {
    const query = {
      processed: false,
      publishedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    };

    // Filter by categories
    if (strategy.newsFilters.categories.length > 0) {
      query.category = { $in: strategy.newsFilters.categories };
    }

    // Filter by sentiment
    if (strategy.newsFilters.minSentimentScore) {
      query['sentiment.score'] = { $gte: strategy.newsFilters.minSentimentScore };
    }

    const newsEvents = await NewsEvent.find(query)
      .sort({ publishedAt: -1 })
      .limit(10);

    // Additional keyword filtering
    return newsEvents.filter(news => {
      const text = `${news.title} ${news.description}`.toLowerCase();

      // Check include keywords
      if (strategy.newsFilters.keywords.length > 0) {
        const hasKeyword = strategy.newsFilters.keywords.some(keyword =>
          text.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) return false;
      }

      // Check exclude keywords
      if (strategy.newsFilters.excludeKeywords.length > 0) {
        const hasExcluded = strategy.newsFilters.excludeKeywords.some(keyword =>
          text.includes(keyword.toLowerCase())
        );
        if (hasExcluded) return false;
      }

      return true;
    });
  }

  /**
   * Process a news event and generate trading signals
   */
  async processNewsEvent(strategy, newsEvent) {
    try {
      // Generate trading signals based on news
      const signals = this.generateTradingSignals(strategy, newsEvent);

      for (const signal of signals) {
        // Check if signal meets confidence threshold
        const tradingPair = strategy.tradingPairs.find(p => p.symbol === signal.symbol);

        if (!tradingPair || signal.confidence < tradingPair.minConfidence) {
          continue;
        }

        // Check if we can open more trades
        const openTrades = await Trade.countDocuments({
          strategyId: strategy._id,
          status: 'open'
        });

        if (openTrades >= strategy.riskManagement.maxOpenTrades) {
          console.log(`Max open trades reached for strategy ${strategy.name}`);
          continue;
        }

        // Execute trade
        await this.executeTrade(strategy, newsEvent, signal);
      }

      // Mark news as processed
      await newsService.markAsProcessed(newsEvent._id);

    } catch (error) {
      console.error('Error processing news event:', error.message);
    }
  }

  /**
   * Generate trading signals from news event
   */
  generateTradingSignals(strategy, newsEvent) {
    const signals = [];

    // Simple signal generation based on sentiment and market impact
    if (newsEvent.sentiment.score > 0.3 && newsEvent.marketImpact.potential === 'high') {
      // Generate buy signals for affected markets
      strategy.tradingPairs.forEach(pair => {
        signals.push({
          symbol: pair.symbol,
          exchange: pair.exchange,
          action: 'buy',
          confidence: Math.min(newsEvent.sentiment.score * newsEvent.sentiment.confidence, 1),
          reasoning: `Positive news: ${newsEvent.title}`,
          sentimentScore: newsEvent.sentiment.score,
          marketImpact: newsEvent.marketImpact.potential
        });
      });
    } else if (newsEvent.sentiment.score < -0.3 && newsEvent.marketImpact.potential === 'high') {
      // Generate sell signals
      strategy.tradingPairs.forEach(pair => {
        signals.push({
          symbol: pair.symbol,
          exchange: pair.exchange,
          action: 'sell',
          confidence: Math.min(Math.abs(newsEvent.sentiment.score) * newsEvent.sentiment.confidence, 1),
          reasoning: `Negative news: ${newsEvent.title}`,
          sentimentScore: newsEvent.sentiment.score,
          marketImpact: newsEvent.marketImpact.potential
        });
      });
    }

    return signals;
  }

  /**
   * Execute a trade
   */
  async executeTrade(strategy, newsEvent, signal) {
    try {
      // Simulate getting current market price
      const currentPrice = await this.getCurrentPrice(signal.symbol, signal.exchange);

      // Calculate position size based on risk management
      const positionSize = this.calculatePositionSize(strategy, currentPrice);

      // Calculate stop loss and take profit
      const stopLoss = {
        price: currentPrice * (1 - strategy.riskManagement.stopLossPercentage / 100),
        percentage: strategy.riskManagement.stopLossPercentage
      };

      const takeProfit = {
        price: currentPrice * (1 + strategy.riskManagement.takeProfitPercentage / 100),
        percentage: strategy.riskManagement.takeProfitPercentage
      };

      // Create trade
      const trade = new Trade({
        userId: strategy.userId,
        strategyId: strategy._id,
        newsEventId: newsEvent._id,
        symbol: signal.symbol,
        exchange: signal.exchange,
        side: signal.action,
        entryPrice: currentPrice,
        quantity: positionSize,
        stopLoss,
        takeProfit,
        status: this.simulationMode ? 'open' : 'pending',
        signal: {
          confidence: signal.confidence,
          reasoning: signal.reasoning,
          sentimentScore: signal.sentimentScore,
          marketImpact: signal.marketImpact
        },
        isAutomated: true,
        automationRules: {
          autoClose: true,
          trailingStop: {
            enabled: false
          }
        }
      });

      await trade.save();

      console.log(`Trade executed: ${signal.action} ${positionSize} ${signal.symbol} at ${currentPrice}`);

      // Emit trade event
      this.emitEvent('trade_executed', {
        tradeId: trade._id,
        userId: strategy.userId,
        strategyId: strategy._id,
        symbol: signal.symbol,
        action: signal.action,
        price: currentPrice,
        quantity: positionSize
      });

      // Simulate trade execution in simulation mode
      if (this.simulationMode) {
        setTimeout(() => {
          this.simulateTradeOutcome(trade._id, strategy._id);
        }, 10000); // Simulate outcome after 10 seconds
      }

      return trade;

    } catch (error) {
      console.error('Error executing trade:', error.message);
      throw error;
    }
  }

  /**
   * Get current market price (simulated)
   */
  async getCurrentPrice(symbol, exchange) {
    // In a real implementation, this would fetch from an exchange API
    // For now, return simulated price
    const basePrice = 100 + Math.random() * 900; // Random price between 100-1000
    return parseFloat(basePrice.toFixed(2));
  }

  /**
   * Calculate position size based on risk management
   */
  calculatePositionSize(strategy, price) {
    const maxTradeSize = strategy.riskManagement.maxTradeSize;
    const quantity = Math.floor(maxTradeSize / price);
    return Math.max(1, quantity);
  }

  /**
   * Simulate trade outcome (for testing)
   */
  async simulateTradeOutcome(tradeId, strategyId) {
    try {
      const trade = await Trade.findById(tradeId);
      if (!trade || trade.status !== 'open') return;

      const strategy = await TradingStrategy.findById(strategyId);
      if (!strategy) return;

      // Randomly determine outcome (70% success rate)
      const isSuccess = Math.random() > 0.3;

      let exitPrice, exitReason;

      if (isSuccess) {
        // Hit take profit
        exitPrice = trade.takeProfit.price;
        exitReason = 'take_profit';
      } else {
        // Hit stop loss
        exitPrice = trade.stopLoss.price;
        exitReason = 'stop_loss';
      }

      // Close the trade
      await trade.closeTrade(exitPrice, exitReason);

      // Update strategy performance
      strategy.updatePerformance({
        profit: trade.netProfit
      });

      await strategy.save();

      console.log(`Trade ${tradeId} closed: ${exitReason}, profit: ${trade.netProfit}`);

      // Emit trade closed event
      this.emitEvent('trade_closed', {
        tradeId: trade._id,
        userId: strategy.userId,
        strategyId: strategy._id,
        exitPrice,
        exitReason,
        profit: trade.netProfit
      });

      // Check if daily profit target reached
      if (strategy.isProfitTargetReached()) {
        this.emitEvent('daily_profit_reached', {
          strategyId: strategy._id,
          userId: strategy.userId,
          profit: strategy.dailyProfitTarget.currentProfit,
          target: strategy.dailyProfitTarget.amount
        });
      }

    } catch (error) {
      console.error('Error simulating trade outcome:', error.message);
    }
  }

  /**
   * Monitor open trades and manage positions
   */
  async monitorOpenTrades() {
    try {
      const openTrades = await Trade.find({ status: 'open' });

      for (const trade of openTrades) {
        // Get current price
        const currentPrice = await this.getCurrentPrice(trade.symbol, trade.exchange);

        // Check stop loss
        if (trade.side === 'buy' && currentPrice <= trade.stopLoss.price) {
          await this.closeTrade(trade._id, currentPrice, 'stop_loss');
        } else if (trade.side === 'sell' && currentPrice >= trade.stopLoss.price) {
          await this.closeTrade(trade._id, currentPrice, 'stop_loss');
        }

        // Check take profit
        if (trade.side === 'buy' && currentPrice >= trade.takeProfit.price) {
          await this.closeTrade(trade._id, currentPrice, 'take_profit');
        } else if (trade.side === 'sell' && currentPrice <= trade.takeProfit.price) {
          await this.closeTrade(trade._id, currentPrice, 'take_profit');
        }
      }
    } catch (error) {
      console.error('Error monitoring trades:', error.message);
    }
  }

  /**
   * Close a trade
   */
  async closeTrade(tradeId, exitPrice, reason) {
    try {
      const trade = await Trade.findById(tradeId);
      if (!trade) return;

      await trade.closeTrade(exitPrice, reason);

      // Update strategy performance
      const strategy = await TradingStrategy.findById(trade.strategyId);
      if (strategy) {
        strategy.updatePerformance({
          profit: trade.netProfit
        });
        await strategy.save();
      }

      console.log(`Trade ${tradeId} closed: ${reason}`);

      this.emitEvent('trade_closed', {
        tradeId: trade._id,
        userId: trade.userId,
        strategyId: trade.strategyId,
        exitPrice,
        reason,
        profit: trade.netProfit
      });

    } catch (error) {
      console.error('Error closing trade:', error.message);
    }
  }

  /**
   * Emit socket event
   */
  emitEvent(eventName, data) {
    if (this.io && data.userId) {
      this.io.to(`user_${data.userId}`).emit(eventName, data);
    }
  }

  /**
   * Start the trading engine
   */
  start() {
    console.log('Starting Trading Engine...');

    // Monitor open trades every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.monitorOpenTrades();
    }, 30000);

    console.log('Trading Engine started');
  }

  /**
   * Stop the trading engine
   */
  stop() {
    console.log('Stopping Trading Engine...');

    // Clear all intervals
    for (const interval of this.runningIntervals.values()) {
      clearInterval(interval);
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.runningIntervals.clear();
    this.activeStrategies.clear();

    console.log('Trading Engine stopped');
  }
}

module.exports = TradingEngine;
