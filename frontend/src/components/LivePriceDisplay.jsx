import { usePriceStream } from '../hooks/usePriceStream';
import { WS_STATUS } from '../services/websocket';
import { formatPrice } from '../utils/format';

/**
 * Real-time price display with live updates via WebSocket
 * Shows latency indicator and auto-reconnects on failure
 */
export default function LivePriceDisplay({ symbol, showLatency = true }) {
  const { data, status, reconnect, isLive } = usePriceStream(symbol, true);

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse"></div>
        Connecting to live data...
      </div>
    );
  }

  const isConnecting = status === WS_STATUS.CONNECTING;
  const isConnected = status === WS_STATUS.CONNECTED;
  const isError = status === WS_STATUS.ERROR;
  const isStale = data.isStale;

  // Status indicator color
  let statusColor = 'bg-zinc-600';
  let statusText = 'Connecting';
  
  if (isConnected) {
    if (isLive && !isStale) {
      statusColor = 'bg-emerald-500';
      statusText = 'Live';
    } else if (isStale) {
      statusColor = 'bg-amber-500';
      statusText = 'Stale';
    } else {
      statusColor = 'bg-blue-500';
      statusText = 'Cached';
    }
  } else if (isError) {
    statusColor = 'bg-red-500';
    statusText = 'Error';
  }

  return (
    <div className="space-y-2">
      {/* Price Display */}
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-light font-mono text-zinc-100">
          {formatPrice(data.price, symbol)}
        </div>
        
        {data.change != null && (
          <div className={`text-sm font-mono ${data.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({(data.change_pct * 100).toFixed(2)}%)
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusColor} ${isLive ? 'animate-pulse' : ''}`}></span>
            <span className="text-zinc-400 font-mono">{statusText}</span>
          </div>

          {/* Source Indicator */}
          {showLatency && (
            <>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-500 font-mono">
                {data._source === 'yfinance_realtime' ? 'Yahoo Finance' : 
                 data._source === 'cached' ? 'Cache' : 'Fallback'}
              </span>
            </>
          )}
        </div>

        {/* Latency & Actions */}
        <div className="flex items-center gap-3">
          {showLatency && data.age != null && (
            <div className={`text-[10px] font-mono ${
              data.age < 3000 ? 'text-emerald-400' : 
              data.age < 10000 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {data.age < 1000 ? '<1s' : `${Math.round(data.age / 1000)}s`} ago
            </div>
          )}

          {/* Manual Refresh */}
          <button
            onClick={reconnect}
            disabled={isConnecting}
            className="text-[10px] font-mono text-blue-400 hover:text-blue-300 disabled:text-zinc-600 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {data.error && (
        <div className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          ⚠️ {data.error}
        </div>
      )}

      {/* Stale Data Warning */}
      {isStale && (
        <div className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          ⏰ Data is {Math.round(data.age / 1000)}s old - refreshing...
        </div>
      )}
    </div>
  );
}
