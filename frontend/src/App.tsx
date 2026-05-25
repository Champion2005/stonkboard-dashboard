import { useState, useEffect } from 'react';
import axios from 'axios';
import { ExternalLink, TrendingUp, TrendingDown, Minus, Activity, Filter, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Types
interface StockMention {
  id: number;
  post_id: string;
  ticker_symbol: string;
  title: string;
  author: string;
  url: string;
  price_at_mention: number | null;
  current_price: number | null;
  initial_sentiment_score: number | null;
  initial_sentiment_confidence: number | null;
  delayed_comment_sentiment_score: number | null;
  comment_crawl_status: string;
  created_at: string;
  perf_delta: number | null;
  mention_volume: number | null;
}

// Components
const SentimentBadge = ({ score }: { score: number | null }) => {
  if (score === null) return <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded-full text-xs flex items-center gap-1 w-fit"><Minus size={12} /> Unknown</span>;
  
  if (score > 0.2) return <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded-full text-xs font-medium flex items-center gap-1 w-fit"><TrendingUp size={12} /> Bullish</span>;
  if (score < -0.2) return <span className="px-2 py-1 bg-red-900/50 text-red-400 rounded-full text-xs font-medium flex items-center gap-1 w-fit"><TrendingDown size={12} /> Bearish</span>;
  return <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded-full text-xs font-medium flex items-center gap-1 w-fit"><Minus size={12} /> Neutral</span>;
};

const ConfidenceBar = ({ confidence }: { confidence: number | null }) => {
  if (confidence === null) return <div className="text-xs text-gray-500">N/A</div>;
  
  const percentage = Math.round(confidence * 100);
  const colorClass = percentage > 80 ? 'bg-green-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
      </div>
      <span className="text-xs text-gray-400 font-mono">{percentage}%</span>
    </div>
  );
};

export default function App() {
  const [data, setData] = useState<StockMention[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Filters
  const [timeWindow, setTimeWindow] = useState<number>(24);
  const [minVolume, setMinVolume] = useState<number>(1);
  const [divergenceFilter, setDivergenceFilter] = useState<boolean>(false);
  const [priceTier, setPriceTier] = useState<string>('');
  const [minPerfDelta, setMinPerfDelta] = useState<number | ''>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('time_window_hours', timeWindow.toString());
      params.append('min_volume', minVolume.toString());
      if (divergenceFilter) params.append('divergence_filter', 'true');
      if (priceTier) params.append('price_tier', priceTier);
      if (minPerfDelta !== '') params.append('min_perf_delta', minPerfDelta.toString());

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await axios.get(`${baseUrl}/api/dashboard`, { params });
      setData(response.data);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [timeWindow, minVolume, divergenceFilter, priceTier, minPerfDelta]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Stonkboard</h1>
              <p className="text-sm text-gray-400">r/pennystocks sentiment & analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">Live &bull; {lastRefreshed.toLocaleTimeString()}</span>
            <button 
              onClick={fetchData}
              disabled={loading}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-200"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Filters */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
            <Filter size={16} /> Advanced Filters
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">Time Horizon</label>
              <select 
                value={timeWindow}
                onChange={(e) => setTimeWindow(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value={1}>Past 1 Hour</option>
                <option value={4}>Past 4 Hours</option>
                <option value={12}>Past 12 Hours</option>
                <option value={24}>Past 24 Hours</option>
                <option value={168}>Past 7 Days</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium flex justify-between">
                <span>Min Volume</span>
                <span className="font-mono">{minVolume} posts</span>
              </label>
              <input 
                type="range" 
                min="1" max="50" 
                value={minVolume}
                onChange={(e) => setMinVolume(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">Price Tier</label>
              <select 
                value={priceTier}
                onChange={(e) => setPriceTier(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="">All Tiers</option>
                <option value="SUB_PENNY">Sub-Penny (&lt; $0.10)</option>
                <option value="MICRO_CAP">Micro-Cap ($0.10 - $1.00)</option>
                <option value="TRUE_PENNY">True Penny ($1.00 - $5.00)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">Min Perf. Delta (%)</label>
              <input 
                type="number" 
                placeholder="e.g. 15"
                value={minPerfDelta}
                onChange={(e) => setMinPerfDelta(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>

            <div className="space-y-2 flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={divergenceFilter}
                  onChange={(e) => setDivergenceFilter(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-950 border-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                />
                <span className="text-sm font-medium text-red-400 group-hover:text-red-300 transition-colors">
                  Divergence Risk
                </span>
              </label>
              <p className="text-[10px] text-gray-500 ml-6">High initial, low crowd sentiment.</p>
            </div>

          </div>
        </section>

        {/* Data Table */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-950/50 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-400 font-semibold">
                  <th className="px-5 py-4">Asset</th>
                  <th className="px-5 py-4">Sentiment</th>
                  <th className="px-5 py-4">AI Confidence</th>
                  <th className="px-5 py-4">Live Price</th>
                  <th className="px-5 py-4">Perf. Delta</th>
                  <th className="px-5 py-4 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500 text-sm">
                      {loading ? 'Scanning market data...' : 'No mentions found matching your criteria.'}
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-200 tracking-tight">{row.ticker_symbol}</span>
                          <a 
                            href={row.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-gray-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="View source thread"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <SentimentBadge score={row.initial_sentiment_score} />
                      </td>
                      <td className="px-5 py-4">
                        <ConfidenceBar confidence={row.initial_sentiment_confidence} />
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-gray-300">
                        {row.current_price !== null ? `$${row.current_price.toFixed(4)}` : 'N/A'}
                      </td>
                      <td className="px-5 py-4 font-mono text-sm font-medium">
                        {row.perf_delta !== null ? (
                          <span className={row.perf_delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {row.perf_delta > 0 ? '+' : ''}{row.perf_delta.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-gray-400">
                        {row.mention_volume}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
