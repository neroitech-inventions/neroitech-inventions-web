// BTC 24h Prediction Tool - Client-side rule-based analysis
// Data sources: Alternative.me F&G, CoinGecko prices (fallback Binance)

const SIDEWAYS_THRESHOLD = 0.8; // % absolute return for sideways
const SIGNAL_THRESHOLD = 15; // min score difference for directional signal

let priceSentimentChart = null;

async function fetchWithFallback(urls) {
    for (const url of urls) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn('Fetch failed:', url, e);
        }
    }
    throw new Error('All data sources failed');
}

function classifyFng(value) {
    if (value <= 24) return { label: 'Extreme Fear', color: '#c0392b' };
    if (value <= 44) return { label: 'Fear', color: '#e67e22' };
    if (value <= 55) return { label: 'Neutral', color: '#95a5a6' };
    if (value <= 74) return { label: 'Greed', color: '#27ae60' };
    return { label: 'Extreme Greed', color: '#1e8449' };
}

function formatPrice(p) {
    return '$' + p.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPct(p) {
    const sign = p >= 0 ? '+' : '';
    return sign + p.toFixed(2) + '%';
}

// Technical indicators
function calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
}

function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
    if (prices.length < slow + signal) return null;
    const emaFast = [];
    const emaSlow = [];
    let ef = prices.slice(0, fast).reduce((a, b) => a + b) / fast;
    let es = prices.slice(0, slow).reduce((a, b) => a + b) / slow;
    for (let i = 0; i < prices.length; i++) {
        if (i >= fast - 1) {
            if (i === fast - 1) emaFast.push(ef);
            else {
                ef = prices[i] * (2 / (fast + 1)) + ef * (1 - 2 / (fast + 1));
                emaFast.push(ef);
            }
        }
        if (i >= slow - 1) {
            if (i === slow - 1) emaSlow.push(es);
            else {
                es = prices[i] * (2 / (slow + 1)) + es * (1 - 2 / (slow + 1));
                emaSlow.push(es);
            }
        }
    }
    const macdLine = emaFast.slice(emaFast.length - emaSlow.length).map((v, i) => v - emaSlow[i]);
    if (macdLine.length < signal) return null;
    let sig = macdLine.slice(0, signal).reduce((a, b) => a + b) / signal;
    for (let i = signal; i < macdLine.length; i++) {
        sig = macdLine[i] * (2 / (signal + 1)) + sig * (1 - 2 / (signal + 1));
    }
    const histogram = macdLine[macdLine.length - 1] - sig;
    return { macd: macdLine[macdLine.length - 1], signal: sig, histogram };
}

function estimateSupportResistance(prices) {
    if (prices.length < 10) return { support: null, resistance: null };
    const recent = prices.slice(-48); // last ~2 days hourly if available
    const highs = [];
    const lows = [];
    for (let i = 2; i < recent.length - 2; i++) {
        if (recent[i] > recent[i-1] && recent[i] > recent[i-2] && recent[i] > recent[i+1] && recent[i] > recent[i+2]) highs.push(recent[i]);
        if (recent[i] < recent[i-1] && recent[i] < recent[i-2] && recent[i] < recent[i+1] && recent[i] < recent[i+2]) lows.push(recent[i]);
    }
    const resistance = highs.length ? Math.max(...highs) : Math.max(...recent);
    const support = lows.length ? Math.min(...lows) : Math.min(...recent);
    return { support, resistance };
}

