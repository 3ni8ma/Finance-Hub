import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'
import type { StockQuote, OHLCV, NewsItem, MarketIndex } from '../types'

export function useStockQuotes(symbols: string[]) {
  return useQuery<StockQuote[]>({
    queryKey: ['quotes', symbols.sort().join(',')],
    queryFn: async () => {
      if (!symbols.length) return []
      const { data } = await api.get('/stocks/quote', {
        params: { symbols: symbols.join(',') },
      })
      return data
    },
    staleTime: 30_000,
    enabled: symbols.length > 0,
    refetchInterval: 60_000,
  })
}

export function useStockHistory(symbol: string, range: string) {
  return useQuery<OHLCV[]>({
    queryKey: ['history', symbol, range],
    queryFn: async () => {
      const { data } = await api.get('/stocks/history', {
        params: { symbol, range },
      })
      return data
    },
    staleTime: 300_000,
    enabled: !!symbol,
  })
}

export function useStockSearch(query: string) {
  return useQuery<StockQuote[]>({
    queryKey: ['search', query],
    queryFn: async () => {
      const { data } = await api.get('/stocks/search', { params: { q: query } })
      return data
    },
    staleTime: 60_000,
    enabled: query.length >= 2,
  })
}

export function useMarketMovers() {
  return useQuery<{ gainers: StockQuote[]; losers: StockQuote[] }>({
    queryKey: ['market', 'movers'],
    queryFn: async () => {
      const { data } = await api.get('/market/movers')
      return data
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

export function useMarketIndices() {
  return useQuery<MarketIndex[]>({
    queryKey: ['market', 'indices'],
    queryFn: async () => {
      const { data } = await api.get('/market/indices')
      return data
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useNews(limit = 20) {
  return useQuery<NewsItem[]>({
    queryKey: ['news', limit],
    queryFn: async () => {
      const { data } = await api.get('/news', { params: { limit } })
      return data
    },
    staleTime: 120_000,
    refetchInterval: 300_000,
  })
}

export function useAddToWatchlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ticker: string) =>
      api.post('/portfolio/watchlist', { ticker }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}
