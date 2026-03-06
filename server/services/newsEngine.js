const axios = require('axios');

// Sentiment word lists for scoring
const BULLISH_WORDS = [
  'surge', 'soar', 'rally', 'jump', 'gain', 'rise', 'climb', 'boost',
  'record', 'high', 'profit', 'growth', 'beat', 'exceed', 'upgrade',
  'bullish', 'optimistic', 'strong', 'positive', 'breakthrough',
  'innovation', 'partnership', 'acquisition', 'expansion', 'revenue',
  'earnings', 'outperform', 'buy', 'upside', 'momentum', 'recovery',
  'approval', 'launch', 'success', 'milestone', 'deal', 'contract',
  'demand', 'adoption', 'invest', 'funding', 'ipo', 'dividend',
  'upgrade', 'overweight', 'accumulate', 'moon', 'pump', 'breakout'
];

const BEARISH_WORDS = [
  'crash', 'plunge', 'drop', 'fall', 'decline', 'loss', 'sink', 'tumble',
  'low', 'miss', 'downgrade', 'bearish', 'pessimistic', 'weak', 'negative',
  'lawsuit', 'investigation', 'fraud', 'scandal', 'bankruptcy', 'layoff',
  'recall', 'warning', 'risk', 'debt', 'default', 'sell', 'downside',
  'recession', 'inflation', 'tariff', 'sanction', 'ban', 'restriction',
  'fine', 'penalty', 'hack', 'breach', 'failure', 'delay', 'cut',
  'underperform', 'underweight', 'dump', 'bubble', 'overvalued', 'concern'
];

// Symbol-keyword mapping for detecting relevant assets
const SYMBOL_KEYWORDS = {
  'AAPL': ['apple', 'iphone', 'ipad', 'mac', 'tim cook', 'app store', 'ios'],
  'TSLA': ['tesla', 'elon musk', 'ev', 'electric vehicle', 'cybertruck', 'model 3', 'model y'],
  'NVDA': ['nvidia', 'gpu', 'ai chip', 'cuda', 'jensen huang', 'geforce', 'data center'],
  'AMZN': ['amazon', 'aws', 'prime', 'bezos', 'alexa', 'whole foods'],
  'GOOGL': ['google', 'alphabet', 'youtube', 'android', 'chrome', 'gemini', 'waymo'],
  'META': ['meta', 'facebook', 'instagram', 'whatsapp', 'zuckerberg', 'metaverse', 'threads'],
  'MSFT': ['microsoft', 'windows', 'azure', 'xbox', 'linkedin', 'copilot', 'satya nadella'],
  'AMD': ['amd', 'advanced micro', 'ryzen', 'radeon', 'epyc', 'lisa su'],
  'BTC': ['bitcoin', 'btc', 'crypto', 'blockchain', 'halving', 'satoshi', 'digital gold'],
  'ETH': ['ethereum', 'eth', 'ether', 'vitalik', 'defi', 'smart contract', 'solidity'],
  'NFLX': ['netflix', 'streaming', 'subscriber'],
  'DIS': ['disney', 'disney+', 'marvel', 'pixar', 'star wars'],
  'JPM': ['jpmorgan', 'jp morgan', 'jamie dimon', 'chase'],
  'V': ['visa', 'payment', 'credit card'],
  'WMT': ['walmart', 'retail'],
  'XOM': ['exxon', 'oil', 'petroleum', 'crude'],
  'COIN': ['coinbase', 'crypto exchange'],
  'SQ': ['square', 'block inc', 'cash app'],
  'PLTR': ['palantir', 'data analytics', 'government contract'],
  'RIVN': ['rivian', 'electric truck'],
};

class NewsEngine {
  constructor() {
    this.cachedNews = [];
    this.lastFetch = null;
    this.cacheDuration = 60000; // 1 minute cache
  }

  /**
   * Fetch news from multiple free sources
   */
  async fetchNews(categories = ['business', 'technology']) {
    // Return cache if fresh
    if (this.lastFetch && (Date.now() - this.lastFetch) < this.cacheDuration && this.cachedNews.length > 0) {
      return this.cachedNews;
    }

    const allArticles = [];

    // Try multiple free news sources
    try {
      const gnewsArticles = await this._fetchGNews(categories);
      allArticles.push(...gnewsArticles);
    } catch (err) {
      console.log('GNews fetch failed, using fallback:', err.message);
    }

    try {
      const newsDataArticles = await this._fetchNewsData(categories);
      allArticles.push(...newsDataArticles);
    } catch (err) {
      console.log('NewsData fetch failed:', err.message);
    }

    // If no external news, generate simulated market events
    if (allArticles.length === 0) {
      const simulated = this._generateSimulatedNews();
      allArticles.push(...simulated);
    }

    // Deduplicate by title similarity
    const unique = this._deduplicateArticles(allArticles);

    this.cachedNews = unique;
    this.lastFetch = Date.now();

    return unique;
  }