async function loadData() {
    const lastUpdateEl = document.getElementById('lastUpdate');
    lastUpdateEl.innerHTML = '<span class="loader"></span><span>Loading market data</span>';
    lastUpdateEl.classList.remove('done');

    // Show skeletons
    document.getElementById('btcPrice').innerHTML = '<span class="skeleton" style="width:140px; height:2rem;"></span>';
    document.getElementById('btcChange').innerHTML = '<span class="skeleton" style="width:70px;"></span>';
    document.getElementById('volume').innerHTML = '<span class="skeleton" style="width:80px;"></span>';
    document.getElementById('fngValue').innerHTML = '<span class="skeleton" style="width:60px; height:2.5rem;"></span>';
    document.getElementById('fngLabel').innerHTML = '<span class="skeleton" style="width:90px;"></span>';
    document.getElementById('techIndicators').innerHTML = `
        <div class="skeleton skeleton-block"></div>
        <div class="skeleton skeleton-block"></div>
        <div class="skeleton skeleton-block"></div>
    `;
    document.getElementById('signal').innerHTML = '<span class="skeleton" style="width:160px; height:2rem;"></span>';

    try {
        // Fear & Greed
        const fngRes = await fetch('https://api.alternative.me/fng/?limit=8');
        const fngJson = await fngRes.json();
        const fngData = fngJson.data.map(d => ({
            value: parseInt(d.value),
            classification: d.value_classification,
            timestamp: parseInt(d.timestamp) * 1000,
            date: new Date(parseInt(d.timestamp) * 1000).toISOString().slice(0, 10)
        })).reverse(); // oldest first

        const currentFng = fngData[fngData.length - 1];
        const fngClass = classifyFng(currentFng.value);

        // Price data - CoinGecko preferred
        let prices = [];
        let volumes = [];
        let source = 'CoinGecko';
        try {
            const cgRes = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=hourly');
            const cgJson = await cgRes.json();
            prices = cgJson.prices.map(p => p[1]);
            volumes = cgJson.total_volumes.map(v => v[1]);
        } catch (e) {
            console.warn('CoinGecko failed, trying Binance');
            source = 'Binance';
            const binRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=168');
            const binJson = await binRes.json();
            prices = binJson.map(k => parseFloat(k[4])); // close
            volumes = binJson.map(k => parseFloat(k[5]));
        }

        const currentPrice = prices[prices.length - 1];
        const price24hAgo = prices[Math.max(0, prices.length - 25)];
        const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

        // Update UI
        document.getElementById('btcPrice').textContent = formatPrice(currentPrice);
        const changeEl = document.getElementById('btcChange');
        changeEl.textContent = formatPct(change24h);
        changeEl.className = 'change ' + (change24h >= 0 ? 'positive' : 'negative');
        document.getElementById('volume').textContent = '$' + (volumes[volumes.length - 1] / 1e9).toFixed(2) + 'B';
        document.getElementById('priceSource').textContent = source + ' (UTC)';

        // F&G gauge
        document.getElementById('fngValue').textContent = currentFng.value;
        document.getElementById('fngLabel').textContent = fngClass.label;
        const gauge = document.getElementById('fngGauge');
        gauge.style.borderColor = fngClass.color;
        document.getElementById('fngValue').style.color = fngClass.color;

        const fngChange = currentFng.value - fngData[fngData.length - 2].value;
        document.getElementById('fngTrend').textContent = `7d trend: ${fngChange >= 0 ? '+' : ''}${fngChange} points`;

        // Daily table and analysis
        updateDailyAnalysis(fngData, prices);

        // Technicals
        const closes = prices;
        const rsi = calculateRSI(closes);
        const macd = calculateMACD(closes);
        const ema20 = calculateEMA(closes, 20);
        const ema50 = calculateEMA(closes, 50);
        const { support, resistance } = estimateSupportResistance(closes);

        const techHtml = `
            <div>RSI (14): ${rsi ? rsi.toFixed(1) : 'N/A'} ${rsi > 70 ? '(Overbought)' : rsi < 30 ? '(Oversold)' : ''}</div>
            <div>MACD: ${macd ? macd.macd.toFixed(2) : 'N/A'} | Signal: ${macd ? macd.signal.toFixed(2) : 'N/A'} | Hist: ${macd ? macd.histogram.toFixed(2) : 'N/A'}</div>
            <div>EMA20: ${ema20 ? formatPrice(ema20) : 'N/A'} | EMA50: ${ema50 ? formatPrice(ema50) : 'N/A'}</div>
            <div>Price vs EMA20: ${ema20 ? ((currentPrice - ema20) / ema20 * 100).toFixed(2) + '%' : 'N/A'}</div>
            <div>Support: ${support ? formatPrice(support) : 'N/A'} | Resistance: ${resistance ? formatPrice(resistance) : 'N/A'}</div>
            <div>Volatility (24h range approx): ~${((Math.max(...closes.slice(-24)) - Math.min(...closes.slice(-24))) / currentPrice * 100).toFixed(2)}%</div>
        `;
        document.getElementById('techIndicators').innerHTML = techHtml;

        // Prediction
        const prediction = generatePrediction(currentFng, fngData, closes, rsi, macd, ema20, ema50, volumes);
        updatePredictionUI(prediction, support, resistance);

        // Chart
        updateChart(fngData, closes);

        window.lastPrices = closes;

        updateBtcPriceChart(closes);

        // Save forecast
        saveForecast(prediction, currentPrice);

lastUpdateEl.classList.add('done');
lastUpdateEl.innerHTML = 'Last updated: ' + new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

} catch (err) {
    console.error(err);
    lastUpdateEl.classList.add('done');
    lastUpdateEl.textContent = 'Error loading data. Try refreshing.';
}
}

