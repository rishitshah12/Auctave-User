import React, { useEffect, useState, useMemo, FC } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import {
  Search, Eye, MousePointerClick, TrendingUp, Users, X, ChevronDown, ChevronUp,
  Activity, BarChart2, Clock, Filter, Globe, Smartphone, Monitor
} from 'lucide-react';
import { MainLayout } from './MainLayout';
import { supabase } from './supabaseClient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, any>;
  session_id: string;
  created_at: string;
}

interface ClientRow {
  id: string;
  name: string;
  email: string;
  company_name: string;
  customer_id: string;
}

interface UserSummary {
  userId: string;
  name: string;
  email: string;
  company: string;
  customerId: string;
  totalEvents: number;
  searches: number;
  factoryViews: number;
  pageViews: number;
  rfqSubmits: number;
  lastSeen: string;
  topSearches: string[];
  topFactories: string[];
  orgInfo?: string; // "Team: <org name>" for invitee members
}

interface SearchEntry {
  query: string;
  count: number;
  users: number;
}

interface FactoryEntry {
  factoryId: string;
  factoryName: string;
  factoryLocation: string;
  views: number;
  uniqueUsers: number;
}

// ── Country centroids ─────────────────────────────────────────────────────────

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [-95.71, 37.09], USA: [-95.71, 37.09], 'United States': [-95.71, 37.09],
  GB: [-3.44, 55.38], UK: [-3.44, 55.38], 'United Kingdom': [-3.44, 55.38],
  IN: [78.96, 20.59], India: [78.96, 20.59],
  CN: [104.19, 35.86], China: [104.19, 35.86],
  BD: [90.35, 23.68], Bangladesh: [90.35, 23.68],
  VN: [108.28, 14.06], Vietnam: [108.28, 14.06],
  PK: [69.35, 30.38], Pakistan: [69.35, 30.38],
  TR: [35.24, 38.96], Turkey: [35.24, 38.96],
  AU: [133.78, -25.27], Australia: [133.78, -25.27],
  BR: [-51.93, -14.24], Brazil: [-51.93, -14.24],
  FR: [2.21, 46.23], France: [2.21, 46.23],
  CA: [-106.35, 56.13], Canada: [-106.35, 56.13],
  IT: [12.57, 41.87], Italy: [12.57, 41.87],
  JP: [138.25, 36.20], Japan: [138.25, 36.20],
  KR: [127.77, 35.91], 'South Korea': [127.77, 35.91],
  MX: [-102.55, 23.63], Mexico: [-102.55, 23.63],
  DE: [10.45, 51.17], Germany: [10.45, 51.17],
  ID: [113.92, -0.79], Indonesia: [113.92, -0.79],
  TH: [100.99, 15.87], Thailand: [100.99, 15.87],
  SG: [103.82, 1.35], Singapore: [103.82, 1.35],
  MY: [108.96, 4.21], Malaysia: [108.96, 4.21],
  AE: [53.85, 23.42], UAE: [53.85, 23.42], 'United Arab Emirates': [53.85, 23.42],
  NL: [5.29, 52.13], Netherlands: [5.29, 52.13],
  ES: [-3.75, 40.46], Spain: [-3.75, 40.46],
  PT: [-8.22, 39.40], Portugal: [-8.22, 39.40],
  ZA: [22.94, -30.56], 'South Africa': [22.94, -30.56],
  NG: [8.68, 9.08], Nigeria: [8.68, 9.08],
  EG: [30.80, 26.82], Egypt: [30.80, 26.82],
  SA: [45.08, 23.89], 'Saudi Arabia': [45.08, 23.89],
  PH: [121.77, 12.88], Philippines: [121.77, 12.88],
  RU: [105.32, 61.52], Russia: [105.32, 61.52],
  PL: [19.15, 51.92], Poland: [19.15, 51.92],
  SE: [18.64, 60.13], Sweden: [18.64, 60.13],
  LK: [80.77, 7.87], 'Sri Lanka': [80.77, 7.87],
  MA: [-7.09, 31.79], Morocco: [-7.09, 31.79],
  AR: [-63.62, -38.42], Argentina: [-63.62, -38.42],
  CO: [-74.30, 4.57], Colombia: [-74.30, 4.57],
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface AdminUserAnalyticsPageProps {
  pageKey: number;
  user: any;
  currentPage: string;
  isMenuOpen: boolean;
  isSidebarCollapsed: boolean;
  toggleMenu: () => void;
  setIsSidebarCollapsed: (v: boolean) => void;
  handleSetCurrentPage: (page: string, data?: any) => void;
  handleSignOut: () => void;
  isAdmin: boolean;
  userProfile?: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 0 },
];

const BAR_COLORS = ['#c20c0b', '#e85d04', '#f48c06', '#dc2f02', '#9d0208', '#6a040f'];

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Truncated Y-axis tick ─────────────────────────────────────────────────────

const TruncatedYTick: FC<{ x?: number; y?: number; payload?: any; maxChars?: number }> = ({ x = 0, y = 0, payload, maxChars = 18 }) => {
  const label: string = payload?.value ?? '';
  const display = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy="0.35em" textAnchor="end" fill="#6B7280" fontSize={11}>
        {display}
      </text>
    </g>
  );
};

