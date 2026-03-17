import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional
import asyncio

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis as redis_lib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Finance Hub ML Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Redis for caching + status tracking
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    r = redis_lib.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    logger.info("Redis connected")
except Exception as e:
    logger.warning(f"Redis unavailable: {e}. Running without cache.")
    r = None

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ── Request/Response Schemas ───────────────────────────────────────────────────

class PredictRequest(BaseModel):
    ticker: str
    horizon: int = 30  # days

class TrainRequest(BaseModel):
    ticker: str

class PredictionPoint(BaseModel):
    date: str
    predictedPrice: float
    lowerBound: float
    upperBound: float

class PredictResponse(BaseModel):
    status: str
    ticker: str
    horizon: int
    predictions: list[PredictionPoint]
    confidence: float
    trainedAt: str

# ── Helpers ────────────────────────────────────────────────────────────────────

def cache_key(ticker: str, horizon: int) -> str:
    return f"ml:prediction:{ticker.upper()}:{horizon}"

def status_key(ticker: str) -> str:
    return f"ml:status:{ticker.upper()}"

def model_path(ticker: str) -> str:
    return os.path.join(MODELS_DIR, f"{ticker.upper()}.pkl")

def set_status(ticker: str, status: str):
    if r:
        r.set(status_key(ticker), status, ex=3600)

def get_status(ticker: str) -> Optional[str]:
    if r:
        return r.get(status_key(ticker))
    return None

# ── Training ───────────────────────────────────────────────────────────────────

def train_model(ticker: str) -> bool:
    """Train a Prophet model for the given ticker. Returns True on success."""
    try:
        import yfinance as yf
        import pandas as pd
        import joblib
        from prophet import Prophet

        set_status(ticker, "training")
        logger.info(f"Training model for {ticker}...")

        stock = yf.Ticker(ticker)
        hist = stock.history(period="5y")
        if hist.empty or len(hist) < 100:
            logger.error(f"Insufficient data for {ticker}")
            set_status(ticker, "error")
            return False

        df = hist[["Close"]].copy()
        df.index = pd.to_datetime(df.index).tz_localize(None)
        df = df.reset_index()
        df.columns = ["ds", "y"]

        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=True,
            changepoint_prior_scale=0.05,
        )
        model.fit(df)
        joblib.dump({"model": model, "trained_at": datetime.utcnow().isoformat(), "last_price": float(df["y"].iloc[-1])}, model_path(ticker))
        set_status(ticker, "ready")
        logger.info(f"Model trained and saved for {ticker}")
        return True
    except Exception as e:
        logger.error(f"Training failed for {ticker}: {e}")
        set_status(ticker, "error")
        return False