function updateDailyAnalysis(fngData, prices) {
    // Approximate daily closes from hourly data
    const dailyCloses = [];
    for (let i = 0; i < 7 && i < fngData.length; i++) {
        const idx = Math.min(prices.length - 1, Math.floor((prices.length / 7) * (i + 1)) - 1);
        dailyCloses.push(prices[idx]);
    }

    const tbody = document.querySelector('#dailyTable tbody');
    tbody.innerHTML = '';
    let analysis = '';
    let confirming = 0;

    for (let i = 0; i < Math.min(7, fngData.length); i++) {
        const fng = fngData[fngData.length - 7 + i] || fngData[i];
        const close = dailyCloses[i] || prices[prices.length - 1];
        const prevClose = i > 0 ? dailyCloses[i - 1] : close;
        const chg = ((close - prevClose) / prevClose) * 100;
        const row = document.createElement('tr');
        row.innerHTML = `<td>${fng.date}</td><td>${fng.value}</td><td>${fng.classification}</td><td>${formatPrice(close)}</td><td class="${chg >= 0 ? 'positive' : 'negative'}">${formatPct(chg)}</td>`;
        tbody.appendChild(row);

        if ((fng.value > 50 && chg > 0) || (fng.value < 50 && chg < 0)) confirming++;
    }

    const sentimentDir = fngData[fngData.length - 1].value > fngData[fngData.length - 7].value ? 'rising' : 'falling';
    analysis = `Over the past 7 days, sentiment has been ${sentimentDir}. Price and sentiment confirmed each other on approximately ${confirming}/7 days. `;
    if (confirming >= 5) analysis += 'Strong confirmation suggests trend continuation.';
    else if (confirming <= 2) analysis += 'Notable divergence may indicate potential reversal.';
    else analysis += 'Mixed signals; watch for confirmation.';
    document.getElementById('sentimentAnalysis').textContent = analysis;
}

