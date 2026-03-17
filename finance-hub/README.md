# 📈 Finance Hub

A full-stack financial dashboard with live markets, stock comparison, AI price predictions, trading strategies, and portfolio tracking.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + Recharts |
| Backend | Node.js + Express + Socket.io + TypeScript |
| Database | PostgreSQL + Prisma ORM + Redis |
| ML Service | Python 3.11 + FastAPI + Prophet |
| Auth | JWT (access + refresh tokens) |
| Infra | Docker Compose |

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.11+ (for local ML dev)

### 1. Environment Variables

```bash
# Copy and fill in your API keys
cp backend/.env.example backend/.env
cp ml-service/.env.example ml-service/.env
```

Required keys:
- `ALPHA_VANTAGE_API_KEY` — https://www.alphavantage.co/support/#api-key
- `POLYGON_API_KEY` — https://polygon.io/
- `NEWS_API_KEY` — https://newsapi.org/

### 2. Start Everything

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| ML Service | http://localhost:8000 (internal only) |
| API Docs (ML) | http://localhost:8000/docs |

### 3. Run Migrations

```bash
docker-compose exec backend npx prisma migrate dev --name init
docker-compose exec backend npx prisma db seed
```

## Module Overview

1. **Dashboard** — Market indices, top movers, live news feed
2. **Market Monitor** — Real-time ticker cards with WebSocket updates
3. **Stock Comparator** — Side-by-side metrics + correlation heatmap
4. **Price Predictor** — Prophet ML forecasts with confidence bounds
5. **Trading Strategies** — Backtestable strategy library (RSI, MACD, etc.)
6. **Portfolio Tracker** — Holdings, P&L, allocation charts, price alerts

## Development

### Frontend only
```bash
cd frontend && npm install && npm run dev
```

### Backend only
```bash
cd backend && npm install && npm run dev
```

### ML Service only
```bash
cd ml-service && pip install -r requirements.txt && uvicorn main:app --reload
```

## Project Structure

```
finance-hub/
├── frontend/          # React + Vite app
├── backend/           # Express + Socket.io API
├── ml-service/        # FastAPI prediction service
└── docker-compose.yml
```

---

> ⚠️ **Disclaimer**: This application is for informational and educational purposes only. It is not financial advice.
