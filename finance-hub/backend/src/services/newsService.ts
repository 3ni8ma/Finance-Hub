import { cacheGet, cacheSet } from '../utils/redis'
import { v4 as uuid } from 'crypto'

const POSITIVE_WORDS = ['surge', 'soar', 'rally', 'gain', 'profit', 'beat', 'record', 'growth', 'rise', 'jump', 'strong', 'exceed', 'boost', 'upgrade', 'bull']
const NEGATIVE_WORDS = ['drop', 'fall', 'plunge', 'loss', 'miss', 'cut', 'decline', 'crash', 'warn', 'weak', 'debt', 'layoff', 'downgrade', 'bear', 'slump']

function analyzeSentiment(text: string): { sentiment: 'Positive' | 'Neutral' | 'Negative'; score: number } {
  const lower = text.toLowerCase()
  let score = 0
  POSITIVE_WORDS.forEach((w) => { if (lower.includes(w)) score++ })
  NEGATIVE_WORDS.forEach((w) => { if (lower.includes(w)) score-- })
  const normalized = Math.max(-1, Math.min(1, score / 3))
  return {
    sentiment: score > 0 ? 'Positive' : score < 0 ? 'Negative' : 'Neutral',
    score: normalized,
  }
}

const MOCK_HEADLINES = [
  { title: 'NVIDIA Reports Record Revenue Driven by AI Chip Demand', source: 'Reuters', url: 'https://www.reuters.com/technology/nvidia/', hours: 1 },
  { title: 'Federal Reserve Holds Interest Rates Steady, Signals Future Cuts', source: 'Bloomberg', url: 'https://www.bloomberg.com/economics', hours: 2 },
  { title: 'Apple Unveils New MacBook Pro with M4 Chip to Strong Reviews', source: 'TechCrunch', url: 'https://techcrunch.com/tag/apple/', hours: 3 },
  { title: 'Tesla Misses Q4 Delivery Estimates as EV Competition Intensifies', source: 'WSJ', url: 'https://www.wsj.com/business/autos/tesla', hours: 4 },
  { title: 'Microsoft Azure Growth Beats Expectations, Stock Surges 5%', source: 'CNBC', url: 'https://www.cnbc.com/microsoft/', hours: 5 },
  { title: 'Oil Prices Drop on Weak Demand Data from China', source: 'Financial Times', url: 'https://www.ft.com/commodities', hours: 6 },
  { title: 'Amazon Reports Record Holiday Sales, AWS Revenue Jumps', source: 'Reuters', url: 'https://www.reuters.com/business/retail-consumer/amazon/', hours: 7 },
  { title: 'JPMorgan Warns of Credit Quality Decline in Consumer Loans', source: 'Bloomberg', url: 'https://www.bloomberg.com/news/articles/jpmorgan', hours: 8 },
  { title: 'Alphabet Beats Earnings Estimates as YouTube Advertising Rebounds', source: 'CNBC', url: 'https://www.cnbc.com/alphabet/', hours: 9 },
  { title: 'Boeing Faces New Safety Scrutiny After Whistleblower Report', source: 'WSJ', url: 'https://www.wsj.com/business/airlines/boeing', hours: 10 },
  { title: 'Walmart Raises Full-Year Guidance on Strong Consumer Spending', source: 'Reuters', url: 'https://www.reuters.com/business/retail-consumer/walmart/', hours: 11 },
  { title: 'Semiconductor Stocks Rally on Strong TSMC Production Forecast', source: 'Bloomberg', url: 'https://www.bloomberg.com/technology', hours: 12 },
  { title: 'Meta Platforms Announces $50B Share Buyback Program', source: 'Financial Times', url: 'https://www.ft.com/stream/7e37c19e-8fa3-4832-a8cf-6fc8b0c53671', hours: 13 },
  { title: 'US Inflation Cools More Than Expected, Markets Rally', source: 'CNBC', url: 'https://www.cnbc.com/economy/', hours: 14 },
  { title: 'PayPal Reports Revenue Miss, Shares Fall 8%', source: 'Reuters', url: 'https://www.reuters.com/business/finance/', hours: 15 },
  { title: 'Berkshire Hathaway Increases Apple Stake to Record High', source: 'Bloomberg', url: 'https://www.bloomberg.com/quote/BRK/A:US', hours: 16 },
  { title: 'Consumer Confidence Index Drops to Six-Month Low', source: 'WSJ', url: 'https://www.wsj.com/economy/consumers/', hours: 17 },
  { title: 'Google DeepMind Achieves Breakthrough in Protein Structure Prediction', source: 'Nature', url: 'https://www.nature.com/subjects/machine-learning', hours: 18 },
  { title: 'Mortgage Rates Fall for Fourth Consecutive Week', source: 'CNBC', url: 'https://www.cnbc.com/real-estate/', hours: 19 },
  { title: 'Exxon Mobil Cuts Capital Spending Forecast Amid Oil Price Volatility', source: 'Financial Times', url: 'https://www.ft.com/stream/d5a3bd5a-6b35-4b2b-84cc-546d516a1bdb', hours: 20 },
]

export async function getNews(limit = 20) {
  const cacheKey = `news:${limit}`
  const cached = await cacheGet<unknown[]>(cacheKey)
  if (cached) return cached

  const NEWS_API_KEY = process.env.NEWS_API_KEY
  if (NEWS_API_KEY && NEWS_API_KEY !== 'your_newsapi_org_key_here') {
    try {
      const { default: axios } = await import('axios')
      const { data } = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: { category: 'business', language: 'en', pageSize: limit, apiKey: NEWS_API_KEY },
        timeout: 5000,
      })
      const articles = (data.articles ?? []).slice(0, limit).map((a: Record<string, string>) => {
        const { sentiment, score } = analyzeSentiment(a.title + ' ' + (a.description ?? ''))
        return {
          id: a.url,
          title: a.title,
          source: a.source?.name ?? 'Unknown',
          url: a.url,
          publishedAt: a.publishedAt,
          sentiment,
          sentimentScore: score,
          imageUrl: a.urlToImage,
        }
      })
      await cacheSet(cacheKey, articles, 120)
      return articles
    } catch {
      // fall through to mock
    }
  }

  // Mock fallback
  const now = Date.now()
  const articles = MOCK_HEADLINES.slice(0, limit).map((h) => {
    const { sentiment, score } = analyzeSentiment(h.title)
    return {
      id: `mock-${h.title.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`,
      title: h.title,
      source: h.source,
      url: h.url,
      publishedAt: new Date(now - h.hours * 3600_000).toISOString(),
      sentiment,
      sentimentScore: score,
    }
  })
  await cacheSet(cacheKey, articles, 120)
  return articles
}
