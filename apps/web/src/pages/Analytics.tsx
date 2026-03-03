import { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Eye,
  DollarSign,
  ShoppingCart,
  Calendar,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ============================================================
// Types
// ============================================================

interface DailyData {
  date: string;
  views: number;
  sales: number;
  revenue: number;
}

interface ProductAnalytics {
  slug: string;
  name: string;
  totalViews: number;
  totalSales: number;
  totalRevenue: number;
  conversionRate: number;
  dailyData: DailyData[];
}

type DateRange = '7d' | '30d' | '90d' | 'all' | 'custom';

// ============================================================
// Helpers
// ============================================================

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

function fillDateGaps(data: DailyData[], startDate: string, endDate: string): DailyData[] {
  const filled: DailyData[] = [];
  const dataMap = new Map(data.map(d => [d.date, d]));

  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const existing = dataMap.get(dateStr);
    filled.push(existing || { date: dateStr, views: 0, sales: 0, revenue: 0 });
    current.setDate(current.getDate() + 1);
  }

  return filled;
}

// ============================================================
// Demo Data Generator
// ============================================================

function generateDemoData(startDate: string, endDate: string): ProductAnalytics[] {
  const products = [
    { slug: 'demo-course', name: '48-Hour Product Builder' },
    { slug: 'demo-ebook', name: 'Side Hustle Launch Guide' },
    { slug: 'demo-coaching', name: 'VIP 1-on-1 Coaching' },
  ];

  return products.map((product, idx) => {
    const dailyData: DailyData[] = [];
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    let totalViews = 0;
    let totalSales = 0;
    let totalRevenue = 0;

    // Different traffic patterns per product
    const baseViews = [25, 15, 8][idx];
    const convRate = [0.04, 0.06, 0.12][idx];
    const price = [47, 27, 297][idx];

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();

      // Simulate realistic traffic patterns
      const weekendDip = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1;
      const trendMultiplier = 1 + (dailyData.length / 60); // gradual growth
      const randomVariation = 0.5 + Math.random();

      const views = Math.round(baseViews * weekendDip * trendMultiplier * randomVariation);
      const sales = Math.floor(views * convRate * (0.5 + Math.random()));
      const revenue = sales * price;

      dailyData.push({ date: dateStr, views, sales, revenue });
      totalViews += views;
      totalSales += sales;
      totalRevenue += revenue;

      current.setDate(current.getDate() + 1);
    }

    return {
      slug: product.slug,
      name: product.name,
      totalViews,
      totalSales,
      totalRevenue,
      conversionRate: totalViews > 0 ? (totalSales / totalViews) * 100 : 0,
      dailyData,
    };
  });
}

