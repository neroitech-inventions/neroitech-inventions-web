# Bitcoin 24-Hour Market Prediction & Sentiment Analysis Tool

A client-side web application that combines the Crypto Fear & Greed Index with Bitcoin price data and technical indicators to produce a transparent, rule-based 24-hour directional bias (LONG / SHORT / WAIT).

**Disclaimer**: This is an educational analysis tool, not financial advice. Predictions are rule-based estimates derived from current market data. They are **not** statistically calibrated probabilities from a trained machine-learning model. Past performance of any signal does not guarantee future results. Crypto markets are highly volatile; never trade with money you cannot afford to lose.

## Features

- Live BTC price, 24h change, and volume (CoinGecko primary, Binance fallback)
- Fear & Greed Index gauge with 7-day history and trend
- Combined price + sentiment chart (7 days)
- Daily sentiment vs price table and confirmation/divergence analysis
- Technical indicators calculated client-side: RSI(14), MACD, EMA20/EMA50, support/resistance estimates, volatility
- Rule-based 24-hour prediction engine that **always** outputs either LONG BIAS or SHORT BIAS (higher score wins; no WAIT state)
- Trading signal with configurable conviction threshold
- Bullish and bearish factor lists
- LocalStorage history of previous forecasts
- Dark theme, responsive layout
- Automatic refresh every 5 minutes

## Prediction Methodology (Rule-Based Baseline)

The engine assigns additive scores to bullish and bearish evidence:

- Fear & Greed level (contrarian at extremes) and 7-day change
- Short-term momentum (1h / 4h / 24h / 7d price changes)
- RSI overbought/oversold zones
- MACD histogram and line position
- Price relative to EMA20 and EMA20 vs EMA50 alignment
- Volume confirmation of the price move

Net score is converted into approximate probabilities. The signal is forced to **LONG BIAS** or **SHORT BIAS** based on which side has the higher score (no WAIT state). Sideways probability is still shown for context.

**Limitations**:
- Seven days of data is used only for recent context, not model training.
- No machine-learning model is included (would require a longer historical dataset, proper chronological splits, and calibration).
- Indicators can and do disagree; the UI surfaces both sides.
- Support/resistance are simple local extrema estimates, not institutional levels.
- No funding rates, open interest, or liquidation data in this version.
- All calculations run in the browser; no server-side secrets.

## Data Sources

- Fear & Greed: `https://api.alternative.me/fng/?limit=8` (public, no key)
- Prices: CoinGecko `/coins/bitcoin/market_chart` (hourly) with Binance `/api/v3/klines` fallback
- Timestamps are UTC

## Running Locally

1. Clone or download the `btc-prediction-tool` folder.
2. Serve the files with any static server (CORS is required for API calls):

   ```bash
   # Python
   cd btc-prediction-tool
   python -m http.server 8000
   ```

   Or use VS Code Live Server, npx serve, etc.

3. Open `http://localhost:8000` in a browser.

No dependencies to install beyond a modern browser. Chart.js is loaded from CDN.

## Project Structure

```
btc-prediction-tool/
├── index.html          # Dashboard layout
├── styles.css          # Dark theme styles
├── app.js              # Data fetching, indicators, prediction logic, chart
└── README.md
```

## Future Improvements (Not Implemented)

- Backend (FastAPI) with SQLite for persistent forecast tracking and true out-of-sample backtesting
- Longer historical dataset for proper ML model (e.g. logistic regression or gradient boosting on features vs next-24h return)
- Calibration metrics (Brier score) and comparison to a naive baseline
- Optional funding rate / open interest signals
- More sophisticated support/resistance or volume profile

## Error Handling

If an API fails, the UI displays an error message and attempts the fallback source where possible. Stale or missing data is not fabricated.

---

Built as a practical analysis tool for evaluating current market conditions and assessing whether a directional edge exists for the next 24 hours.