function generatePrediction(currentFng, fngData, prices, rsi, macd, ema20, ema50, volumes) {
    let bullScore = 0;
    let bearScore = 0;
    const bullFactors = [];
    const bearFactors = [];

    const fng = currentFng.value;
    const fngChange = fng - (fngData[fngData.length - 2]?.value || fng);

    // Sentiment
    if (fng <= 25) { bullScore += 12; bullFactors.push('Extreme Fear (contrarian buy signal)'); }
    else if (fng <= 40) { bullScore += 6; bullFactors.push('Fear level'); }
    else if (fng >= 75) { bearScore += 12; bearFactors.push('Extreme Greed (contrarian sell)'); }
    else if (fng >= 60) { bearScore += 6; bearFactors.push('Greed level'); }
    else { /* neutral */ }

    if (fngChange > 5) { bullScore += 4; bullFactors.push('Sentiment improving'); }
    if (fngChange < -5) { bearScore += 4; bearFactors.push('Sentiment deteriorating'); }

    // Momentum
    const chg1h = prices.length > 2 ? ((prices[prices.length-1] - prices[prices.length-2]) / prices[prices.length-2]) * 100 : 0;
    const chg4h = prices.length > 5 ? ((prices[prices.length-1] - prices[prices.length-5]) / prices[prices.length-5]) * 100 : 0;
    const chg24h = prices.length > 25 ? ((prices[prices.length-1] - prices[prices.length-25]) / prices[prices.length-25]) * 100 : 0;
    const chg7d = prices.length > 168 ? ((prices[prices.length-1] - prices[prices.length-168]) / prices[prices.length-168]) * 100 : 0;

    if (chg24h > 2) { bullScore += 8; bullFactors.push('Strong 24h momentum'); }
    else if (chg24h > 0.5) { bullScore += 4; bullFactors.push('Positive 24h change'); }
    else if (chg24h < -2) { bearScore += 8; bearFactors.push('Weak 24h momentum'); }
    else if (chg24h < -0.5) { bearScore += 4; bearFactors.push('Negative 24h change'); }

    if (chg4h > 1) bullScore += 3;
    if (chg4h < -1) bearScore += 3;

    // RSI
    if (rsi !== null) {
        if (rsi < 30) { bullScore += 10; bullFactors.push('RSI oversold (<30)'); }
        else if (rsi < 40) { bullScore += 5; bullFactors.push('RSI approaching oversold'); }
        else if (rsi > 70) { bearScore += 10; bearFactors.push('RSI overbought (>70)'); }
        else if (rsi > 60) { bearScore += 5; bearFactors.push('RSI elevated'); }
    }

    // MACD
    if (macd) {
        if (macd.histogram > 0 && macd.macd > macd.signal) { bullScore += 6; bullFactors.push('MACD bullish crossover/histogram'); }
        else if (macd.histogram < 0 && macd.macd < macd.signal) { bearScore += 6; bearFactors.push('MACD bearish'); }
    }

    // EMA
    if (ema20 && prices[prices.length-1] > ema20) { bullScore += 5; bullFactors.push('Price above EMA20'); }
    else if (ema20 && prices[prices.length-1] < ema20) { bearScore += 5; bearFactors.push('Price below EMA20'); }
    if (ema50 && ema20 && ema20 > ema50) { bullScore += 4; bullFactors.push('EMA20 above EMA50 (uptrend)'); }
    else if (ema50 && ema20 && ema20 < ema50) { bearScore += 4; bearFactors.push('EMA20 below EMA50 (downtrend)'); }

    // Volume (simple)
    const volChange = volumes.length > 24 ? (volumes[volumes.length-1] / (volumes.slice(-25, -1).reduce((a,b)=>a+b,0)/24)) : 1;
    if (volChange > 1.3 && chg24h > 0) { bullScore += 3; bullFactors.push('Volume confirming upside'); }
    if (volChange > 1.3 && chg24h < 0) { bearScore += 3; bearFactors.push('Volume confirming downside'); }

    // Net score
    const net = bullScore - bearScore;
    const total = bullScore + bearScore || 1;
    const conviction = Math.min(100, Math.abs(net) * 2);

    // Always force LONG or SHORT — higher score wins
    let signal, signalClass;
    if (net >= 0) {
        signal = 'LONG BIAS';
        signalClass = 'long';
    } else {
        signal = 'SHORT BIAS';
        signalClass = 'short';
    }

    // Probabilities still calculated for transparency, but signal is forced
    let upProb, downProb, sideProb;
    if (Math.abs(net) < 5) {
        // Very close — give the winner a slight edge
        upProb = net >= 0 ? 38 : 32;
        downProb = net < 0 ? 38 : 32;
        sideProb = 30;
    } else if (net > 0) {
        upProb = 45 + Math.min(25, net * 0.8);
        downProb = 25 - Math.min(10, net * 0.3);
        sideProb = 100 - upProb - downProb;
    } else {
        downProb = 45 + Math.min(25, -net * 0.8);
        upProb = 25 - Math.min(10, -net * 0.3);
        sideProb = 100 - upProb - downProb;
    }

    // Normalize
    const sum = upProb + downProb + sideProb;
    upProb = Math.round((upProb / sum) * 100);
    downProb = Math.round((downProb / sum) * 100);
    sideProb = 100 - upProb - downProb;

    return {
        signal,
        signalClass,
        upProb, downProb, sideProb,
        bullFactors: bullFactors.slice(0, 3),
        bearFactors: bearFactors.slice(0, 3),
        netScore: net,
        conviction
    };
}

