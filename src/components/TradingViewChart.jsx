import { useEffect, useRef } from 'react'

// Live candlestick chart via TradingView's free embeddable widget. Unlike the
// /candles endpoint (yfinance, empty after hours), this streams live NSE data
// and renders intraday + historical candles with zero backend load.

let _tvLoading = null
function loadTV() {
  if (window.TradingView) return Promise.resolve()
  if (_tvLoading) return _tvLoading
  _tvLoading = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = 'https://s3.tradingview.com/tv.js'
    s.async = true
    s.onload = resolve
    s.onerror = resolve
    document.head.appendChild(s)
  })
  return _tvLoading
}

// Map our symbols to TradingView tickers. Indices have dedicated symbols; cash
// equities are NSE:<SYMBOL>.
export function tvSymbol(sym) {
  if (!sym) return 'NSE:NIFTY'
  const s = String(sym).toUpperCase().trim()
  if (s === 'NIFTY' || s === 'NIFTY50') return 'NSE:NIFTY'
  if (s === 'BANKNIFTY') return 'NSE:BANKNIFTY'
  if (s === 'FINNIFTY') return 'NSE:CNXFINANCE'
  if (s.includes(':')) return s
  return `NSE:${s}`
}

export default function TradingViewChart({ symbol = 'NIFTY', interval = '5', height = 380 }) {
  const ref = useRef(null)
  const idRef = useRef('tv_' + Math.random().toString(36).slice(2))

  useEffect(() => {
    let dead = false
    loadTV().then(() => {
      if (dead || !window.TradingView || !ref.current) return
      ref.current.innerHTML = ''
      // eslint-disable-next-line no-new
      new window.TradingView.widget({
        symbol: tvSymbol(symbol),
        interval,
        container_id: idRef.current,
        autosize: true,
        theme: 'dark',
        style: '1',
        locale: 'in',
        timezone: 'Asia/Kolkata',
        hide_side_toolbar: true,
        allow_symbol_change: false,
        hide_top_toolbar: false,
        backgroundColor: 'rgba(0,0,0,0)',
      })
    })
    return () => { dead = true }
  }, [symbol, interval])

  return (
    <div className="tv-chart" style={{ height, width: '100%' }}>
      <div id={idRef.current} ref={ref} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}
