const axios = require('axios');
const NewsEvent = require('../models/NewsEvent');

class NewsService {
  constructor() {
    // NewsAPI.org API key (users will need to configure this)
    this.newsApiKey = process.env.NEWS_API_KEY || '';
    this.newsApiUrl = 'https://newsapi.org/v2';

    // Alternative APIs for better coverage
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_KEY || '';
    this.finnhubKey = process.env.FINNHUB_KEY || '';

    // Cache for recent news
    this.newsCache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Fetch latest news from NewsAPI
   */
  async fetchLatestNews(options = {}) {
    try {
      const {
        category = 'business',
        query = '',
        sources = '',
        language = 'en',
        pageSize = 20
      } = options;

      const params = {
        apiKey: this.newsApiKey,
        language,
        pageSize,
        sortBy: 'publishedAt'
      };

      if (query) params.q = query;
      if (sources) params.sources = sources;
      if (category) params.category = category;

      const response = await axios.get(`${this.newsApiUrl}/top-headlines`, {
        params,
        timeout: 10000
      });

      if (response.data.status === 'ok') {
        return this.processNewsArticles(response.data.articles);
      }

      throw new Error('Failed to fetch news from NewsAPI');
    } catch (error) {
      console.error('Error fetching news:', error.message);
      return [];
    }
  }

  /**
   * Fetch everything matching specific query
   */
  async searchNews(query, options = {}) {
    try {
      const {
        from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        to = new Date().toISOString(),
        language = 'en',
        sortBy = 'publishedAt',
        pageSize = 20
      } = options;

      const params = {
        q: query,
        apiKey: this.newsApiKey,
        from,
        to,
        language,
        sortBy,
        pageSize
      };

      const response = await axios.get(`${this.newsApiUrl}/everything`, {
        params,
        timeout: 10000
      });

      if (response.data.status === 'ok') {
        return this.processNewsArticles(response.data.articles);
      }

      throw new Error('Failed to search news');
    } catch (error) {
      console.error('Error searching news:', error.message);
      return [];
    }
  }

  /**
   * Fetch financial news from Finnhub
   */
  async fetchFinancialNews(category = 'general') {
    try {
      if (!this.finnhubKey) {
        console.warn('Finnhub API key not configured');
        return [];
      }

      const response = await axios.get('https://finnhub.io/api/v1/news', {
        params: {
          category,
          token: this.finnhubKey
        },
        timeout: 10000
      });

      return this.processFinnhubNews(response.data);
    } catch (error) {
      console.error('Error fetching Finnhub news:', error.message);
      return [];
    }
  }

  /**
   * Fetch market news from Alpha Vantage
   */
  async fetchMarketNews(topics = 'technology,finance') {
    try {
      if (!this.alphaVantageKey) {
        console.warn('Alpha Vantage API key not configured');
        return [];
      }

      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'NEWS_SENTIMENT',
          topics,
          apikey: this.alphaVantageKey,
          limit: 50
        },
        timeout: 10000
      });

      if (response.data.feed) {
        return this.processAlphaVantageNews(response.data.feed);
      }