  /**
   * Fetch from GNews API (free tier: 100 req/day)
   */
  async _fetchGNews(categories) {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) return [];

    const articles = [];
    for (const cat of categories.slice(0, 2)) {
      try {
        const resp = await axios.get('https://gnews.io/api/v4/top-headlines', {
          params: {
            category: cat === 'finance' ? 'business' : cat,
            lang: 'en',
            max: 10,
            apikey: apiKey
          },
          timeout: 5000
        });
        if (resp.data && resp.data.articles) {
          articles.push(...resp.data.articles.map(a => ({
            title: a.title,
            description: a.description || '',
            source: a.source?.name || 'GNews',
            url: a.url,
            publishedAt: a.publishedAt,
            origin: 'gnews'
          })));
        }
      } catch (e) {
        // skip
      }
    }
    return articles;
  }

  /**
   * Fetch from NewsData.io (free tier: 200 req/day)
   */
  async _fetchNewsData(categories) {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) return [];

    try {
      const resp = await axios.get('https://newsdata.io/api/1/news', {
        params: {
          apikey: apiKey,
          language: 'en',
          category: categories.join(','),
          size: 10
        },
        timeout: 5000
      });
      if (resp.data && resp.data.results) {
        return resp.data.results.map(a => ({
          title: a.title,
          description: a.description || '',
          source: a.source_id || 'NewsData',
          url: a.link,
          publishedAt: a.pubDate,
          origin: 'newsdata'
        }));
      }
    } catch (e) {
      // skip
    }
    return [];
  }

  /**
   * Generate realistic simulated market news for demo/fallback
   */
  _generateSimulatedNews() {
    const templates = [
      { tpl: '{company} reports quarterly earnings beating analyst expectations by {pct}%', sentiment: 'bullish', symbols: [] },
      { tpl: '{company} announces major partnership with {partner}', sentiment: 'bullish', symbols: [] },
      { tpl: '{company} stock surges after product launch announcement', sentiment: 'very_bullish', symbols: [] },
      { tpl: 'Breaking: {company} faces regulatory investigation', sentiment: 'bearish', symbols: [] },
      { tpl: '{company} announces {num} layoffs amid restructuring', sentiment: 'bearish', symbols: [] },
      { tpl: 'Federal Reserve signals potential rate {direction} in upcoming meeting', sentiment: 'neutral', symbols: ['SPY'] },
      { tpl: 'Bitcoin {action} past ${price} as institutional adoption grows', sentiment: 'bullish', symbols: ['BTC'] },
      { tpl: '{company} CEO sells {amount} in company shares', sentiment: 'bearish', symbols: [] },
      { tpl: 'AI sector rally: {company} leads tech gains on strong demand', sentiment: 'very_bullish', symbols: [] },
      { tpl: '{company} receives FDA approval for new treatment', sentiment: 'very_bullish', symbols: [] },
      { tpl: 'Oil prices {direction} amid Middle East tensions', sentiment: 'neutral', symbols: ['XOM'] },
      { tpl: '{company} upgrades full-year revenue guidance', sentiment: 'bullish', symbols: [] },
      { tpl: 'Crypto market sees {amount} in liquidations overnight', sentiment: 'very_bearish', symbols: ['BTC', 'ETH'] },
      { tpl: '{company} secures ${amount}B government contract', sentiment: 'very_bullish', symbols: [] },
      { tpl: 'Analysts upgrade {company} to overweight, raise price target', sentiment: 'bullish', symbols: [] },
      { tpl: '{company} data breach exposes millions of user records', sentiment: 'very_bearish', symbols: [] },
      { tpl: 'Ethereum network upgrade successfully deployed', sentiment: 'bullish', symbols: ['ETH'] },
      { tpl: '{company} announces {pct}% dividend increase', sentiment: 'bullish', symbols: [] },
      { tpl: 'Trade tensions escalate: new tariffs on tech imports', sentiment: 'bearish', symbols: ['AAPL', 'NVDA'] },
      { tpl: '{company} unveils next-generation AI chip', sentiment: 'very_bullish', symbols: [] },
    ];

    const companies = [
      { name: 'Apple', symbol: 'AAPL' },
      { name: 'Tesla', symbol: 'TSLA' },
      { name: 'NVIDIA', symbol: 'NVDA' },
      { name: 'Amazon', symbol: 'AMZN' },
      { name: 'Google', symbol: 'GOOGL' },
      { name: 'Meta', symbol: 'META' },
      { name: 'Microsoft', symbol: 'MSFT' },
      { name: 'AMD', symbol: 'AMD' },
    ];

    const partners = ['Samsung', 'Oracle', 'Salesforce', 'IBM', 'Intel', 'Qualcomm'];
    const sources = ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'WSJ', 'Financial Times'];

    // Pick 3-6 random events
    const count = 3 + Math.floor(Math.random() * 4);
    const shuffled = templates.sort(() => Math.random() - 0.5).slice(0, count);
    const now = new Date();

    return shuffled.map((t, i) => {
      const company = companies[Math.floor(Math.random() * companies.length)];
      let title = t.tpl
        .replace('{company}', company.name)
        .replace('{partner}', partners[Math.floor(Math.random() * partners.length)])
        .replace('{pct}', (5 + Math.floor(Math.random() * 30)).toString())
        .replace('{num}', (500 + Math.floor(Math.random() * 5000)).toString())
        .replace('{direction}', Math.random() > 0.5 ? 'increase' : 'decrease')
        .replace('{action}', Math.random() > 0.5 ? 'surges' : 'rallies')
        .replace('{price}', (60000 + Math.floor(Math.random() * 40000)).toString())
        .replace('{amount}', (1 + Math.floor(Math.random() * 10)).toString());

      const symbols = t.symbols.length > 0 ? t.symbols : [company.symbol];

      return {
        title,
        description: title,
        source: sources[Math.floor(Math.random() * sources.length)],
        url: '#',
        publishedAt: new Date(now.getTime() - i * 300000).toISOString(), // stagger by 5 min
        origin: 'simulated',
        _symbols: symbols,
        _sentiment: t.sentiment
      };
    });
  }

  /**
   * Analyze sentiment of a news article
   */
  analyzeSentiment(article) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();

    let bullishScore = 0;
    let bearishScore = 0;

    BULLISH_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) bullishScore += matches.length;
    });

    BEARISH_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) bearishScore += matches.length;
    });

    const total = bullishScore + bearishScore;
    if (total === 0) {
      return { sentiment: 'neutral', score: 0.5, bullishScore: 0, bearishScore: 0 };
    }

    const normalizedScore = bullishScore / total; // 0 = very bearish, 1 = very bullish

    let sentiment;
    if (normalizedScore >= 0.8) sentiment = 'very_bullish';
    else if (normalizedScore >= 0.6) sentiment = 'bullish';
    else if (normalizedScore >= 0.4) sentiment = 'neutral';
    else if (normalizedScore >= 0.2) sentiment = 'bearish';
    else sentiment = 'very_bearish';

    // Use pre-tagged sentiment for simulated news
    if (article._sentiment) {
      sentiment = article._sentiment;
    }

    return { sentiment, score: normalizedScore, bullishScore, bearishScore };
  }

  /**
   * Detect which symbols are mentioned in an article
   */
  detectSymbols(article, watchlist = []) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    const detected = new Set();

    // Use pre-tagged symbols for simulated news
    if (article._symbols) {
      article._symbols.forEach(s => detected.add(s));
    }

    // Check keyword mapping
    for (const [symbol, keywords] of Object.entries(SYMBOL_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          detected.add(symbol);
        }
      }
    }

    // Check direct symbol mentions
    watchlist.forEach(symbol => {
      if (text.includes(symbol.toLowerCase()) || text.includes(`$${symbol.toLowerCase()}`)) {
        detected.add(symbol);
      }
    });

    return Array.from(detected);
  }

  /**
   * Process news and return tradeable signals
   */
  async processNews(watchlist = [], categories = ['business', 'technology'], minScore = 0.6) {
    const articles = await this.fetchNews(categories);
    const signals = [];

    for (const article of articles) {
      const sentiment = this.analyzeSentiment(article);
      const symbols = this.detectSymbols(article, watchlist);

      if (symbols.length === 0) continue;

      // Only generate signals for strong enough sentiment
      const strength = Math.abs(sentiment.score - 0.5) * 2; // 0-1 scale of strength
      if (strength < (minScore - 0.5) * 2 && sentiment.sentiment === 'neutral') continue;

      for (const symbol of symbols) {
        if (watchlist.length > 0 && !watchlist.includes(symbol)) continue;

        signals.push({
          symbol,
          article: {
            headline: article.title,
            source: article.source,
            url: article.url,
            publishedAt: article.publishedAt,
            origin: article.origin
          },
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          strength,
          side: sentiment.score >= 0.5 ? 'buy' : 'sell',
          timestamp: new Date()
        });
      }
    }

    // Sort by strength descending
    signals.sort((a, b) => b.strength - a.strength);

    return signals;
  }

  /**
   * Remove duplicate articles
   */
  _deduplicateArticles(articles) {
    const seen = new Set();
    return articles.filter(a => {
      const key = a.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

module.exports = new NewsEngine();