function updatePredictionUI(pred, support, resistance) {
    const signalEl = document.getElementById('signal');
    signalEl.textContent = pred.signal;
    signalEl.className = 'signal ' + pred.signalClass;

    document.getElementById('probUp').textContent = pred.upProb;
    document.getElementById('probDown').textContent = pred.downProb;
    document.getElementById('probSide').textContent = pred.sideProb;

    const bullUl = document.getElementById('bullishFactors');
    bullUl.innerHTML = pred.bullFactors.map(f => `<li>${f}</li>`).join('') || '<li>None significant</li>';
    const bearUl = document.getElementById('bearishFactors');
    bearUl.innerHTML = pred.bearFactors.map(f => `<li>${f}</li>`).join('') || '<li>None significant</li>';

    document.getElementById('srLevels').innerHTML = `
        <strong>Key Levels:</strong> Support ${support ? formatPrice(support) : 'N/A'} | Resistance ${resistance ? formatPrice(resistance) : 'N/A'}
    `;

    document.getElementById('invalidation').innerHTML = `
        <strong>Invalidation:</strong> Close below support or break of key EMA with volume, or sudden F&G shift >10 points against bias.
    `;

    document.getElementById('forecastMeta').innerHTML = `
        Horizon: next 24 hours | Rule-based score: ${pred.netScore.toFixed(0)} | Conviction: ${pred.conviction.toFixed(0)}% | Sideways defined as |return| < ${SIDEWAYS_THRESHOLD}%
    `;
}

function updateChart(fngData, prices) {
    const ctx = document.getElementById('priceSentimentChart').getContext('2d');
    if (priceSentimentChart) priceSentimentChart.destroy();

    // Sample every ~24 hours for chart
    const labels = [];
    const priceData = [];
    const fngChartData = [];
    const step = Math.floor(prices.length / 7);
    for (let i = 0; i < 7; i++) {
        const idx = Math.min(prices.length - 1, i * step);
        labels.push(fngData[fngData.length - 7 + i]?.date || `Day ${i+1}`);
        priceData.push(prices[idx]);
        fngChartData.push(fngData[fngData.length - 7 + i]?.value || 50);
    }

    priceSentimentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'BTC Price',
                    data: priceData,
                    borderColor: '#58a6ff',
                    backgroundColor: 'rgba(88, 166, 255, 0.1)',
                    yAxisID: 'y',
                    tension: 0.2
                },
                {
                    label: 'Fear & Greed',
                    data: fngChartData,
                    borderColor: '#d29922',
                    backgroundColor: 'rgba(210, 153, 34, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { type: 'linear', position: 'left', title: { display: true, text: 'Price USD' } },
                y1: { type: 'linear', position: 'right', min: 0, max: 100, title: { display: true, text: 'F&G Index' }, grid: { drawOnChartArea: false } }
            }
        }
    });
}

function saveForecast(pred, price) {
    const forecasts = JSON.parse(localStorage.getItem('btcForecasts') || '[]');
    forecasts.push({
        timestamp: new Date().toISOString(),
        price,
        signal: pred.signal,
        upProb: pred.upProb,
        downProb: pred.downProb,
        sideProb: pred.sideProb
    });
    // Keep last 20
    localStorage.setItem('btcForecasts', JSON.stringify(forecasts.slice(-20)));
    renderHistory();
}