def predict_with_prophet(ticker: str, horizon: int) -> dict:
    """Run inference with a trained Prophet model."""
    import pandas as pd
    import joblib

    saved = joblib.load(model_path(ticker))
    model = saved["model"]
    trained_at = saved.get("trained_at", datetime.utcnow().isoformat())
    last_price = saved.get("last_price", 150.0)

    # Historical fitted values (last 60 days)
    future_hist = model.make_future_dataframe(periods=0)
    forecast_hist = model.predict(future_hist)
    hist_points = forecast_hist.tail(60)[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()

    # Future predictions
    future = model.make_future_dataframe(periods=horizon)
    forecast = model.predict(future)
    future_points = forecast.tail(horizon)[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()

    predictions = []
    for _, row in hist_points.iterrows():
        predictions.append(PredictionPoint(
            date=row["ds"].strftime("%Y-%m-%d"),
            predictedPrice=round(float(row["yhat"]), 2),
            lowerBound=round(float(row["yhat_lower"]), 2),
            upperBound=round(float(row["yhat_upper"]), 2),
        ))
    for _, row in future_points.iterrows():
        predictions.append(PredictionPoint(
            date=row["ds"].strftime("%Y-%m-%d"),
            predictedPrice=round(float(row["yhat"]), 2),
            lowerBound=round(float(row["yhat_lower"]), 2),
            upperBound=round(float(row["yhat_upper"]), 2),
        ))

    # Confidence: based on prediction interval width relative to price
    avg_price = abs(float(forecast_hist["yhat"].mean()))
    avg_width = float((forecast["yhat_upper"] - forecast["yhat_lower"]).mean())
    confidence = max(0.3, min(0.95, 1.0 - (avg_width / avg_price) / 2)) if avg_price > 0 else 0.6

    return {
        "status": "ready",
        "ticker": ticker,
        "horizon": horizon,
        "predictions": [p.dict() for p in predictions],
        "confidence": round(confidence, 2),
        "trainedAt": trained_at,
    }

# ── Mock prediction (when yfinance / prophet not available) ────────────────────

def mock_prediction(ticker: str, horizon: int) -> dict:
    """Generate a plausible mock prediction without real data."""
    import random, math
    BASE = {"AAPL": 213, "MSFT": 388, "GOOGL": 168, "NVDA": 117, "TSLA": 239, "META": 591, "AMZN": 196}
    base = BASE.get(ticker, 150)
    predictions = []
    price = base * (1 - random.uniform(0.05, 0.20))
    now = datetime.utcnow()

    # Historical 60 days
    for i in range(60, 0, -1):
        d = now - timedelta(days=i)
        if d.weekday() >= 5:
            continue
        price *= 1 + random.gauss(0.0005, 0.012)
        predictions.append({"date": d.strftime("%Y-%m-%d"), "predictedPrice": round(price, 2),
                             "lowerBound": round(price * 0.97, 2), "upperBound": round(price * 1.03, 2)})

    # Future
    drift = random.uniform(-0.001, 0.003)
    for i in range(1, horizon + 1):
        d = now + timedelta(days=i)
        if d.weekday() >= 5:
            continue
        price *= 1 + drift + random.gauss(0, 0.015)
        uncertainty = 1 + (i / horizon) * 0.10
        predictions.append({"date": d.strftime("%Y-%m-%d"), "predictedPrice": round(price, 2),
                             "lowerBound": round(price / uncertainty, 2), "upperBound": round(price * uncertainty, 2)})

    return {
        "status": "ready", "ticker": ticker, "horizon": horizon,
        "predictions": predictions,
        "confidence": round(random.uniform(0.55, 0.82), 2),
        "trainedAt": datetime.utcnow().isoformat(),
    }

# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "ts": datetime.utcnow().isoformat()}

@app.post("/predict")
async def predict(req: PredictRequest, background_tasks: BackgroundTasks):
    ticker = req.ticker.upper()
    horizon = max(7, min(180, req.horizon))

    # Check Redis cache
    ck = cache_key(ticker, horizon)
    if r:
        cached = r.get(ck)
        if cached:
            logger.info(f"Cache hit: {ticker} h={horizon}")
            return json.loads(cached)

    # Try to use existing model
    mp = model_path(ticker)
    if os.path.exists(mp):
        try:
            result = predict_with_prophet(ticker, horizon)
            if r:
                r.set(ck, json.dumps(result), ex=86400)
            return result
        except Exception as e:
            logger.warning(f"Inference failed for {ticker}: {e}")

    # Check training status
    status = get_status(ticker)
    if status == "training":
        return {"status": "training", "ticker": ticker, "message": "Model training in progress"}

    # Try to train in background (if yfinance available)
    try:
        import yfinance  # noqa: F401
        set_status(ticker, "training")
        background_tasks.add_task(train_and_cache, ticker, horizon)
        return {"status": "training", "ticker": ticker, "message": "Training started"}
    except ImportError:
        pass

    # Fall back to mock
    result = mock_prediction(ticker, horizon)
    if r:
        r.set(ck, json.dumps(result), ex=3600)
    return result

async def train_and_cache(ticker: str, horizon: int):
    """Background task: train model then cache prediction."""
    loop = asyncio.get_event_loop()
    success = await loop.run_in_executor(None, train_model, ticker)
    if success:
        try:
            result = predict_with_prophet(ticker, horizon)
            ck = cache_key(ticker, horizon)
            if r:
                r.set(ck, json.dumps(result), ex=86400)
        except Exception as e:
            logger.error(f"Post-train predict failed: {e}")

@app.post("/train")
async def train(req: TrainRequest, background_tasks: BackgroundTasks):
    ticker = req.ticker.upper()
    status = get_status(ticker)
    if status == "training":
        return {"status": "training", "ticker": ticker, "message": "Already training"}
    background_tasks.add_task(lambda: train_model(ticker))
    return {"status": "training", "ticker": ticker, "message": "Training started"}

@app.get("/status")
def status(ticker: str, horizon: int = 30):
    ticker = ticker.upper()
    ck = cache_key(ticker, horizon)
    if r:
        cached = r.get(ck)
        if cached:
            return json.loads(cached)
    st = get_status(ticker) or "idle"
    return {"status": st, "ticker": ticker}
