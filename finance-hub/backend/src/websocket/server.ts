import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { getAllStocks, addNoise } from '../services/marketService'
import logger from '../utils/logger'

let io: SocketIOServer | null = null

export function getIO() { return io }

const subscriptions = new Map<string, Set<string>>() // tickerSymbol → socketIds

export function setupWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket: Socket) => {
    logger.debug(`WS client connected: ${socket.id}`)

    socket.on('subscribe', ({ tickers }: { tickers: string[] }) => {
      tickers.forEach((t) => {
        const sym = t.toUpperCase()
        if (!subscriptions.has(sym)) subscriptions.set(sym, new Set())
        subscriptions.get(sym)!.add(socket.id)
      })
      logger.debug(`${socket.id} subscribed to: ${tickers.join(', ')}`)
    })

    socket.on('unsubscribe', ({ tickers }: { tickers: string[] }) => {
      tickers.forEach((t) => subscriptions.get(t.toUpperCase())?.delete(socket.id))
    })

    socket.on('disconnect', () => {
      subscriptions.forEach((clients) => clients.delete(socket.id))
      logger.debug(`WS client disconnected: ${socket.id}`)
    })
  })

  // Broadcast price updates every 3 seconds for subscribed tickers
  setInterval(async () => {
    if (!io || subscriptions.size === 0) return
    try {
      const stocks = await getAllStocks()
      const priceMap: Record<string, number> = {}
      stocks.forEach((s) => { priceMap[s.symbol] = s.price })

      subscriptions.forEach((clients, ticker) => {
        if (!clients.size) return
        const base = priceMap[ticker]
        if (!base) return
        const price = addNoise(base, 0.004)
        const change = +(price - base).toFixed(2)
        const changePct = +((change / base) * 100).toFixed(3)
        const update = {
          ticker,
          price,
          change,
          changePct,
          volume: Math.floor(1e6 + Math.random() * 50e6),
          timestamp: new Date().toISOString(),
        }
        clients.forEach((socketId) => io!.to(socketId).emit('price_update', update))
      })
    } catch (err) {
      logger.error(`WS broadcast error: ${(err as Error).message}`)
    }
  }, 3000)

  logger.info('WebSocket server initialized')
  return io
}
