import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { PriceUpdate, AlertTriggered } from '../types'
import { usePortfolioStore } from '../store/portfolioStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001'

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

interface UseWebSocketOptions {
  tickers?: string[]
  onPriceUpdate?: (update: PriceUpdate) => void
}

export function useWebSocket({ tickers = [], onPriceUpdate }: UseWebSocketOptions) {
  const addNotification = usePortfolioStore((s) => s.addNotification)
  const prevTickers = useRef<string[]>([])
  const sock = getSocket()

  useEffect(() => {
    if (!sock.connected) sock.connect()

    sock.on('alert_triggered', (data: AlertTriggered) => {
      addNotification({ id: data.alertId, message: data.message, ticker: data.ticker })
    })

    return () => {
      sock.off('alert_triggered')
    }
  }, [addNotification, sock])

  useEffect(() => {
    if (onPriceUpdate) {
      sock.on('price_update', onPriceUpdate)
      return () => {
        sock.off('price_update', onPriceUpdate)
      }
    }
  }, [onPriceUpdate, sock])

  useEffect(() => {
    const prev = prevTickers.current
    const toUnsubscribe = prev.filter((t) => !tickers.includes(t))
    const toSubscribe = tickers.filter((t) => !prev.includes(t))

    if (toUnsubscribe.length > 0) {
      sock.emit('unsubscribe', { tickers: toUnsubscribe })
    }
    if (toSubscribe.length > 0) {
      sock.emit('subscribe', { tickers: toSubscribe })
    }
    prevTickers.current = tickers

    return () => {
      if (tickers.length > 0) {
        sock.emit('unsubscribe', { tickers })
      }
    }
  }, [tickers.join(','), sock])

  const subscribe = useCallback((t: string[]) => {
    sock.emit('subscribe', { tickers: t })
  }, [sock])

  const unsubscribe = useCallback((t: string[]) => {
    sock.emit('unsubscribe', { tickers: t })
  }, [sock])

  return { subscribe, unsubscribe }
}