function renderHistory() {
    const forecasts = JSON.parse(localStorage.getItem('btcForecasts') || '[]');
    const el = document.getElementById('forecastHistory');
    if (forecasts.length === 0) {
        el.innerHTML = '<p>No forecasts recorded yet. Refresh the page to generate one.</p>';
        return;
    }
    el.innerHTML = forecasts.slice().reverse().map(f => `
        <div style="margin-bottom:0.75rem; padding:0.5rem; background:#0d1117; border-radius:4px; font-size:0.85rem;">
            ${new Date(f.timestamp).toLocaleString()} | ${f.signal} | Up ${f.upProb}% / Down ${f.downProb}% / Side ${f.sideProb}% | Price ${formatPrice(f.price)}
        </div>
    `).join('');
}

document.getElementById('clearHistory').addEventListener('click', () => {
    localStorage.removeItem('btcForecasts');
    renderHistory();
});


let btcPriceChart = null;
let currentChartType = 'line';
let currentTimeframe = '24h';

function updateBtcPriceChart(prices) {
    const ctx = document.getElementById('btcPriceChart');
    if (!ctx) return;
    if (btcPriceChart) btcPriceChart.destroy();

    // Slice data based on timeframe
    let sliced = prices;
    if (currentTimeframe === '24h') {
        sliced = prices.slice(-25); // roughly last 24 hours of hourly data
    } else {
        sliced = prices.slice(-168); // 7 days
    }

    const labels = sliced.map((_, i) => {
        const hoursAgo = sliced.length - 1 - i;
        return hoursAgo === 0 ? 'Now' : `${hoursAgo}h`;
    });

    if (currentChartType === 'candlestick') {
        const candles = [];
        const step = Math.max(1, Math.floor(sliced.length / 40));
        for (let i = step; i < sliced.length; i += step) {
            const open = sliced[i - step];
            const close = sliced[i];
            candles.push({
                x: i,
                o: open,
                h: Math.max(open, close),
                l: Math.min(open, close),
                c: close
            });
        }

        btcPriceChart = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: 'BTC',
                    data: candles,
                    color: { up: '#3fb950', down: '#f85149', unchanged: '#8b949e' }
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const c = ctx.raw;
                                return `$${c.c.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { type: 'linear', ticks: { color: '#8b949e', maxTicksLimit: 8 } },
                    y: { ticks: { color: '#8b949e', callback: v => '$' + v.toLocaleString() } }
                }
            }
        });
    } else {
        btcPriceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'BTC Price',
                    data: sliced,
                    borderColor: '#58a6ff',
                    backgroundColor: currentChartType === 'area' ? 'rgba(88, 166, 255, 0.12)' : 'transparent',
                    fill: currentChartType === 'area',
                    tension: 0.3,
                    pointRadius: 0,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => '$' + ctx.parsed.y.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: '#8b949e', maxTicksLimit: 8 } },
                    y: { ticks: { color: '#8b949e', callback: v => '$' + v.toLocaleString() } }
                }
            }
        });
    }
}

// Timeframe + chart type switchers
document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTimeframe = btn.dataset.tf;
        if (window.lastPrices) updateBtcPriceChart(window.lastPrices);
    });
});

document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentChartType = btn.dataset.type;
        if (window.lastPrices) updateBtcPriceChart(window.lastPrices);
    });
});

// Init
loadData();
renderHistory();
setInterval(loadData, 5 * 60 * 1000); // refresh every 5 min

const backToTop = document.getElementById('backToTop');
if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Position Advisor
const advisorToggle = document.getElementById('advisorToggle');
const advisorSection = document.getElementById('advisorSection');
const analyzeBtn = document.getElementById('analyzePosition');
const positionResult = document.getElementById('positionResult');
const scenarioTable = document.getElementById('scenarioTable');
const resetBtn = document.getElementById('resetPosition');

function updateMargin() {
    const leverage = parseFloat(document.getElementById('leverage')?.value) || 1;
    const notional = parseFloat(document.getElementById('positionSize')?.value) || 0;
    const marginEl = document.getElementById('margin');
    if (marginEl && leverage > 0 && notional > 0) {
        const margin = notional / leverage;
        marginEl.value = margin.toFixed(2);
    }
}

const STORAGE_KEY = 'positionAdvisorData';

function savePositionData() {
    const data = {
        enabled: advisorToggle?.checked || false,
        type: document.getElementById('positionType')?.value || 'long',
        leverage: document.getElementById('leverage')?.value || '1',
        entry: document.getElementById('entryPrice')?.value || '',
        size: document.getElementById('positionSize')?.value || '',
        margin: document.getElementById('margin')?.value || '',
        target: document.getElementById('targetPrice')?.value || '',
        liq: document.getElementById('liqPrice')?.value || ''
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadPositionData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
        const data = JSON.parse(saved);
        if (advisorToggle) advisorToggle.checked = data.enabled;
        if (data.enabled && advisorSection) advisorSection.classList.remove('hidden');
        if (document.getElementById('positionType')) document.getElementById('positionType').value = data.type || 'long';
        if (document.getElementById('leverage')) document.getElementById('leverage').value = data.leverage || '1';
        if (document.getElementById('entryPrice')) document.getElementById('entryPrice').value = data.entry || '';
        if (document.getElementById('positionSize')) document.getElementById('positionSize').value = data.size || '';
        if (document.getElementById('margin')) document.getElementById('margin').value = data.margin || '';
        if (document.getElementById('targetPrice')) document.getElementById('targetPrice').value = data.target || '';
        if (document.getElementById('liqPrice')) document.getElementById('liqPrice').value = data.liq || '';
    } catch (e) {}
}

function resetPositionData() {
    localStorage.removeItem(STORAGE_KEY);
    if (advisorToggle) advisorToggle.checked = false;
    if (advisorSection) advisorSection.classList.add('hidden');
    ['positionType','leverage','entryPrice','positionSize','margin','targetPrice','liqPrice'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = id === 'positionType' ? 'long' : (id === 'leverage' ? '1' : '');
    });
    if (positionResult) positionResult.innerHTML = '';
    if (scenarioTable) scenarioTable.innerHTML = '';
}

if (advisorToggle) {
    advisorToggle.addEventListener('change', () => {
        advisorSection.classList.toggle('hidden', !advisorToggle.checked);
        savePositionData();
    });
}

['positionType','leverage','entryPrice','positionSize','margin','targetPrice','liqPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            if (id === 'leverage' || id === 'positionSize') {
                updateMargin();
            }
            savePositionData();
        });
        el.addEventListener('change', () => {
            if (id === 'leverage' || id === 'positionSize') {
                updateMargin();
            }
            savePositionData();
        });
    }
});

function calcPnL(type, qty, entry, price) {
    if (type === 'long') return qty * (price - entry);
    return qty * (entry - price);
}

if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
        // Check if price is already available
        const currentPriceText = document.getElementById('btcPrice').textContent.replace(/[$,]/g, '');
        const currentPrice = parseFloat(currentPriceText);

        if (!currentPrice || isNaN(currentPrice)) {
            positionResult.innerHTML = '<p style="color:#d29922;">Market data is still loading. Please wait a moment and try again.</p>';
            return;
        }
// Show loading state on button
const originalText = analyzeBtn.textContent;
analyzeBtn.disabled = true;
analyzeBtn.classList.add('analyzing');
analyzeBtn.innerHTML = '<span class="btn-spinner"></span> Analyzing';

        try {
            await loadData();
            await new Promise(r => setTimeout(r, 400));

            const type = document.getElementById('positionType').value;
            const entry = parseFloat(document.getElementById('entryPrice').value);
            const notional = parseFloat(document.getElementById('positionSize').value);
            const margin = parseFloat(document.getElementById('margin').value) || 0;
            const target = parseFloat(document.getElementById('targetPrice').value);
            const liqPrice = parseFloat(document.getElementById('liqPrice').value);
            const freshPriceText = document.getElementById('btcPrice').textContent.replace(/[$,]/g, '');
            const freshPrice = parseFloat(freshPriceText);
            const signal = document.getElementById('signal').textContent;

            if (!entry || !notional || !freshPrice) {
                positionResult.innerHTML = '<p style="color:#f85149;">Please fill entry price and position size.</p>';
                return;
            }

            const qty = notional / entry;
            const currentPnL = calcPnL(type, qty, entry, freshPrice);
            const targetPnL = target ? calcPnL(type, qty, entry, target) : null;
            const roe = margin > 0 && targetPnL !== null ? (targetPnL / margin) * 100 : null;

            let liqDistancePct = null;
            if (liqPrice && liqPrice > 0) {
                liqDistancePct = type === 'long'
                    ? ((freshPrice - liqPrice) / freshPrice) * 100
                    : ((liqPrice - freshPrice) / freshPrice) * 100;
            }

            let advice = 'Hold';
            let adviceClass = 'hold';
            let reason = '';
            const predictionIsLong = signal.includes('LONG');
            const predictionIsShort = signal.includes('SHORT');

            if (type === 'long') {
                if (predictionIsLong) {
                    advice = 'Hold';
                    reason = 'Prediction still has a LONG BIAS. Your position aligns.';
                } else if (predictionIsShort) {
                    advice = 'Consider Closing';
                    adviceClass = 'close';
                    reason = 'Prediction has shifted to SHORT BIAS.';
                }
            } else {
                if (predictionIsShort) {
                    advice = 'Hold';
                    reason = 'Prediction still has a SHORT BIAS. Your position aligns.';
                } else if (predictionIsLong) {
                    advice = 'Consider Closing';
                    adviceClass = 'close';
                    reason = 'Prediction has shifted to LONG BIAS.';
                }
            }

            let liqInfo = liqPrice && liqDistancePct !== null
                ? `<br>Liquidation: $${liqPrice.toLocaleString()} (${liqDistancePct.toFixed(1)}% away)`
                : '';

            positionResult.innerHTML = `
                <div class="advice ${adviceClass}">${advice}</div>
                <div class="details">
                    Quantity: ${qty.toFixed(6)} BTC<br>
                    Entry: $${entry.toLocaleString()} → Current: $${freshPrice.toLocaleString()}<br>
                    Current P&L: ${currentPnL >= 0 ? '+' : ''}$${currentPnL.toFixed(2)}<br>
                    ${target ? `Target P&L: ${targetPnL >= 0 ? '+' : ''}$${targetPnL.toFixed(2)} (ROE ${roe !== null ? roe.toFixed(1) + '%' : '—'})<br>` : ''}
                    Current Signal: ${signal}${liqInfo}<br>
                    <em>${reason}</em>
                </div>
            `;

            if (target) {
                const prices = [entry * 0.98, entry * 0.99, entry, entry * 1.01, entry * 1.02, target];
                const unique = [...new Set(prices.map(p => Math.round(p)))].sort((a,b) => type === 'short' ? b - a : a - b);
                const rows = unique.map(p => {
                    const pnl = calcPnL(type, qty, entry, p);
                    const cls = pnl > 0 ? 'style="color:#3fb950"' : pnl < 0 ? 'style="color:#f85149"' : '';
                    return `<tr><td>$${p.toLocaleString()}</td><td ${cls}>${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}</td></tr>`;
                }).join('');
                scenarioTable.innerHTML = `
                    <h3 style="font-size:0.95rem; color:#8b949e; margin-bottom:0.5rem;">Scenarios</h3>
                    <table style="width:100%; font-size:0.85rem;">
                        <thead><tr><th>Price</th><th>P&L</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                `;
            } else {
                scenarioTable.innerHTML = '';
            }

            savePositionData();

} finally {
    analyzeBtn.disabled = false;
    analyzeBtn.classList.remove('analyzing');
    analyzeBtn.textContent = originalText;
}
    });
}

if (resetBtn) resetBtn.addEventListener('click', resetPositionData);

// Load saved data on page load
loadPositionData();

// Optional: expose reset globally so the button can call it
window.resetPositionAdvisor = resetPositionData;