// ============================================================
// Custom Tooltip
// ============================================================

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-neutral-400 text-xs mb-2">{formatDate(label)}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-neutral-300 capitalize">{entry.name}:</span>
          <span className="text-white font-medium">
            {entry.name === 'revenue' ? formatCurrency(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Summary Card
// ============================================================

function SummaryCard({
  label,
  value,
  icon,
  color,
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'purple' | 'emerald' | 'amber';
  active: boolean;
  onClick: () => void;
}) {
  const colorMap = {
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      border: 'border-purple-200 dark:border-purple-500/30',
      activeBorder: 'border-purple-400 dark:border-purple-500',
      icon: 'text-purple-500',
      ring: 'ring-purple-400/20',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      activeBorder: 'border-emerald-400 dark:border-emerald-500',
      icon: 'text-emerald-500',
      ring: 'ring-emerald-400/20',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/30',
      activeBorder: 'border-amber-400 dark:border-amber-500',
      icon: 'text-amber-500',
      ring: 'ring-amber-400/20',
    },
  };

  const c = colorMap[color];

  return (
    <button
      onClick={onClick}
      className={`text-left w-full ${c.bg} border-2 ${active ? c.activeBorder : c.border} rounded-xl p-4 transition-all hover:shadow-md ${active ? `ring-4 ${c.ring}` : ''} cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={c.icon}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-0.5">
        {value}
      </div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
    </button>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductAnalytics[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeChart, setActiveChart] = useState<'views' | 'sales' | 'revenue'>('views');
  const [demoMode, setDemoMode] = useState(false);
  const [realTotalViews, setRealTotalViews] = useState(0);

  // Calculate date boundaries
  const { startDate, endDate } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dateRange === 'custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[dateRange];
    if (days) {
      return { startDate: getDateDaysAgo(days), endDate: today };
    }
    return { startDate: getDateDaysAgo(365), endDate: today };
  }, [dateRange, customStart, customEnd]);

  // Fetch real analytics data
  useEffect(() => {
    if (!demoMode) {
      fetchAnalytics();
    }
  }, [startDate, endDate, demoMode]);

  // Generate demo data when demo mode is active
  useEffect(() => {
    if (demoMode) {
      setProducts(generateDemoData(startDate, endDate));
      setLoading(false);
    }
  }, [demoMode, startDate, endDate]);

  async function fetchAnalytics() {
    const user = auth.currentUser;
    if (!user) {
      console.log('[Analytics] No authenticated user');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Get all published products for this user
      console.log('[Analytics] Fetching published_pages for user:', user.uid);
      const publishedQuery = query(
        collection(db, 'published_pages'),
        where('userId', '==', user.uid)
      );
      const publishedSnap = await getDocs(publishedQuery);
      console.log('[Analytics] Found published pages:', publishedSnap.size);

      if (publishedSnap.empty) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const productAnalytics: ProductAnalytics[] = [];

      // Step 2: For each published product, fetch view/sales data
      for (const pubDoc of publishedSnap.docs) {
        const slug = pubDoc.id;
        const pubData = pubDoc.data();
        const productName = pubData.salesPage?.coreInfo?.name || pubData.productName || 'Untitled';
        console.log(`[Analytics] Processing product: ${productName} (${slug})`);

        // Fetch the page_views parent doc for totals
        let viewsTotals: any = {};
        try {
          const viewsDocRef = doc(db, 'page_views', slug);
          const viewsDocSnap = await getDoc(viewsDocRef);
          viewsTotals = viewsDocSnap.exists() ? viewsDocSnap.data() : {};
          console.log(`[Analytics] page_views/${slug}:`, viewsTotals);
        } catch (viewErr) {
          console.warn(`[Analytics] Could not read page_views/${slug}:`, viewErr);
        }

        // Fetch daily data
        const dailyData: DailyData[] = [];
        let rangeViews = 0;
        let rangeSales = 0;
        let rangeRevenue = 0;

        try {
          const dailyQuery = query(
            collection(db, 'page_views', slug, 'daily'),
            orderBy('date', 'asc')
          );
          const dailySnap = await getDocs(dailyQuery);
          console.log(`[Analytics] Daily entries for ${slug}:`, dailySnap.size);

          dailySnap.forEach((dayDoc) => {
            const d = dayDoc.data();
            const date = d.date || dayDoc.id;

            if (date >= startDate && date <= endDate) {
              const entry: DailyData = {
                date,
                views: d.views || 0,
                sales: d.sales || 0,
                revenue: d.revenue || 0,
              };
              dailyData.push(entry);
              rangeViews += entry.views;
              rangeSales += entry.sales;
              rangeRevenue += entry.revenue;
            }
          });
        } catch (dailyErr) {
          console.warn(`[Analytics] Could not read daily data for ${slug}:`, dailyErr);
          // Fall back to totals from parent doc if daily reads fail
          rangeViews = viewsTotals.totalViews || 0;
          rangeSales = viewsTotals.totalSales || 0;
          rangeRevenue = viewsTotals.totalRevenue || 0;
        }

        productAnalytics.push({
          slug,
          name: productName,
          totalViews: rangeViews,
          totalSales: rangeSales,
          totalRevenue: rangeRevenue,
          conversionRate: rangeViews > 0 ? (rangeSales / rangeViews) * 100 : 0,
          dailyData: fillDateGaps(dailyData, startDate, endDate),
        });
      }

      productAnalytics.sort((a, b) => b.totalViews - a.totalViews);
      console.log('[Analytics] Final product analytics:', productAnalytics);
      
      // Track real total views to decide when to hide the preview button
      const totalRealViews = productAnalytics.reduce((sum, p) => sum + p.totalViews, 0);
      setRealTotalViews(totalRealViews);
      
      setProducts(productAnalytics);
    } catch (err) {
      console.error('[Analytics] Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  // Aggregate daily data across all products
  const aggregatedDaily = useMemo(() => {
    if (products.length === 0) return [];

    const dateMap = new Map<string, DailyData>();

    products.forEach((product) => {
      product.dailyData.forEach((day) => {
        const existing = dateMap.get(day.date) || { date: day.date, views: 0, sales: 0, revenue: 0 };
        existing.views += day.views;
        existing.sales += day.sales;
        existing.revenue += day.revenue;
        dateMap.set(day.date, existing);
      });
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [products]);

  // Summary totals
  const totals = useMemo(() => {
    return products.reduce(
      (acc, p) => ({
        views: acc.views + p.totalViews,
        sales: acc.sales + p.totalSales,
        revenue: acc.revenue + p.totalRevenue,
      }),
      { views: 0, sales: 0, revenue: 0 }
    );
  }, [products]);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Page Header + Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Analytics
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Track how your products are performing
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Preview Sample Data — only shown when creator has < 50 real views */}
          {realTotalViews < 50 && (
            <>
              <button
                onClick={() => setDemoMode(!demoMode)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1.5 ${
                  demoMode
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {demoMode ? 'Sample Data ON' : 'Preview Sample Data'}
              </button>

              <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700" />
            </>
          )}

          {/* Date Range Selector */}
          {(['7d', '30d', '90d', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateRange === range
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {range === 'all' ? 'All Time' : range.replace('d', ' days')}
            </button>
          ))}
          <button
            onClick={() => setDateRange('custom')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1 ${
              dateRange === 'custom'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Custom
          </button>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl px-4 py-3">
          <Eye className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <p className="text-sm text-purple-700 dark:text-purple-300">
            Showing sample data to preview how your analytics will look with real traffic. Click "Sample Data ON" to return to your actual data.
          </p>
        </div>
      )}

      {/* Custom Date Range Inputs */}
      {dateRange === 'custom' && (
        <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3">
          <label className="text-sm text-neutral-500 dark:text-neutral-400">From</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-1.5 text-sm text-neutral-900 dark:text-white"
          />
          <label className="text-sm text-neutral-500 dark:text-neutral-400">to</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-1.5 text-sm text-neutral-900 dark:text-white"
          />
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <BarChart3 className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            No analytics yet
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-md mx-auto">
            Publish a product and share the link to start seeing views, sales, and revenue data here.
            Try "Preview Sample Data" above to see how it will look!
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Views"
              value={formatNumber(totals.views)}
              icon={<Eye className="w-5 h-5" />}
              color="purple"
              active={activeChart === 'views'}
              onClick={() => setActiveChart('views')}
            />
            <SummaryCard
              label="Total Sales"
              value={totals.sales.toString()}
              icon={<ShoppingCart className="w-5 h-5" />}
              color="emerald"
              active={activeChart === 'sales'}
              onClick={() => setActiveChart('sales')}
            />
            <SummaryCard
              label="Total Revenue"
              value={formatCurrency(totals.revenue)}
              icon={<DollarSign className="w-5 h-5" />}
              color="amber"
              active={activeChart === 'revenue'}
              onClick={() => setActiveChart('revenue')}
            />
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white capitalize">
                {activeChart} over time
              </h2>
              <div className="flex items-center gap-1">
                {(['views', 'sales', 'revenue'] as const).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setActiveChart(metric)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors capitalize ${
                      activeChart === metric
                        ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium'
                        : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {metric}
                  </button>
                ))}
              </div>
            </div>

            {aggregatedDaily.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={aggregatedDaily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: '#999' }}
                    axisLine={{ stroke: '#444' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#999' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => activeChart === 'revenue' ? `$${val}` : val}
                    width={50}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {activeChart === 'views' && (
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fill="url(#gradViews)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
                    />
                  )}
                  {activeChart === 'sales' && (
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#gradSales)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    />
                  )}
                  {activeChart === 'revenue' && (
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#gradRevenue)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-neutral-400 text-sm">
                No data in this date range
              </div>
            )}
          </div>

          {/* Per-Product Breakdown */}
          <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Product Breakdown
              </h2>
            </div>

            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800/50">
              <div className="col-span-4">Product</div>
              <div className="col-span-2 text-right">Views</div>
              <div className="col-span-2 text-right">Sales</div>
              <div className="col-span-2 text-right">Revenue</div>
              <div className="col-span-2 text-right">Conv. Rate</div>
            </div>

            {/* Table Rows */}
            {products.map((product) => (
              <div
                key={product.slug}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/50 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group"
              >
                <div className="col-span-4 flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {product.name}
                  </span>
                  {!demoMode && (
                    <a
                      href={`/p/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-purple-400"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="col-span-2 flex justify-between sm:justify-end">
                  <span className="text-xs text-neutral-400 sm:hidden">Views</span>
                  <span className="text-sm text-neutral-700 dark:text-neutral-200 tabular-nums">
                    {formatNumber(product.totalViews)}
                  </span>
                </div>
                <div className="col-span-2 flex justify-between sm:justify-end">
                  <span className="text-xs text-neutral-400 sm:hidden">Sales</span>
                  <span className="text-sm text-neutral-700 dark:text-neutral-200 tabular-nums">
                    {product.totalSales}
                  </span>
                </div>
                <div className="col-span-2 flex justify-between sm:justify-end">
                  <span className="text-xs text-neutral-400 sm:hidden">Revenue</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white tabular-nums">
                    {formatCurrency(product.totalRevenue)}
                  </span>
                </div>
                <div className="col-span-2 flex justify-between sm:justify-end">
                  <span className="text-xs text-neutral-400 sm:hidden">Conv.</span>
                  <span className={`text-sm tabular-nums ${
                    product.conversionRate > 5
                      ? 'text-emerald-500'
                      : product.conversionRate > 0
                        ? 'text-amber-500'
                        : 'text-neutral-400'
                  }`}>
                    {product.conversionRate > 0 ? product.conversionRate.toFixed(1) + '%' : '\u2014'}
                  </span>
                </div>
              </div>
            ))}

            {/* Total Row */}
            {products.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
                <div className="col-span-4 text-sm font-semibold text-neutral-900 dark:text-white">
                  Total
                </div>
                <div className="col-span-2 flex justify-between sm:justify-end">
                  <span className="text-xs text-neutral-400 sm:hidden">Views</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {formatNumber(totals.views)}
                  </span>
                </div>
                <div className="col-span-2 flex justify-between sm:justify-end">
                  <span className="text-xs text-neutral-400 sm:hidden">Sales</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {totals.sales}
                  </span>
                </div>
                <div className="col-span-2 flex justify-between sm:justify-end">
                  <span className="text-xs text-neutral-400 sm:hidden">Revenue</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {formatCurrency(totals.revenue)}
                  </span>
                </div>
                <div className="col-span-2 flex justify-between sm:justify-end">
                  <span className="text-xs text-neutral-400 sm:hidden">Conv.</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {totals.views > 0 ? ((totals.sales / totals.views) * 100).toFixed(1) + '%' : '\u2014'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}