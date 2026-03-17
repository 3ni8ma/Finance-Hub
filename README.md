# Finance Hub

A full-stack financial intelligence platform for monitoring live markets, comparing stocks, predicting prices with AI, exploring trading strategies, and tracking a personal portfolio.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [WebSocket Events](#websocket-events)
- [ML Service](#ml-service)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | Global indices bar, top movers tables, live news feed with sentiment badges |
| **Market Monitor** | Real-time ticker cards with WebSocket price flashing, sector/exchange filters |
| **Stock Comparator** | Side-by-side fundamentals table, normalized performance chart, correlation heatmap |
| **Price Predictor** | AI-powered Prophet/LSTM forecasts with confidence intervals, Redis-cached results |
| **Trading Strategies** | Strategy library with backtest runner, Sharpe ratio, drawdown, and win-rate metrics |
| **Portfolio Tracker** | Holdings table, allocation pie chart, performance timeline, price alert cron jobs |

---

## Tech Stack

### Frontend
- **React** (Vite) + **TypeScript**
- **Tailwind CSS** — utility-first styling
- **Recharts** — all charts (`ComposedChart`, `ResponsiveContainer`)
- **React Query** — data fetching and cache management
- **Zustand** — modular client state

### Backend
- **Node.js** + **Express**
- **Socket.io** — WebSocket server for real-time price feeds
- **Prisma** — ORM with PostgreSQL
- **express-rate-limit** — protects free-tier API quotas

### Infrastructure
- **PostgreSQL** — user data, portfolios, strategies, alerts
- **Redis** — price caching (30s TTL) and prediction caching (24h TTL)
- **Docker Compose** — orchestrates all services

### ML Service
- **Python** + **FastAPI**
- **Prophet** (or LSTM via Keras) — price forecasting
- **yfinance** — OHLCV data ingestion
- Runs as an isolated internal microservice (never publicly exposed)

### External APIs
- [Polygon.io](https://polygon.io) — live WebSocket price feed
- [Alpha Vantage](https://www.alphavantage.co) — fallback market data
- [Yahoo Finance](https://finance.yahoo.com) — historical OHLCV via `yfinance`
- [NewsAPI](https://newsapi.org) — financial headlines

---

## Project Structure

```
finance-hub/
├── frontend/
│   └── src/
│       ├── components/        # Shared UI: Button, Card, Badge, Chart, Loader
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── MarketMonitor.tsx
│       │   ├── StockComparator.tsx
│       │   ├── PricePredictor.tsx
│       │   ├── TradingStrategies.tsx
│       │   └── Portfolio.tsx
│       ├── hooks/             # useStockData, useWebSocket, usePortfolio
│       ├── store/             # Zustand slices per module
│       └── utils/             # formatCurrency, calcReturns, sentimentClassifier
│
├── backend/
│   ├── routes/                # /api/stocks, /api/predict, /api/portfolio, /api/strategies
│   ├── services/              # marketService, predictionService, portfolioService
│   ├── websocket/             # Socket.io server + price broadcast logic
│   ├── middleware/            # auth, rateLimit, errorHandler
│   ├── models/                # Prisma schema models
│   └── strategies/            # rsi.ts, macd.ts, bollingerBands.ts, etc.
│
├── ml-service/
│   ├── models/                # Serialized model files (.pkl / .joblib)
│   ├── train.py               # Training script per ticker
│   ├── predict.py             # Inference logic
│   └── main.py                # FastAPI entry point (/predict, /train)
│
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker + Docker Compose
- API keys for Polygon.io, Alpha Vantage, NewsAPI

### 1. Clone the repository

```bash
git clone https://github.com/your-org/finance-hub.git
cd finance-hub
```

### 2. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) for a full list.

### 3. Start all services

```bash
docker-compose up --build
```

This starts: `frontend` (port 5173), `backend` (port 4000), `ml-service` (port 8000, internal only), `postgres` (port 5432), `redis` (port 6379).

### 4. Run database migrations

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 5. Open the app

Navigate to [http://localhost:5173](http://localhost:5173).

---

## Environment Variables

Create a `.env` file in the project root. **Never commit this file.**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/financehub
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# External APIs
POLYGON_API_KEY=your_polygon_key
ALPHA_VANTAGE_API_KEY=your_alphavantage_key
NEWS_API_KEY=your_newsapi_key

# ML Service (internal Docker network)
ML_SERVICE_URL=http://ml-service:8000
```

---

## API Reference

### Stocks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stocks/quote?symbols=AAPL,TSLA` | Batch quote data |
| `GET` | `/api/stocks/history?symbol=AAPL&range=1Y` | OHLCV time series |
| `GET` | `/api/stocks/search?q=apple` | Search by name or symbol |
| `GET` | `/api/market/movers` | Top gainers and losers |
| `GET` | `/api/news?limit=20` | Headlines with sentiment badges |

### Predictions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/predict` | Trigger a price prediction `{ ticker, horizon }` |
| `GET` | `/api/predict/status?ticker=AAPL` | Poll training job status |

### Strategies

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/strategies` | List all strategies |
| `POST` | `/api/strategies/backtest` | Run a backtest `{ ticker, range, strategy, params }` |

### Portfolio

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/portfolio` | User's holdings |
| `POST` | `/api/portfolio/holding` | Add a holding |
| `DELETE` | `/api/portfolio/holding/:id` | Remove a holding |

### Alerts

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/alerts` | Create a price alert |
| `GET` | `/api/alerts` | List user's alerts |
| `DELETE` | `/api/alerts/:id` | Delete an alert |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login, returns JWT + refresh token |
| `POST` | `/api/auth/refresh` | Exchange refresh token for new JWT |

---

## Database Schema

```sql
users               (id, email, password_hash, created_at)
holdings            (id, user_id, ticker, quantity, avg_buy_price, purchase_date)
portfolio_snapshots (id, user_id, total_value, recorded_at)
saved_strategies    (id, user_id, strategy_name, parameters JSON, created_at)
price_alerts        (id, user_id, ticker, condition, target_price, triggered, created_at)
```

Managed via **Prisma**. Run `npx prisma migrate dev` to apply changes and `npx prisma db seed` to seed sample strategies on first run.

---

## WebSocket Events

The backend runs a Socket.io server. Connect from the frontend at `ws://localhost:4000`.

```ts
// Subscribe to live price updates
socket.emit('subscribe', { tickers: ['AAPL', 'TSLA'] })

// Unsubscribe
socket.emit('unsubscribe', { tickers: ['AAPL'] })

// Receive live prices
socket.on('price_update', ({ ticker, price, change, changePct, volume, timestamp }) => { })

// Receive alert notifications
socket.on('alert_triggered', ({ alertId, ticker, price, message }) => { })
```

Price cards flash **green** on an uptick and **red** on a downtick using an 800ms CSS transition class toggled on the `price_update` event.

---

## ML Service

The ML microservice runs as a standalone FastAPI app on the internal Docker network. It is never publicly accessible.

### `POST /predict`

```json
{
  "ticker": "AAPL",
  "horizon": 30
}
```

Returns:
```json
{
  "predictions": [
    { "ds": "2025-04-01", "yhat": 194.5, "yhat_lower": 189.2, "yhat_upper": 199.8 }
  ],
  "confidence": 0.81
}
```

If no trained model exists for the ticker, the service triggers a background training job and returns `{ "status": "training" }`. The frontend polls `GET /api/predict/status?ticker=AAPL` every 10 seconds until the model is ready. Completed predictions are cached in Redis with a 24-hour TTL.

### `POST /train`

```json
{ "ticker": "AAPL" }
```

Fetches 5 years of OHLCV data via `yfinance`, fits a Prophet model, and saves it to `/models/AAPL.pkl`.

---

## Scripts

```bash
# Frontend
cd frontend
npm install
npm run dev          # Start dev server (port 5173)
npm run build        # Production build

# Backend
cd backend
npm install
npm run dev          # Start with nodemon (port 4000)
npx prisma migrate dev
npx prisma db seed

# ML Service
cd ml-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Docker (all services)
docker-compose up --build
docker-compose down
```

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feature/my-feature`
2. Keep strategy logic in separate files under `backend/strategies/` so each is independently testable
3. All external API calls must go through the backend — never expose keys to the frontend
4. Use React Query for all frontend data fetching; use `staleTime: 30_000` for market data and `staleTime: 86_400_000` for predictions
5. Run `npx prisma migrate dev` after any schema change before opening a PR
6. Open a pull request against `main` with a clear description of the change

---

## Disclaimer

> **For informational purposes only. Not financial advice.**
> Finance Hub and its AI-generated predictions do not constitute investment recommendations. Always consult a qualified financial advisor before making investment decisions.