      return [];
    } catch (error) {
      console.error('Error fetching Alpha Vantage news:', error.message);
      return [];
    }
  }

  /**
   * Process and normalize news articles from NewsAPI
   */
  processNewsArticles(articles) {
    return articles.map(article => ({
      title: article.title,
      description: article.description || '',
      content: article.content || article.description || '',
      url: article.url,
      source: {
        name: article.source?.name || 'Unknown',
        id: article.source?.id
      },
      author: article.author,
      publishedAt: new Date(article.publishedAt),
      images: article.urlToImage ? [{ url: article.urlToImage }] : [],
      category: this.categorizeNews(article.title + ' ' + article.description)
    }));
  }

  /**
   * Process Finnhub news
   */
  processFinnhubNews(articles) {
    return articles.map(article => ({
      title: article.headline,
      description: article.summary || '',
      content: article.summary || '',
      url: article.url,
      source: {
        name: article.source || 'Finnhub',
        id: 'finnhub'
      },
      author: article.source,
      publishedAt: new Date(article.datetime * 1000),
      images: article.image ? [{ url: article.image }] : [],
      category: article.category || 'finance',
      tags: [article.category, 'financial', 'market']
    }));
  }

  /**
   * Process Alpha Vantage news
   */
  processAlphaVantageNews(feed) {
    return feed.map(item => ({
      title: item.title,
      description: item.summary || '',
      content: item.summary || '',
      url: item.url,
      source: {
        name: item.source || 'Alpha Vantage',
        id: 'alphavantage'
      },
      author: item.authors?.join(', '),
      publishedAt: new Date(item.time_published),
      images: item.banner_image ? [{ url: item.banner_image }] : [],
      category: this.categorizeNews(item.title),
      sentiment: {
        score: parseFloat(item.overall_sentiment_score) || 0,
        label: item.overall_sentiment_label || 'neutral',
        confidence: 0.8
      },
      tags: item.topics?.map(t => t.topic) || []
    }));
  }

  /**
   * Categorize news based on content
   */
  categorizeNews(text) {
    const lowerText = text.toLowerCase();

    const categories = {
      crypto: ['bitcoin', 'ethereum', 'cryptocurrency', 'blockchain', 'crypto'],
      stocks: ['stock', 'shares', 'equity', 'nasdaq', 'dow jones', 's&p 500'],
      forex: ['forex', 'currency', 'dollar', 'euro', 'exchange rate'],
      commodities: ['oil', 'gold', 'silver', 'commodity', 'crude'],
      technology: ['tech', 'ai', 'software', 'startup', 'innovation'],
      economics: ['economy', 'gdp', 'inflation', 'federal reserve', 'interest rate'],
      politics: ['government', 'election', 'policy', 'president', 'congress'],
      energy: ['energy', 'renewable', 'solar', 'wind', 'power'],
      healthcare: ['health', 'medical', 'pharma', 'drug', 'vaccine']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Analyze sentiment of news (simple implementation)
   */
  analyzeSentiment(text) {
    const positiveWords = ['gain', 'rise', 'growth', 'profit', 'success', 'surge', 'rally', 'bullish', 'breakthrough', 'record'];
    const negativeWords = ['loss', 'fall', 'drop', 'decline', 'crisis', 'crash', 'bearish', 'plunge', 'failure', 'recession'];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.1;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.1;
    });

    // Clamp between -1 and 1
    score = Math.max(-1, Math.min(1, score));

    let label = 'neutral';
    if (score > 0.2) label = 'positive';
    if (score < -0.2) label = 'negative';

    return {
      score,
      label,
      confidence: Math.abs(score)
    };
  }

  /**
   * Assess market impact of news
   */
  assessMarketImpact(newsItem) {
    const highImpactKeywords = ['fed', 'federal reserve', 'interest rate', 'war', 'crisis', 'crash', 'breakthrough'];
    const lowerText = (newsItem.title + ' ' + newsItem.description).toLowerCase();

    let potential = 'medium';
    let volatilityScore = 5;

    if (highImpactKeywords.some(keyword => lowerText.includes(keyword))) {
      potential = 'high';
      volatilityScore = 8;
    }

    // Determine affected markets
    const affectedMarkets = [];
    if (lowerText.includes('stock') || lowerText.includes('equity')) affectedMarkets.push('stocks');
    if (lowerText.includes('forex') || lowerText.includes('currency')) affectedMarkets.push('forex');
    if (lowerText.includes('crypto') || lowerText.includes('bitcoin')) affectedMarkets.push('crypto');
    if (lowerText.includes('oil') || lowerText.includes('gold')) affectedMarkets.push('commodities');

    return {
      potential,
      affectedMarkets: affectedMarkets.length > 0 ? affectedMarkets : ['stocks'],
      volatilityScore
    };
  }

  /**
   * Save news to database
   */
  async saveNewsToDatabase(newsItems) {
    const savedItems = [];

    for (const item of newsItems) {
      try {
        // Check if news already exists
        const crypto = require('crypto');
        const urlHash = crypto.createHash('md5').update(item.url).digest('hex');

        const existing = await NewsEvent.findOne({ urlHash });
        if (existing) {
          continue; // Skip duplicates
        }

        // Analyze sentiment if not provided
        if (!item.sentiment) {
          item.sentiment = this.analyzeSentiment(item.title + ' ' + item.description);
          item.sentiment.analyzedAt = new Date();
        }

        // Assess market impact
        const marketImpact = this.assessMarketImpact(item);

        // Create news event
        const newsEvent = new NewsEvent({
          ...item,
          urlHash,
          marketImpact,
          processed: false,
          createdAt: new Date()
        });

        await newsEvent.save();
        savedItems.push(newsEvent);
      } catch (error) {
        console.error(`Error saving news item: ${error.message}`);
      }
    }

    return savedItems;
  }

  /**
   * Monitor news in real-time
   */
  async startMonitoring(interval = 5 * 60 * 1000) {
    console.log('Starting news monitoring...');

    const fetchAndStore = async () => {
      try {
        // Fetch from multiple sources
        const [topHeadlines, financialNews, marketNews] = await Promise.all([
          this.fetchLatestNews({ category: 'business' }),
          this.fetchFinancialNews('general'),
          this.fetchMarketNews('finance,technology')
        ]);

        const allNews = [...topHeadlines, ...financialNews, ...marketNews];
        const saved = await this.saveNewsToDatabase(allNews);

        console.log(`Fetched ${allNews.length} news items, saved ${saved.length} new items`);

        return saved;
      } catch (error) {
        console.error('Error in news monitoring:', error.message);
        return [];
      }
    };

    // Initial fetch
    await fetchAndStore();

    // Set up interval
    this.monitoringInterval = setInterval(fetchAndStore, interval);

    return this.monitoringInterval;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('News monitoring stopped');
    }
  }

  /**
   * Get unprocessed news events
   */
  async getUnprocessedNews(limit = 50) {
    return await NewsEvent.find({ processed: false })
      .sort({ publishedAt: -1 })
      .limit(limit);
  }

  /**
   * Mark news as processed
   */
  async markAsProcessed(newsEventId) {
    return await NewsEvent.findByIdAndUpdate(
      newsEventId,
      { processed: true, processedAt: new Date() },
      { new: true }
    );
  }
}

module.exports = new NewsService();