// ── World Map Section ─────────────────────────────────────────────────────────

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const WorldMapSection: FC<{ events: RawEvent[]; clientMap: Record<string, ClientRow> }> = ({ events, clientMap }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; country: string; users: string[]; total: number } | null>(null);
  const [RSM, setRSM] = useState<any>(null);

  React.useEffect(() => {
    import('react-simple-maps').then(mod => setRSM(mod));
  }, []);

  const locationPoints = useMemo(() => {
    const map: Record<string, { coords: [number, number]; country: string; userIds: Set<string> }> = {};
    events.forEach(e => {
      const d = e.event_data || {};
      const lon = d.longitude ?? d.lng ?? d.lon;
      const lat = d.latitude ?? d.lat;
      const country = (d.country || d.country_code || d.country_name || '').trim();

      let key = '';
      let coords: [number, number] | null = null;

      if (typeof lon === 'number' && typeof lat === 'number') {
        key = `${lon.toFixed(1)},${lat.toFixed(1)}`;
        coords = [lon, lat];
      } else if (country) {
        const c = COUNTRY_CENTROIDS[country];
        if (!c) return;
        key = country;
        coords = c;
      } else return;

      if (!map[key]) map[key] = { coords, country: country || key, userIds: new Set() };
      map[key].userIds.add(e.user_id);
    });

    return Object.values(map).map(({ coords, country, userIds }) => ({
      coords,
      country,
      userCount: userIds.size,
      users: [...userIds].map(uid => {
        const c = clientMap[uid];
        return c ? `${c.name}${c.company_name ? ` · ${c.company_name}` : ''}` : uid.slice(0, 8) + '…';
      }),
    }));
  }, [events, clientMap]);

  const noData = locationPoints.length === 0;

  if (!RSM) return (
    <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-5 flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#c20c0b] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { ComposableMap: CMap, Geographies: Geos, Geography: Geo, Marker: Mrk } = RSM;

  return (
    <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={16} className="text-rose-500" />
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">User Locations</h2>
        {!noData && <span className="ml-auto text-xs text-gray-400">{locationPoints.length} location{locationPoints.length !== 1 ? 's' : ''}</span>}
      </div>
      <div className="relative" style={{ background: 'linear-gradient(160deg,#0c1526 0%,#0f1f38 100%)', borderRadius: 12, overflow: 'hidden' }}>
        <CMap
          projectionConfig={{ scale: 147, center: [0, 10] }}
          width={800}
          height={380}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <Geos geography={GEO_URL}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => (
                <Geo
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#2d4a3e"
                  stroke="#3d6b52"
                  strokeWidth={0.5}
                  style={{ default: { outline: 'none' }, hover: { outline: 'none', fill: '#3a5e4f' }, pressed: { outline: 'none' } }}
                />
              ))
            }
          </Geos>

          {locationPoints.map((pt, i) => {
            const r = Math.min(14, 5 + pt.userCount * 2);
            return (
              <Mrk key={i} coordinates={pt.coords}>
                <circle
                  r={r + 5} fill="#c20c0b" fillOpacity={0.18}
                  onMouseEnter={(e: React.MouseEvent) => {
                    const rect = (e.currentTarget.closest('svg') as SVGSVGElement)?.getBoundingClientRect();
                    setTooltip({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), country: pt.country, users: pt.users, total: pt.userCount });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'pointer' }}
                />
                <circle
                  r={r} fill="#c20c0b" fillOpacity={0.9} stroke="#fff" strokeWidth={0.8}
                  onMouseEnter={(e: React.MouseEvent) => {
                    const rect = (e.currentTarget.closest('svg') as SVGSVGElement)?.getBoundingClientRect();
                    setTooltip({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), country: pt.country, users: pt.users, total: pt.userCount });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'pointer' }}
                />
                {pt.userCount > 1 && (
                  <text textAnchor="middle" y={r * 0.35} fill="#fff" fontSize={Math.min(9, r * 0.8)} fontWeight={700} style={{ pointerEvents: 'none' }}>
                    {pt.userCount}
                  </text>
                )}
              </Mrk>
            );
          })}
        </CMap>

        {/* HTML tooltip overlay */}
        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none bg-gray-900/95 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10, maxWidth: 200 }}
          >
            <p className="font-bold text-white mb-1">{tooltip.country || 'Unknown'}</p>
            {tooltip.users.slice(0, 6).map((u, i) => (
              <p key={i} className="text-gray-300 truncate">{u}</p>
            ))}
            {tooltip.total > 6 && <p className="text-gray-500 mt-0.5">+{tooltip.total - 6} more</p>}
          </div>
        )}

        {noData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            <Globe size={32} className="opacity-25" />
            <p className="text-sm font-medium text-white/60">No location data tracked yet</p>
            <p className="text-xs text-white/30 text-center max-w-56 px-4">
              Add <code className="bg-white/10 px-1 rounded">country</code> or{' '}
              <code className="bg-white/10 px-1 rounded">latitude / longitude</code> to your event_data
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Device Platform Section ───────────────────────────────────────────────────

const DEVICE_CONFIG: Record<string, { color: string; gradient: string }> = {
  Android: { color: '#22c55e', gradient: 'from-green-500 to-emerald-600' },
  iOS:     { color: '#3b82f6', gradient: 'from-blue-500 to-indigo-600' },
  Desktop: { color: '#8b5cf6', gradient: 'from-violet-500 to-purple-600' },
  Other:   { color: '#94a3b8', gradient: 'from-slate-400 to-slate-500' },
};

const categorizeDevice = (raw: string): string => {
  const dt = raw.toLowerCase();
  if (dt.includes('android')) return 'Android';
  if (dt.includes('ios') || dt.includes('iphone') || dt.includes('ipad')) return 'iOS';
  if (dt.includes('desktop') || dt.includes('windows') || dt.includes('mac') || dt.includes('linux') || dt === 'web') return 'Desktop';
  return 'Other';
};

const categorizeFromUA = (ua: string): string => {
  const u = ua.toLowerCase();
  if (/android/.test(u)) return 'Android';
  if (/ipad|iphone|ipod/.test(u)) return 'iOS';
  if (/windows|macintosh|linux/.test(u)) return 'Desktop';
  return 'Other';
};

const DevicePlatformSection: FC<{ events: RawEvent[] }> = ({ events }) => {
  const breakdown = useMemo(() => {
    const userDevice: Record<string, Record<string, number>> = {};
    events.forEach(e => {
      const raw = (e.event_data?.device_type || e.event_data?.platform || e.event_data?.os || '').trim();
      const ua = (e.event_data?.user_agent || '').trim();
      if (!raw && !ua) return;
      const cat = raw ? categorizeDevice(raw) : categorizeFromUA(ua);
      userDevice[e.user_id] = userDevice[e.user_id] || {};
      userDevice[e.user_id][cat] = (userDevice[e.user_id][cat] || 0) + 1;
    });
    const counts: Record<string, number> = {};
    Object.values(userDevice).forEach(cats => {
      const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (top) counts[top] = (counts[top] || 0) + 1;
    });
    return counts;
  }, [events]);

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const hasData = total > 0;
  const pieData = Object.entries(breakdown).map(([name, value]) => ({ name, value }));

  const DeviceIcon: FC<{ name: string; size?: number }> = ({ name, size = 14 }) =>
    name === 'Desktop' ? <Monitor size={size} className="text-white" /> : <Smartphone size={size} className="text-white" />;

  return (
    <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Smartphone size={16} className="text-blue-500" />
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">Platform Usage</h2>
        {hasData && <span className="ml-auto text-xs text-gray-400">{total} user{total !== 1 ? 's' : ''}</span>}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-52 text-gray-400 gap-2">
          <Monitor size={28} className="opacity-25" />
          <p className="text-sm font-medium">No platform data yet</p>
          <p className="text-xs text-center text-gray-300 max-w-48">
            Add <code className="bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 rounded text-[10px]">device_type</code> to your event_data (e.g. "android", "ios", "desktop")
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={DEVICE_CONFIG[entry.name]?.color ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', borderRadius: '10px', border: 'none', color: '#f9fafb', fontSize: '12px' }}
                formatter={(value: number, name: string) => [`${value} user${value !== 1 ? 's' : ''} (${Math.round((value / total) * 100)}%)`, name]}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2.5">
            {(Object.keys(DEVICE_CONFIG) as string[])
              .filter(name => breakdown[name])
              .map(name => {
                const count = breakdown[name];
                const pct = Math.round((count / total) * 100);
                const cfg = DEVICE_CONFIG[name];
                return (
                  <div key={name} className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0`}>
                      <DeviceIcon name={name} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{name}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: cfg.color }}>{count}</span>
                    <div className="w-16 bg-gray-100 dark:bg-white/8 rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right tabular-nums">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard: FC<{ title: string; value: string | number; icon: React.ReactNode; gradient: string; sub?: string }> = ({ title, value, icon, gradient, sub }) => (
  <div className="relative overflow-hidden rounded-xl p-4 sm:p-5 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${gradient} opacity-[0.08] rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
        <h4 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">{value}</h4>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg group-hover:rotate-6 transition-transform duration-300 flex-shrink-0`}>
        {icon}
      </div>
    </div>
  </div>
);

// ── User Detail Panel ─────────────────────────────────────────────────────────

const UserDetailPanel: FC<{
  user: UserSummary;
  events: RawEvent[];
  onClose: () => void;
}> = ({ user, events, onClose }) => {
  const userEvents = useMemo(
    () => events.filter(e => e.user_id === user.userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [events, user.userId]
  );

  const searches = userEvents.filter(e => e.event_type === 'search');
  const factories = userEvents.filter(e => e.event_type === 'factory_view');
  const pages = userEvents.filter(e => e.event_type === 'page_view');

  const searchCounts = useMemo(() => {
    const map: Record<string, number> = {};
    searches.forEach(e => {
      const q = e.event_data?.query || '';
      if (q) map[q] = (map[q] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [searches]);

  const factoryCounts = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    factories.forEach(e => {
      const id = e.event_data?.factory_id || '';
      const name = e.event_data?.factory_name || id;
      if (id) {
        map[id] = map[id] || { name, count: 0 };
        map[id].count += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [factories]);

  const EVENT_ICONS: Record<string, React.ReactNode> = {
    search: <Search size={12} className="text-blue-500" />,
    factory_view: <Eye size={12} className="text-emerald-500" />,
    factory_hover: <MousePointerClick size={12} className="text-amber-500" />,
    page_view: <MousePointerClick size={12} className="text-purple-500" />,
    page_exit: <Clock size={12} className="text-purple-400" />,
    category_select: <Filter size={12} className="text-amber-500" />,
    filter_apply: <Filter size={12} className="text-orange-500" />,
    rfq_submit: <TrendingUp size={12} className="text-rose-500" />,
    quote_view: <BarChart2 size={12} className="text-indigo-500" />,
    catalog_view: <Eye size={12} className="text-cyan-500" />,
    catalog_exit: <Clock size={12} className="text-cyan-400" />,
    catalog_item_select: <MousePointerClick size={12} className="text-cyan-600" />,
    trending_blog_view: <Activity size={12} className="text-pink-500" />,
    trending_video_play: <TrendingUp size={12} className="text-pink-600" />,
    crm_tab_view: <Filter size={12} className="text-violet-500" />,
    crm_order_view: <Eye size={12} className="text-violet-600" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-end sm:justify-center" onClick={onClose}>
      <div
        className="relative w-full sm:w-[680px] max-h-screen sm:max-h-[90vh] bg-white dark:bg-gray-950 shadow-2xl sm:rounded-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-rose-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{user.name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email} · {user.company} · {user.customerId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Searches', value: user.searches, color: 'text-blue-600' },
              { label: 'Factory Views', value: user.factoryViews, color: 'text-emerald-600' },
              { label: 'Page Views', value: user.pageViews, color: 'text-purple-600' },
              { label: 'RFQs', value: user.rfqSubmits, color: 'text-rose-600' },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 p-3 text-center">
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 font-medium uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Top Searches */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Top Searches</h3>
              {searchCounts.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No searches yet</p>
              ) : (
                <div className="space-y-1.5">
                  {searchCounts.map(([q, c]) => (
                    <div key={q} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2">
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{q}</span>
                      <span className="ml-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full flex-shrink-0">{c}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Factories Viewed */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Factories Viewed</h3>
              {factoryCounts.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No factory views yet</p>
              ) : (
                <div className="space-y-1.5">
                  {factoryCounts.map(f => (
                    <div key={f.name} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2">
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{f.name}</span>
                      <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full flex-shrink-0">{f.count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pages visited */}
          {pages.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Pages Visited</h3>
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  const pageCounts: Record<string, number> = {};
                  pages.forEach(e => {
                    const p = e.event_data?.page || 'unknown';
                    pageCounts[p] = (pageCounts[p] || 0) + 1;
                  });
                  return Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).map(([p, c]) => (
                    <span key={p} className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full font-medium">
                      {p} ({c})
                    </span>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Activity timeline */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Recent Activity</h3>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {userEvents.slice(0, 50).map(e => (
                <div key={e.id} className="flex items-start gap-2.5 text-xs">
                  <span className="mt-0.5 flex-shrink-0">{EVENT_ICONS[e.event_type] ?? <Activity size={12} className="text-gray-400" />}</span>
                  <span className="text-gray-700 dark:text-gray-300 flex-1 min-w-0">
                    <span className="font-semibold capitalize">{e.event_type.replace(/_/g, ' ')}</span>
                    {e.event_data?.query && <> — <span className="text-blue-600 dark:text-blue-400">"{e.event_data.query}"</span></>}
                    {e.event_data?.factory_name && <> — <span className="text-emerald-600 dark:text-emerald-400">{e.event_data.factory_name}</span></>}
                    {e.event_data?.page && (e.event_type === 'page_view' || e.event_type === 'page_exit') && <> — <span className="text-gray-500">{e.event_data.page}</span></>}
                    {e.event_data?.duration_ms && (e.event_type === 'page_exit' || e.event_type === 'factory_hover') && (
                      <span className="ml-1 text-[10px] text-gray-400">({Math.round(e.event_data.duration_ms / 1000)}s)</span>
                    )}
                    {e.event_data?.category && e.event_type === 'category_select' && <> — <span className="text-amber-600">{e.event_data.category}</span></>}
                  </span>
                  <span className="flex-shrink-0 text-gray-400 whitespace-nowrap">{timeAgo(e.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const AdminUserAnalyticsPage: FC<AdminUserAnalyticsPageProps> = (props) => {
  const { handleSetCurrentPage, ...layoutProps } = props;

  const [events, setEvents] = useState<RawEvent[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [orgMemberMap, setOrgMemberMap] = useState<Record<string, { orgName: string; ownerName: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dateRangeIdx, setDateRangeIdx] = useState(1); // default 30 days
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof UserSummary>('totalEvents');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchData = async () => {
    setIsLoading(true);
    const { days } = DATE_RANGES[dateRangeIdx];
    let eventsQuery = supabase
      .from('user_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (days > 0) {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      eventsQuery = eventsQuery.gte('created_at', since);
    }

    const [eventsResult, clientsResult, orgResult] = await Promise.all([
      eventsQuery.limit(10000),
      supabase.from('clients').select('id, name, email, company_name, customer_id'),
      supabase.rpc('admin_get_all_org_memberships'),
    ]);

    setEvents((eventsResult.data as RawEvent[]) ?? []);

    const clientRows = (clientsResult.data as ClientRow[]) ?? [];
    setClients(clientRows);

    // Build org member map: invitee userId → { orgName, ownerName }
    if (orgResult.data) {
      const clientLookup: Record<string, string> = {};
      clientRows.forEach(c => { clientLookup[c.id] = c.name || c.email; });
      const map: Record<string, { orgName: string; ownerName: string }> = {};
      for (const row of orgResult.data as any[]) {
        if (row.member_user_id !== row.owner_id) {
          map[row.member_user_id] = {
            orgName: row.org_name,
            ownerName: clientLookup[row.owner_id] || 'Org owner',
          };
        }
      }
      setOrgMemberMap(map);
    }

    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateRangeIdx]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const clientMap = useMemo(() => {
    const m: Record<string, ClientRow> = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const topSearches: SearchEntry[] = useMemo(() => {
    const map: Record<string, { count: number; userSet: Set<string> }> = {};
    events.filter(e => e.event_type === 'search' || e.event_type === 'catalog_search').forEach(e => {
      const q = (e.event_data?.query || '').trim().toLowerCase();
      if (!q) return;
      map[q] = map[q] || { count: 0, userSet: new Set() };
      map[q].count += 1;
      map[q].userSet.add(e.user_id);
    });
    return Object.entries(map)
      .map(([query, { count, userSet }]) => ({ query, count, users: userSet.size }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  const topFactories: FactoryEntry[] = useMemo(() => {
    const map: Record<string, { name: string; location: string; views: number; userSet: Set<string> }> = {};
    events.filter(e => e.event_type === 'factory_view').forEach(e => {
      const id = e.event_data?.factory_id || '';
      if (!id) return;
      map[id] = map[id] || { name: e.event_data?.factory_name || id, location: e.event_data?.factory_location || '', views: 0, userSet: new Set() };
      map[id].views += 1;
      map[id].userSet.add(e.user_id);
    });
    return Object.entries(map)
      .map(([factoryId, { name, location, views, userSet }]) => ({
        factoryId,
        factoryName: name,
        factoryLocation: location,
        views,
        uniqueUsers: userSet.size,
      }))
      .sort((a, b) => b.views - a.views);
  }, [events]);

  const userSummaries: UserSummary[] = useMemo(() => {
    const map: Record<string, Partial<UserSummary> & { topSearchMap: Record<string, number>; topFactoryMap: Record<string, string> }> = {};

    events.forEach(e => {
      const uid = e.user_id;
      if (!map[uid]) {
        map[uid] = {
          userId: uid,
          totalEvents: 0, searches: 0, factoryViews: 0, pageViews: 0, rfqSubmits: 0,
          lastSeen: e.created_at,
          topSearchMap: {},
          topFactoryMap: {},
        };
      }
      const u = map[uid];
      u.totalEvents! += 1;
      if (new Date(e.created_at) > new Date(u.lastSeen!)) u.lastSeen = e.created_at;

      if (e.event_type === 'search') {
        u.searches! += 1;
        const q = (e.event_data?.query || '').trim().toLowerCase();
        if (q) u.topSearchMap[q] = (u.topSearchMap[q] || 0) + 1;
      } else if (e.event_type === 'factory_view') {
        u.factoryViews! += 1;
        const fn = e.event_data?.factory_name || e.event_data?.factory_id || '';
        if (fn) u.topFactoryMap[fn] = fn;
      } else if (e.event_type === 'page_view') {
        u.pageViews! += 1;
      } else if (e.event_type === 'rfq_submit') {
        u.rfqSubmits! += 1;
      }
    });

    return Object.values(map).map(u => {
      const client = clientMap[u.userId!];
      const orgInfo = orgMemberMap[u.userId!];
      return {
        userId: u.userId!,
        name: client?.name || orgInfo?.ownerName && `(${orgInfo.orgName} member)` || 'Unknown',
        email: client?.email || u.userId!,
        company: client?.company_name || (orgInfo ? orgInfo.orgName : '—'),
        customerId: client?.customer_id || '—',
        totalEvents: u.totalEvents!,
        searches: u.searches!,
        factoryViews: u.factoryViews!,
        pageViews: u.pageViews!,
        rfqSubmits: u.rfqSubmits!,
        lastSeen: u.lastSeen!,
        topSearches: Object.entries(u.topSearchMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([q]) => q),
        topFactories: Object.values(u.topFactoryMap).slice(0, 3),
        orgInfo: orgInfo ? `Team: ${orgInfo.orgName}` : undefined,
      } as UserSummary;
    });
  }, [events, clientMap, orgMemberMap]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return userSummaries
      .filter(u =>
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.company.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'desc' ? bv - av : av - bv;
        const as = String(av).toLowerCase();
        const bs = String(bv).toLowerCase();
        return sortDir === 'desc' ? bs.localeCompare(as) : as.localeCompare(bs);
      });
  }, [userSummaries, userSearch, sortKey, sortDir]);

  const totalSearches = events.filter(e => e.event_type === 'search').length;
  const totalFactoryViews = events.filter(e => e.event_type === 'factory_view').length;
  const totalRFQs = events.filter(e => e.event_type === 'rfq_submit').length;
  const activeUsers = new Set(events.map(e => e.user_id)).size;

  // Page duration data — average time per page across all users
  const pageDurations = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    events.filter(e => e.event_type === 'page_exit').forEach(e => {
      const page = e.event_data?.page || 'unknown';
      const ms = e.event_data?.duration_ms || 0;
      if (ms < 1000 || ms > 30 * 60 * 1000) return; // ignore <1s or >30min (tab left open)
      map[page] = map[page] || { total: 0, count: 0 };
      map[page].total += ms;
      map[page].count += 1;
    });
    return Object.entries(map)
      .map(([page, { total, count }]) => ({ page, avgSec: Math.round(total / count / 1000), visits: count }))
      .sort((a, b) => b.avgSec - a.avgSec);
  }, [events]);

  // Factory hover data — most hovered factories (intent signal)
  const factoryHovers = useMemo(() => {
    const map: Record<string, { name: string; location: string; totalMs: number; count: number; userSet: Set<string> }> = {};
    events.filter(e => e.event_type === 'factory_hover').forEach(e => {
      const id = e.event_data?.factory_id || '';
      if (!id) return;
      map[id] = map[id] || { name: e.event_data?.factory_name || id, location: e.event_data?.factory_location || '', totalMs: 0, count: 0, userSet: new Set() };
      map[id].totalMs += e.event_data?.duration_ms || 0;
      map[id].count += 1;
      map[id].userSet.add(e.user_id);
    });
    return Object.entries(map)
      .map(([id, { name, location, totalMs, count, userSet }]) => ({
        factoryId: id,
        factoryName: name,
        factoryLocation: location,
        avgSec: Math.round(totalMs / count / 1000),
        hovers: count,
        uniqueUsers: userSet.size,
      }))
      .sort((a, b) => b.hovers - a.hovers);
  }, [events]);

  // Top catalog items selected across all users
  const topCatalogItems = useMemo(() => {
    const map: Record<string, { name: string; factory: string; category: string; count: number; userSet: Set<string> }> = {};
    events.filter(e => e.event_type === 'catalog_item_select').forEach(e => {
      const id = e.event_data?.item_id || e.event_data?.item_name || '';
      if (!id) return;
      map[id] = map[id] || { name: e.event_data?.item_name || id, factory: e.event_data?.factory_name || '', category: e.event_data?.item_category || '', count: 0, userSet: new Set() };
      map[id].count += 1;
      map[id].userSet.add(e.user_id);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [events]);

  // Catalog time per factory (avg seconds on catalog tab)
  const catalogDurations = useMemo(() => {
    const map: Record<string, { name: string; totalMs: number; count: number }> = {};
    events.filter(e => e.event_type === 'catalog_exit').forEach(e => {
      const id = e.event_data?.factory_id || '';
      const ms = e.event_data?.duration_ms || 0;
      if (!id || ms < 1000 || ms > 30 * 60 * 1000) return;
      map[id] = map[id] || { name: e.event_data?.factory_name || id, totalMs: 0, count: 0 };
      map[id].totalMs += ms;
      map[id].count += 1;
    });
    return Object.entries(map)
      .map(([, { name, totalMs, count }]) => ({ name, avgSec: Math.round(totalMs / count / 1000), sessions: count }))
      .sort((a, b) => b.avgSec - a.avgSec);
  }, [events]);

  // Top trending content (blogs + videos combined)
  const topContent = useMemo(() => {
    const map: Record<string, { type: 'Blog' | 'Video'; title: string; count: number; userSet: Set<string> }> = {};
    events.filter(e => e.event_type === 'trending_blog_view' || e.event_type === 'trending_video_play').forEach(e => {
      const key = `${e.event_type}:${e.event_data?.blog_id || e.event_data?.video_id || e.event_data?.blog_title || e.event_data?.video_title || ''}`;
      const title = e.event_data?.blog_title || e.event_data?.video_title || 'Untitled';
      const type = e.event_type === 'trending_blog_view' ? 'Blog' : 'Video';
      map[key] = map[key] || { type, title, count: 0, userSet: new Set() };
      map[key].count += 1;
      map[key].userSet.add(e.user_id);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [events]);

  const PREVIEW = 10;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const ShowMore: FC<{ id: string; total: number }> = ({ id, total }) => {
    if (total <= PREVIEW) return null;
    const open = !!expanded[id];
    return (
      <button
        onClick={() => toggle(id)}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-[#c20c0b] dark:hover:text-rose-400 transition-colors"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {open ? 'Show less' : `Show ${total - PREVIEW} more`}
      </button>
    );
  };

  const handleSort = (key: keyof UserSummary) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon: FC<{ col: keyof UserSummary }> = ({ col }) => (
    sortKey === col
      ? (sortDir === 'desc' ? <ChevronDown size={13} className="text-rose-500" /> : <ChevronUp size={13} className="text-rose-500" />)
      : <ChevronDown size={13} className="text-gray-300 dark:text-gray-600" />
  );

  return (
    <MainLayout
      {...layoutProps}
      handleSetCurrentPage={handleSetCurrentPage}
      isAdmin
    >
      <div data-testid="admin-analytics-page" className="min-h-screen bg-gray-50 dark:bg-[#0a0a0c] p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">User Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Search behaviour, factory interest, and engagement tracking</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {DATE_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setDateRangeIdx(i)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  dateRangeIdx === i
                    ? 'bg-[#c20c0b] text-white shadow-sm'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:border-gray-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-[#c20c0b] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading analytics…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Active Users"
                value={activeUsers}
                sub="with recorded events"
                gradient="from-rose-500 to-pink-600"
                icon={<Users size={20} className="text-white" />}
              />
              <StatCard
                title="Total Searches"
                value={totalSearches}
                sub={`${topSearches[0]?.query ? `top: "${topSearches[0].query}"` : 'no searches yet'}`}
                gradient="from-blue-500 to-indigo-600"
                icon={<Search size={20} className="text-white" />}
              />
              <StatCard
                title="Factory Views"
                value={totalFactoryViews}
                sub={topFactories[0]?.factoryName ? `top: ${topFactories[0].factoryName}` : 'no views yet'}
                gradient="from-emerald-500 to-teal-600"
                icon={<Eye size={20} className="text-white" />}
              />
              <StatCard
                title="RFQs Submitted"
                value={totalRFQs}
                sub="sourcing conversions"
                gradient="from-amber-500 to-orange-600"
                icon={<TrendingUp size={20} className="text-white" />}
              />
            </div>

            {/* World Map + Device Platform Row */}
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <WorldMapSection events={events} clientMap={clientMap} />
              </div>
              <div>
                <DevicePlatformSection events={events} />
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Top Searches Chart */}
              <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Search size={16} className="text-blue-500" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">Top Search Terms</h2>
                </div>
                {topSearches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                    <Search size={28} className="opacity-30" />
                    <p className="text-sm">No searches in this period</p>
                  </div>
                ) : (
                  <div style={{ resize: 'vertical', overflow: 'auto', minHeight: '220px', maxHeight: '500px' }} className="w-full">
                    <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                      <BarChart data={topSearches.slice(0, 8)} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(156,163,175,0.15)" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                        <YAxis type="category" dataKey="query" width={110} axisLine={false} tickLine={false} tick={<TruncatedYTick maxChars={16} />} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', borderRadius: '10px', border: 'none', color: '#f9fafb', fontSize: '12px' }}
                          formatter={(value: any, name: string) => [value, name === 'count' ? 'Searches' : 'Users']}
                        />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                          {topSearches.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Top Factories Chart */}
              <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Eye size={16} className="text-emerald-500" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">Most Viewed Factories</h2>
                </div>
                {topFactories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                    <Eye size={28} className="opacity-30" />
                    <p className="text-sm">No factory views in this period</p>
                  </div>
                ) : (
                  <div style={{ resize: 'vertical', overflow: 'auto', minHeight: '220px', maxHeight: '500px' }} className="w-full">
                    <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                      <BarChart data={topFactories.slice(0, 8)} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(156,163,175,0.15)" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                        <YAxis type="category" dataKey="factoryName" width={130} axisLine={false} tickLine={false} tick={<TruncatedYTick maxChars={20} />} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', borderRadius: '10px', border: 'none', color: '#f9fafb', fontSize: '12px' }}
                          formatter={(value: any, name: string) => [value, name === 'views' ? 'Views' : 'Unique Users']}
                        />
                        <Bar dataKey="views" radius={[0, 6, 6, 0]} maxBarSize={20}>
                          {topFactories.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#6ee7b7'][i % 6]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Top Searches Table (detailed) */}
            <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Search size={16} className="text-blue-500" />
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">Search Intelligence</h2>
                <span className="ml-auto text-xs text-gray-400">{topSearches.length} unique queries</span>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm min-w-[320px] px-4 sm:px-0">
                  <thead>
                    <tr className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-white/8">
                      <th className="text-left pb-2 pr-3 pl-4 sm:pl-0">#</th>
                      <th className="text-left pb-2 pr-3">Query</th>
                      <th className="text-right pb-2 pr-3">Searches</th>
                      <th className="text-right pb-2 pr-4 sm:pr-0">Users</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {(expanded.searches ? topSearches : topSearches.slice(0, PREVIEW)).map((s, i) => (
                      <tr key={s.query} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors">
                        <td className="py-2.5 pr-3 pl-4 sm:pl-0 text-gray-400 font-mono text-xs">{i + 1}</td>
                        <td className="py-2.5 pr-3 font-medium text-gray-800 dark:text-gray-200">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                            {s.query}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <span className="font-bold text-blue-600">{s.count}</span>
                        </td>
                        <td className="py-2.5 text-right pr-4 sm:pr-0">
                          <span className="text-gray-500">{s.users}u</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ShowMore id="searches" total={topSearches.length} />
            </div>

            {/* Page Duration + Factory Hover Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Avg Time Per Page */}
              <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} className="text-purple-500" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">Avg. Time Per Page</h2>
                </div>
                {pageDurations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                    <Clock size={24} className="opacity-30" />
                    <p className="text-xs">No page duration data yet</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(expanded.pageDur ? pageDurations : pageDurations.slice(0, PREVIEW)).map(p => (
                        <div key={p.page} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-300 w-28 flex-shrink-0 truncate">{p.page}</span>
                          <div className="flex-1 bg-gray-100 dark:bg-white/8 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                              style={{ width: `${Math.min(100, (p.avgSec / (pageDurations[0]?.avgSec || 1)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-purple-600 w-12 text-right flex-shrink-0">
                            {p.avgSec >= 60 ? `${Math.floor(p.avgSec / 60)}m ${p.avgSec % 60}s` : `${p.avgSec}s`}
                          </span>
                          <span className="text-[10px] text-gray-400 w-12 text-right flex-shrink-0">{p.visits}v</span>
                        </div>
                      ))}
                    </div>
                    <ShowMore id="pageDur" total={pageDurations.length} />
                  </>
                )}
              </div>

              {/* Factory Hover Interest */}
              <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-1">
                  <MousePointerClick size={16} className="text-amber-500" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">Factory Hover Interest</h2>
                </div>
                <p className="text-[11px] text-gray-400 mb-3">Cards hovered &gt;500ms — intent signal before clicking</p>
                {factoryHovers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                    <MousePointerClick size={24} className="opacity-30" />
                    <p className="text-xs">No hover data yet</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(expanded.hovers ? factoryHovers : factoryHovers.slice(0, PREVIEW)).map((f, i) => (
                        <div key={f.factoryId} className="flex items-center gap-2.5">
                          <span className="text-[10px] font-mono text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{f.factoryName}</p>
                            <p className="text-[10px] text-gray-400 truncate">{f.factoryLocation}</p>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className="text-xs font-bold text-amber-600">{f.hovers}×</span>
                            <span className="text-[10px] text-gray-400">{f.avgSec}s · {f.uniqueUsers}u</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <ShowMore id="hovers" total={factoryHovers.length} />
                  </>
                )}
              </div>
            </div>

            {/* Catalog + Trending Content Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Top Catalog Items Selected */}
              <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={16} className="text-cyan-500" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">Top Catalog Items</h2>
                  {topCatalogItems.length > 0 && <span className="ml-auto text-xs text-gray-400">{topCatalogItems.length}</span>}
                </div>
                {topCatalogItems.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No catalog selections yet</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(expanded.catalog ? topCatalogItems : topCatalogItems.slice(0, PREVIEW)).map((item, i) => (
                        <div key={i} className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{item.factory}{item.category ? ` · ${item.category}` : ''}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold text-cyan-600">{item.count}×</p>
                            <p className="text-[10px] text-gray-400">{item.userSet.size}u</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <ShowMore id="catalog" total={topCatalogItems.length} />
                  </>
                )}
              </div>

              {/* Catalog Time Per Factory */}
              <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-cyan-400" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">Catalog Time</h2>
                  <span className="text-[10px] text-gray-400 ml-auto">avg per visit</span>
                </div>
                {catalogDurations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No catalog duration data yet</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(expanded.catDur ? catalogDurations : catalogDurations.slice(0, PREVIEW)).map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">{c.name}</span>
                          <span className="text-xs font-bold text-cyan-600 flex-shrink-0">
                            {c.avgSec >= 60 ? `${Math.floor(c.avgSec / 60)}m ${c.avgSec % 60}s` : `${c.avgSec}s`}
                          </span>
                        </div>
                      ))}
                    </div>
                    <ShowMore id="catDur" total={catalogDurations.length} />
                  </>
                )}
              </div>

              {/* Trending Content */}
              <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 sm:p-5 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-pink-500" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">Trending Engagement</h2>
                  {topContent.length > 0 && <span className="ml-auto text-xs text-gray-400">{topContent.length}</span>}
                </div>
                {topContent.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No content views yet</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {(expanded.content ? topContent : topContent.slice(0, PREVIEW)).map((c, i) => (
                        <div key={i} className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{c.title}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.type === 'Blog' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'}`}>{c.type}</span>
                          </div>
                          <span className="text-xs font-bold text-pink-600 flex-shrink-0">{c.count}×</span>
                        </div>
                      ))}
                    </div>
                    <ShowMore id="content" total={topContent.length} />
                  </>
                )}
              </div>
            </div>

            {/* Per-User Table */}
            <div className="bg-white dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-rose-500" />
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">Per-User Behaviour</h2>
                  <span className="text-xs text-gray-400">{filteredUsers.length}</span>
                </div>
                <div className="relative sm:ml-auto">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter users…"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full sm:w-52 pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#c20c0b]"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="py-10 text-center text-gray-400 text-sm">No user activity found for this period.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-white/8">
                          {([
                            { key: 'name', label: 'User' },
                            { key: 'searches', label: 'Searches' },
                            { key: 'factoryViews', label: 'Factories' },
                            { key: 'pageViews', label: 'Pages' },
                            { key: 'rfqSubmits', label: 'RFQs' },
                            { key: 'lastSeen', label: 'Last Seen' },
                          ] as { key: keyof UserSummary; label: string }[]).map(col => (
                            <th
                              key={col.key}
                              className="text-left pb-2 pr-4 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 select-none"
                              onClick={() => handleSort(col.key)}
                            >
                              <span className="inline-flex items-center gap-1">
                                {col.label}
                                <SortIcon col={col.key} />
                              </span>
                            </th>
                          ))}
                          <th className="pb-2 text-right pr-1">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                        {(expanded.users ? filteredUsers : filteredUsers.slice(0, PREVIEW)).map(u => (
                          <tr key={u.userId} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors group">
                            <td className="py-3 pr-4">
                              <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{u.name}</div>
                              <div className="text-[11px] text-gray-400">{u.email}</div>
                              {u.orgInfo && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-[9px] font-medium mt-0.5">
                                  {u.orgInfo}
                                </span>
                              )}
                              {u.topSearches.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {u.topSearches.map(s => (
                                    <span key={s} className="text-[9px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">{s}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-4"><span className="font-bold text-blue-600">{u.searches}</span></td>
                            <td className="py-3 pr-4">
                              <span className="font-bold text-emerald-600">{u.factoryViews}</span>
                              {u.topFactories.length > 0 && (
                                <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px]">{u.topFactories.join(', ')}</div>
                              )}
                            </td>
                            <td className="py-3 pr-4"><span className="font-bold text-purple-600">{u.pageViews}</span></td>
                            <td className="py-3 pr-4">
                              <span className={`font-bold ${u.rfqSubmits > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{u.rfqSubmits}</span>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock size={11} />
                                <span className="text-[11px]">{timeAgo(u.lastSeen)}</span>
                              </div>
                            </td>
                            <td className="py-3 text-right pr-1">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-[#c20c0b] hover:underline"
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="sm:hidden space-y-2">
                    {(expanded.users ? filteredUsers : filteredUsers.slice(0, PREVIEW)).map(u => (
                      <div
                        key={u.userId}
                        onClick={() => setSelectedUser(u)}
                        className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-3 py-3 active:bg-gray-100 dark:active:bg-white/10 cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{u.name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{u.company !== '—' ? u.company : u.email}</p>
                          {u.orgInfo && <p className="text-[10px] text-teal-500 font-medium">{u.orgInfo}</p>}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-blue-600 font-bold">{u.searches} searches</span>
                            <span className="text-[11px] text-emerald-600 font-bold">{u.factoryViews} factories</span>
                            {u.rfqSubmits > 0 && <span className="text-[11px] text-amber-600 font-bold">{u.rfqSubmits} RFQs</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-gray-400">{timeAgo(u.lastSeen)}</p>
                          <p className="text-[10px] text-[#c20c0b] font-semibold mt-1">View →</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <ShowMore id="users" total={filteredUsers.length} />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          events={events}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </MainLayout>
  );
};
