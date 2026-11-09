import { useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Bird, Check, ChevronRight,
  CircleDot, Clock3, Flame, Leaf, ListFilter, Map, Menu, Mountain, Radio, RefreshCw,
  Settings, ShieldCheck, SlidersHorizontal, Trees, X, Zap,
} from 'lucide-react';
import {
  getGetAlertsQueryKey, getGetForestActivityQueryKey, getGetForestOverviewQueryKey,
  getGetObservationsQueryKey, getGetRiskZonesQueryKey, useCreateObservation,
  useGetAlerts, useGetForestActivity, useGetForestOverview, useGetObservations,
  useGetRiskZones, useUpdateAlert,
} from '@workspace/api-client-react';
import type {
  ActivityItem, ForestAlert, ForestOverview, ForestAlertStatus, Observation,
  ObservationInputType, RiskZone,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import WildShieldPage from '@/pages/wildshield';
import IndiaMap, { type IndiaZone } from '@/components/india-map';
import ZoneIntelligenceModal from '@/components/zone-intelligence-modal';
import './index.css';



const queryClient = new QueryClient();
const fmtNumber = (value?: number) => value == null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
const fmtDate = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '—';
const ago = (value?: string) => value ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round((new Date(value).getTime() - Date.now()) / 3600000), 'hour') : '—';

function Mark() {
  return <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar)]"><Trees size={20} strokeWidth={2.5} /></div>;
}

const navItems = [
  { href: '/', label: 'Live overview', icon: Radio },
  { href: '/wildshield', label: 'WildShield-AI', icon: ShieldCheck, badge: 'Active' },
  { href: '/zones', label: 'Risk zones', icon: Map },
  { href: '/observations', label: 'Observations', icon: Bird },
  { href: '/alerts', label: 'Response alerts', icon: AlertTriangle },
];

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  return <div className="min-h-[100dvh] bg-background">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 px-2">
        <Mark />
        <div><div className="font-serif text-[14px] font-extrabold tracking-tight">WildShield-AI</div><div className="mt-0.5 text-[10px] uppercase tracking-[.2em] text-sidebar-foreground/55">Active Defense</div></div>
        <button data-testid="button-close-navigation" onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent md:hidden"><X size={17} /></button>
      </div>
      <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/45">Monitor</div>
      <nav className="mt-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon, badge }) => <Link key={href} href={href} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors ${location === href ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}><Icon size={17} strokeWidth={location === href ? 2.4 : 1.8} /><span>{label}</span>{badge && <span className="ml-auto flex items-center justify-center rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">{badge}</span>}{href === '/alerts' && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] px-1 text-[10px] font-bold text-white">4</span>}</Link>)}
      </nav>

      <div className="mt-8 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/45">Workspace</div>
      <nav className="mt-3 space-y-1">
        <Link href="/settings" data-testid="link-settings" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors ${location === '/settings' ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}><Settings size={17} /><span>Preferences</span></Link>
      </nav>
      <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-3.5">
        <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--sidebar-primary))]" /><span className="text-[11px] font-bold">Monitoring live</span></div>
        <p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/55">Satellite pass received 8 minutes ago.</p>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border px-2 pt-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--secondary-foreground))]">AM</div><div className="min-w-0"><div className="truncate text-xs font-bold">Amina Mensah</div><div className="text-[10px] text-sidebar-foreground/50">Field coordinator</div></div><ChevronRight className="ml-auto text-sidebar-foreground/40" size={15} /></div>
    </aside>
    {open && <button aria-label="Close navigation" data-testid="button-dismiss-navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-[hsl(var(--foreground)/.35)] md:hidden" />}
    <main className="md:pl-[258px]">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b bg-background/90 px-5 backdrop-blur-md md:px-9">
        <button data-testid="button-open-navigation" onClick={() => setOpen(true)} className="rounded-xl p-2 hover:bg-muted md:hidden"><Menu size={20} /></button>
        <div className="hidden items-center gap-2 text-[11px] font-semibold text-muted-foreground md:flex"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />Sierra Verde Reserve <span className="text-muted-foreground/40">/</span> <span>Operations desk</span></div>
        <div className="ml-auto flex items-center gap-2"><div className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[11px] text-muted-foreground sm:flex"><Clock3 size={14} />Shift brief <span className="data-mono text-foreground">06:00–14:00</span></div><button data-testid="button-notifications" className="relative rounded-xl border bg-card p-2.5 text-muted-foreground hover:text-foreground"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /></button></div>
      </header>
      <div className="mx-auto max-w-[1500px] px-5 py-7 md:px-9 lg:py-9">{children}</div>
    </main>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow">{eyebrow}</div><h1 className="mt-2 font-serif text-[clamp(28px,4vw,40px)] font-extrabold leading-none tracking-[-.04em]">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function LoadingRows({ count = 3 }: { count?: number }) { return <div className="space-y-3" aria-label="Loading"><div className="h-3 w-24 animate-pulse rounded bg-muted" />{Array.from({ length: count }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/70" />)}</div>; }
function QueryError({ label, onRetry }: { label: string; onRetry: () => void }) { return <div className="panel flex flex-col items-center justify-center p-10 text-center"><AlertTriangle className="text-[hsl(var(--accent))]" /><h3 className="mt-3 font-serif text-lg font-bold">Could not load {label}</h3><p className="mt-1 text-sm text-muted-foreground">The monitoring service did not respond. Your team can retry without losing context.</p><button data-testid={`button-retry-${label}`} onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><RefreshCw size={14} />Retry</button></div>; }
function EmptyState({ icon: Icon, title, detail }: { icon: typeof Leaf; title: string; detail: string }) { return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center"><Icon size={28} className="text-primary/50" /><h3 className="mt-3 font-serif font-bold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p></div>; }

function RiskBadge({ risk, type }: { risk: number; type?: string }) {
  const tone = risk >= 70 ? 'high' : risk >= 40 ? 'watch' : 'low';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone === 'high' ? 'bg-[hsl(24_59%_54%/.14)] text-[hsl(var(--accent))]' : tone === 'watch' ? 'bg-[hsl(43_79%_68%/.24)] text-[hsl(31_54%_34%)]' : 'bg-[hsl(163_48%_30%/.12)] text-primary'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{type ? `${type} · ` : ''}{Math.round(risk)} risk</span>;
}
function StatusBadge({ status }: { status: string }) { const cls = status === 'resolved' || status === 'verified' ? 'bg-[hsl(163_48%_30%/.12)] text-primary' : status === 'acknowledged' ? 'bg-[hsl(201_35%_49%/.15)] text-[hsl(196_38%_35%)]' : 'bg-[hsl(24_59%_54%/.14)] text-[hsl(var(--accent))]'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{status}</span>; }

function TrendChart({ trend }: { trend: ForestOverview['trend'] }) {
  const points = trend?.length ? trend : [];
  if (!points.length) return <EmptyState icon={Activity} title="No trend data yet" detail="Trend lines will appear after the next satellite pass." />;
  const max = Math.max(...points.map((p) => Math.max(p.risk, p.vegetation)), 100);
  const path = (key: 'risk' | 'vegetation') => points.map((p, i) => `${(i / Math.max(points.length - 1, 1)) * 100},${100 - (p[key] / max) * 82 - 8}`).join(' ');
  return <div className="relative h-[205px] min-w-[420px]"><div className="absolute inset-0 flex flex-col justify-between text-[10px] text-muted-foreground/60"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-y-2 left-8 right-1 h-[165px] w-[calc(100%-40px)] overflow-visible"><defs><linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="hsl(24 59% 54%)" stopOpacity=".2" /><stop offset="1" stopColor="hsl(24 59% 54%)" stopOpacity="0" /></linearGradient></defs><polygon points={`0,100 ${path('risk')} 100,100`} fill="url(#riskFill)" /><polyline points={path('risk')} fill="none" stroke="hsl(24 59% 54%)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /><polyline points={path('vegetation')} fill="none" stroke="hsl(163 48% 30%)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="3 2" />{points.map((p, i) => <circle key={i} cx={`${(i / Math.max(points.length - 1, 1)) * 100}`} cy={`${100 - (p.risk / max) * 82 - 8}`} r="1.3" fill="hsl(24 59% 54%)" vectorEffect="non-scaling-stroke" />)}</svg><div className="absolute bottom-5 left-8 right-0 flex justify-between text-[10px] text-muted-foreground">{points.map((p) => <span key={p.label}>{p.label}</span>)}</div></div>;
}

function Overview() {
  const overview = useGetForestOverview();
  const zones = useGetRiskZones();
  const alerts = useGetAlerts({ status: 'open' });
  const activity = useGetForestActivity();
  const queryClient = useQueryClient();
  const data = overview.data;
  const topZones = useMemo(() => (zones.data ?? []).slice().sort((a, b) => b.risk - a.risk).slice(0, 4), [zones.data]);
  const recentAlerts = useMemo(() => (alerts.data ?? []).slice(0, 3), [alerts.data]);
  const retry = () => {
    void queryClient.invalidateQueries({ queryKey: getGetForestOverviewQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetRiskZonesQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey({ status: 'open' }) });
    void queryClient.invalidateQueries({ queryKey: getGetForestActivityQueryKey() });
  };
  if (overview.isLoading) return <><PageHeading eyebrow="Live monitoring" title="Good morning, Amina." description="Loading the reserve picture for your shift briefing." /><div className="grid gap-4 md:grid-cols-4"><LoadingRows count={1} /><LoadingRows count={1} /><LoadingRows count={1} /><LoadingRows count={1} /></div></>;
  if (overview.isError || !data) return <QueryError label="the reserve overview" onRetry={retry} />;
  return <div className="animate-[fade-in_.4s_ease-out]">
    <PageHeading eyebrow="Live monitoring · 08:42 local" title="Good morning, Amina." description={`Sierra Verde Reserve is quiet where it should be. Here is what needs your team's attention today.`} action={<div className="text-right"><div className="eyebrow">Last satellite pass</div><div className="data-mono mt-1 text-xs">{fmtDate(data.lastUpdated)}</div></div>} />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Protected area" value={`${fmtNumber(data.monitoredArea)} km²`} note="under active watch" icon={Mountain} tone="green" />
      <MetricCard label="High-risk zones" value={fmtNumber(data.highRiskZones)} note="requires field review" icon={Flame} tone="orange" />
      <MetricCard label="Active alerts" value={fmtNumber(data.activeAlerts)} note="forest department queue" icon={Bell} tone="blue" />
      <MetricCard label="Wildlife signals" value={fmtNumber(data.wildlifeSignals)} note="last 24 hours" icon={Bird} tone="yellow" />
    </section>
    <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4"><div><div className="eyebrow">Signal movement</div><h2 className="mt-1 font-serif text-lg font-extrabold">Reserve pulse</h2></div><div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />Risk index</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-primary" />Vegetation</span></div></div>
        <div className="overflow-x-auto px-5 pt-4"><TrendChart trend={data.trend} /></div>
        <div className="grid grid-cols-2 border-t"><div className="px-5 py-4"><div className="eyebrow">Vegetation change</div><div className="mt-1 flex items-end gap-2"><span className="data-mono text-2xl font-bold">{fmtNumber(data.vegetationChange)}%</span><span className="mb-1 flex items-center text-xs font-bold text-primary"><ArrowDownRight size={14} /> stable</span></div></div><div className="border-l px-5 py-4"><div className="eyebrow">Readout window</div><div className="mt-2 text-sm font-semibold">Previous 30 days</div><div className="mt-1 text-xs text-muted-foreground">Compared with seasonal baseline</div></div></div>
      </div>
      <div className="panel forest-grid overflow-hidden"><div className="flex items-center justify-between border-b bg-card/70 px-5 py-4"><div><div className="eyebrow">Priority map</div><h2 className="mt-1 font-serif text-lg font-extrabold">Risk zones</h2></div><Link href="/zones" data-testid="link-view-all-zones" className="text-xs font-bold text-primary hover:underline">View all</Link></div><div className="space-y-1 p-3">{zones.isLoading ? <LoadingRows count={3} /> : zones.isError ? <p className="p-4 text-sm text-muted-foreground">Map data unavailable.</p> : topZones.length ? topZones.map((zone) => <Link href="/zones" data-testid={`link-zone-${zone.id}`} key={zone.id} className="interactive flex items-center gap-3 rounded-xl bg-card/80 p-3 hover:bg-card"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${zone.risk >= 70 ? 'bg-[hsl(24_59%_54%/.13)] text-[hsl(var(--accent))]' : 'bg-primary/10 text-primary'}`}>{zone.riskType === 'wildfire' ? <Flame size={17} /> : zone.riskType === 'deforestation' ? <Trees size={17} /> : <Leaf size={17} />}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{zone.name}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{zone.region} · {fmtNumber(zone.area)} km²</div></div><div className="text-right"><div className="data-mono text-sm font-bold">{Math.round(zone.risk)}</div><div className="text-[10px] text-muted-foreground">index</div></div></Link>) : <EmptyState icon={Map} title="No zones flagged" detail="Current monitoring pass found no risk zones." />}</div></div>
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
      <ActivityPanel items={activity.data ?? []} loading={activity.isLoading} />
      <AlertsPanel alerts={recentAlerts} loading={alerts.isLoading} />
    </section>
  </div>;
}

function MetricCard({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof Leaf; tone: string }) { const tones: Record<string, string> = { green: 'bg-primary/10 text-primary', orange: 'bg-[hsl(24_59%_54%/.14)] text-[hsl(var(--accent))]', blue: 'bg-[hsl(201_35%_49%/.15)] text-[hsl(196_38%_35%)]', yellow: 'bg-[hsl(43_79%_68%/.28)] text-[hsl(31_54%_34%)]' }; return <div className="panel interactive p-4"><div className="flex items-start justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={18} /></div><span className="data-mono text-[10px] text-muted-foreground">LIVE</span></div><div className="mt-5 data-mono text-[26px] font-bold tracking-[-.06em]">{value}</div><div className="mt-1 text-xs font-semibold">{label}</div><div className="mt-1 text-[11px] text-muted-foreground">{note}</div></div>; }

function ActivityPanel({ items, loading }: { items: ActivityItem[]; loading: boolean }) { return <div className="panel"><div className="flex items-center justify-between border-b px-5 py-4"><div><div className="eyebrow">Field log</div><h2 className="mt-1 font-serif text-lg font-extrabold">Recent activity</h2></div><Activity size={18} className="text-muted-foreground" /></div>{loading ? <div className="p-5"><LoadingRows /></div> : items.length ? <div className="divide-y">{items.slice(0, 5).map((item) => <div key={item.id} data-testid={`activity-item-${item.id}`} className="flex gap-3 px-5 py-3.5"><div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.tone === 'red' ? 'bg-[hsl(var(--accent))]' : item.tone === 'amber' ? 'bg-[hsl(43_79%_55%)]' : 'bg-primary'}`} /><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{item.label}</div><div className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</div></div><div className="data-mono whitespace-nowrap text-[10px] text-muted-foreground">{ago(item.timestamp)}</div></div>)}</div> : <div className="p-5"><EmptyState icon={Activity} title="No activity logged" detail="New field and satellite events will appear here." /></div>}</div>; }

function AlertsPanel({ alerts, loading }: { alerts: ForestAlert[]; loading: boolean }) { return <div className="panel"><div className="flex items-center justify-between border-b px-5 py-4"><div><div className="eyebrow">Response queue</div><h2 className="mt-1 font-serif text-lg font-extrabold">Needs attention</h2></div><Link href="/alerts" data-testid="link-review-alerts" className="text-xs font-bold text-primary hover:underline">Triage queue</Link></div>{loading ? <div className="p-5"><LoadingRows /></div> : alerts.length ? <div className="divide-y">{alerts.map((alert) => <div key={alert.id} data-testid={`alert-preview-${alert.id}`} className="flex items-center gap-3 px-5 py-3.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(24_59%_54%/.13)] text-[hsl(var(--accent))]"><AlertTriangle size={15} /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{alert.title}</div><div className="mt-0.5 text-xs text-muted-foreground">{alert.location} · {ago(alert.createdAt)}</div></div><StatusBadge status={alert.status} /></div>)}</div> : <div className="p-5"><EmptyState icon={ShieldCheck} title="Queue is clear" detail="No open alerts require response right now." /></div>}</div>; }

function Zones() {
  const query = useGetRiskZones();
  const [selected, setSelected] = useState<RiskZone | null>(null);
  const [selectedIndiaZone, setSelectedIndiaZone] = useState<IndiaZone | null>(null);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'map' | 'cards'>('map');

  const indiaZonesQuery = useQuery<IndiaZone[]>({
    queryKey: ['forest-india-zones'],
    queryFn: async () => {
      const res = await fetch('/api/forest/india-zones');
      if (!res.ok) throw new Error('Failed to fetch India danger zones');
      return res.json();
    },
  });

  const indiaZones = indiaZonesQuery.data ?? [];
  const zones = (query.data ?? []).filter((z) => filter === 'all' || z.riskType === filter).sort((a, b) => b.risk - a.risk);

  return <>
    <PageHeading
      eyebrow="National Ecological Grid · 10 Indian Danger Sectors"
      title="India Forest & Wildlife Danger Zones"
      description="Interactive real-time map of high-risk forest zones across India. Click any danger zone on the map to inspect vegetation change, wildlife telemetry, real-time alerts, and human conflict."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border bg-card p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${viewMode === 'map' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Map size={14} />
              Interactive India Map
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${viewMode === 'cards' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <SlidersHorizontal size={14} />
              Sector Grid Cards
            </button>
          </div>
          {viewMode === 'cards' && (
            <select
              data-testid="select-zone-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border bg-card px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="all">All signals</option>
              <option value="wildfire">Wildfire</option>
              <option value="deforestation">Deforestation</option>
              <option value="ecological">Ecological</option>
            </select>
          )}
        </div>
      }
    />

    {viewMode === 'map' ? (
      <div className="space-y-6">
        <IndiaMap
          zones={indiaZones}
          selectedZone={selectedIndiaZone}
          onSelectZone={(zone) => setSelectedIndiaZone(zone)}
        />

        {/* Quick horizontal preview cards of the 10 Indian danger zones */}
        <div className="panel p-5">
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <div>
              <div className="eyebrow">National Sector Grid</div>
              <h3 className="font-serif text-base font-extrabold">All 10 National Danger Sectors</h3>
            </div>
            <span className="text-xs text-muted-foreground">Click any sector to inspect multi-dimensional intel</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {indiaZones.map((z) => (
              <button
                key={z.id}
                onClick={() => setSelectedIndiaZone(z)}
                className={`rounded-xl border p-3 text-left transition hover:border-primary hover:bg-muted/40 ${selectedIndiaZone?.id === z.id ? 'border-primary bg-primary/10' : 'bg-card'}`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="rounded bg-muted px-1.5 py-0.5">{z.stateCode}</span>
                  <span className={z.risk >= 80 ? 'text-rose-500 font-mono font-bold' : 'text-amber-500 font-mono font-bold'}>{z.risk}%</span>
                </div>
                <div className="mt-2 text-xs font-bold truncate">{z.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{z.region}</div>
                <div className="mt-2 flex items-center justify-between border-t pt-1.5 text-[9px] text-muted-foreground font-semibold">
                  <span>{z.riskType}</span>
                  <span className="text-primary font-bold">Inspect &rarr;</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-6">
        {query.isLoading ? <LoadingRows count={5} /> : query.isError ? <QueryError label="risk zones" onRetry={() => void query.refetch()} /> : !zones.length ? <EmptyState icon={Map} title="No matching zones" detail="Try another signal filter or wait for the next monitoring pass." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {zones.map((zone, i) => {
              const matchedIndia = indiaZones.find((iz) => iz.name.toLowerCase().includes(zone.name.toLowerCase().split(' ')[0]) || zone.name.toLowerCase().includes(iz.name.toLowerCase().split(' ')[0]));
              return (
                <button
                  key={zone.id}
                  data-testid={`card-zone-${zone.id}`}
                  onClick={() => {
                    if (matchedIndia) {
                      setSelectedIndiaZone(matchedIndia);
                    } else {
                      setSelected(zone);
                    }
                  }}
                  className="panel interactive group text-left"
                >
                  <div className="relative h-32 overflow-hidden rounded-t-2xl bg-[hsl(163_30%_16%)]">
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{
                        background: `radial-gradient(ellipse at ${25 + i * 17}% ${42 + (i % 2) * 20}%, hsl(${zone.risk >= 70 ? '24 59% 54%' : '43 79% 68%'} / .7), transparent 23%), radial-gradient(ellipse at 70% 55%, hsl(163 48% 30% / .9), transparent 44%), linear-gradient(120deg, hsl(163 34% 11%), hsl(201 28% 32%))`,
                      }}
                    />
                    <svg className="absolute inset-0 h-full w-full opacity-25">
                      <path d={`M0 90 C80 ${30 + i * 8}, 150 ${120 - i * 10}, 260 34 S430 70, 600 15`} fill="none" stroke="hsl(43 79% 68%)" strokeWidth="1" />
                      <path d="M80 0 L210 140 M390 0 L300 140" stroke="hsl(201 45% 70%)" strokeWidth=".6" />
                    </svg>
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <span className="rounded-full bg-[hsl(163_30%_16%/.72)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                        {zone.region}
                      </span>
                      <RiskBadge risk={zone.risk} />
                    </div>
                    <div className="absolute bottom-3 left-4 font-mono text-[10px] text-white/60">
                      {zone.coordinates?.map((c) => c.toFixed(3)).join(' · ')}
                    </div>
                  </div>
                  <div className="flex items-start justify-between p-4">
                    <div>
                      <h3 className="font-serif text-lg font-extrabold">{zone.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{zone.riskType} signal · {fmtNumber(zone.area)} km² watched</p>
                    </div>
                    <ChevronRight className="mt-1 text-muted-foreground transition-transform group-hover:translate-x-1" size={18} />
                  </div>
                  <div className="flex items-center justify-between border-t px-4 py-3 text-xs">
                    <span className="text-muted-foreground">Updated {fmtDate(zone.updatedAt)}</span>
                    <span className={`flex items-center gap-1 font-bold ${zone.change > 0 ? 'text-[hsl(var(--accent))]' : 'text-primary'}`}>
                      {zone.change > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {Math.abs(zone.change).toFixed(1)}% this week
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    )}

    {/* Zone Drawer fallback */}
    {selected && <ZoneDrawer zone={selected} onClose={() => setSelected(null)} />}

    {/* Whole India Multi-Dimensional Danger Intelligence Modal */}
    {selectedIndiaZone && (
      <ZoneIntelligenceModal
        zone={selectedIndiaZone}
        onClose={() => setSelectedIndiaZone(null)}
      />
    )}
  </>;
}

function ZoneDrawer({ zone, onClose }: { zone: RiskZone; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex justify-end bg-[hsl(var(--foreground)/.35)]" onClick={onClose}><section onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-card p-6 shadow-2xl animate-[slide-in_.3s_ease-out]"><div className="flex items-center justify-between"><span className="eyebrow">Zone inspection</span><button data-testid="button-close-zone-drawer" onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X size={18} /></button></div><div className="mt-8 flex items-start justify-between"><div><h2 className="font-serif text-3xl font-extrabold tracking-tight">{zone.name}</h2><p className="mt-2 text-sm text-muted-foreground">{zone.region} · {zone.riskType} signal</p></div><div className="rounded-2xl bg-[hsl(24_59%_54%/.13)] px-3 py-2 text-right"><div className="data-mono text-2xl font-bold text-[hsl(var(--accent))]">{Math.round(zone.risk)}</div><div className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--accent))]">risk index</div></div></div><div className="mt-8 h-56 overflow-hidden rounded-2xl bg-[hsl(163_30%_16%)]" style={{ background: 'radial-gradient(circle at 35% 40%, hsl(24 59% 54%/.8), transparent 18%), radial-gradient(circle at 72% 60%, hsl(43 79% 68%/.38), transparent 20%), linear-gradient(135deg, hsl(163 34% 11%), hsl(201 28% 32%))' }}><div className="flex h-full items-center justify-center"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-[hsl(43_79%_68%/.7)] bg-[hsl(24_59%_54%/.25)] text-[hsl(43_79%_68%)]"><CircleDot size={25} /></div></div></div><div className="mt-6 grid grid-cols-2 gap-3"><Info label="Watched area" value={`${fmtNumber(zone.area)} km²`} /><Info label="Change, 7 days" value={`${zone.change > 0 ? '+' : ''}${zone.change.toFixed(1)}%`} /><Info label="Coordinates" value={zone.coordinates?.map((c) => c.toFixed(3)).join(', ') || '—'} /><Info label="Last pass" value={fmtDate(zone.updatedAt)} /></div><div className="mt-7 rounded-xl bg-muted/60 p-4"><div className="flex gap-3"><Zap size={17} className="mt-0.5 text-[hsl(var(--accent))]" /><div><div className="text-sm font-bold">Recommended next step</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{zone.riskType === 'wildfire' ? 'Dispatch a ranger verification sweep along the eastern access road.' : 'Compare this pass with the previous two images and check for an active field observation.'}</p></div></div></div></section></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-background p-3"><div className="eyebrow">{label}</div><div className="mt-1 text-sm font-bold">{value}</div></div>; }


function Observations() {
  const [type, setType] = useState<'all' | 'wildlife' | 'vegetation'>('all'); const query = useGetObservations({ type, limit: 100 }); const [modal, setModal] = useState(false);
  const observations = query.data ?? [];
  return <><PageHeading eyebrow="Field intelligence" title="Observations" description="A shared record of wildlife movement and vegetation change, ready for verification." action={<button data-testid="button-add-observation" onClick={() => setModal(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90"><CircleDot size={16} />Add observation</button>} />
    <div className="mb-4 flex items-center justify-between"><div className="flex gap-1 rounded-xl border bg-card p-1">{(['all', 'wildlife', 'vegetation'] as const).map((item) => <button key={item} data-testid={`button-filter-observations-${item}`} onClick={() => setType(item)} className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${type === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{item}</button>)}</div><div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><ListFilter size={14} />{observations.length} records</div></div>
    {query.isLoading ? <LoadingRows count={5} /> : query.isError ? <QueryError label="observations" onRetry={() => void query.refetch()} /> : !observations.length ? <EmptyState icon={Bird} title="No observations in this view" detail="Add a field note to build a living record for this area." /> : <div className="overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="hidden grid-cols-[1.2fr_1fr_1fr_.7fr_.8fr] gap-4 border-b bg-muted/50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid"><span>Observation</span><span>Location</span><span>Recorded</span><span>Source</span><span>Status</span></div>{observations.map((observation) => <ObservationRow observation={observation} key={observation.id} />)}</div>}
    {modal && <ObservationModal onClose={() => setModal(false)} />}
  </>;
}
function ObservationRow({ observation }: { observation: Observation }) { return <div data-testid={`observation-row-${observation.id}`} className="grid gap-3 border-b px-4 py-4 last:border-0 md:grid-cols-[1.2fr_1fr_1fr_.7fr_.8fr] md:items-center md:gap-4 md:px-5"><div className="flex items-center gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${observation.type === 'wildlife' ? 'bg-[hsl(201_35%_49%/.15)] text-[hsl(196_38%_35%)]' : 'bg-primary/10 text-primary'}`}>{observation.type === 'wildlife' ? <Bird size={17} /> : <Leaf size={17} />}</div><div><div className="text-sm font-bold">{observation.subject}</div><div className="mt-0.5 text-[11px] capitalize text-muted-foreground">{observation.type} · {Math.round(observation.confidence)}% confidence</div></div></div><div className="text-xs font-semibold text-muted-foreground">{observation.location}</div><div className="text-xs text-muted-foreground">{fmtDate(observation.recordedAt)}</div><div className="text-xs font-semibold text-muted-foreground">{observation.source}</div><div><StatusBadge status={observation.status ?? 'review'} /></div></div>; }
function ObservationModal({ onClose }: { onClose: () => void }) { const qc = useQueryClient(); const create = useCreateObservation(); const [form, setForm] = useState({ type: 'wildlife' as ObservationInputType, subject: '', location: '', confidence: '80', source: '' }); const change = (key: string, value: string) => setForm((old) => ({ ...old, [key]: value })); const submit = (e: React.FormEvent) => { e.preventDefault(); create.mutate({ data: { ...form, confidence: Number(form.confidence) } }, { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetObservationsQueryKey() }); onClose(); } }); }; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/.35)] p-4" onClick={onClose}><form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl animate-[fade-in_.2s_ease-out]"><div className="flex items-start justify-between"><div><div className="eyebrow">New field record</div><h2 className="mt-1 font-serif text-2xl font-extrabold">Add observation</h2></div><button type="button" data-testid="button-close-observation-modal" onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X size={18} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Record type"><select data-testid="select-observation-type" value={form.type} onChange={(e) => change('type', e.target.value)}><option value="wildlife">Wildlife</option><option value="vegetation">Vegetation</option></select></Field><Field label="Confidence"><input data-testid="input-observation-confidence" type="number" min="0" max="100" value={form.confidence} onChange={(e) => change('confidence', e.target.value)} /></Field><Field label="Subject" full><input required data-testid="input-observation-subject" placeholder="e.g. Mountain tapir tracks" value={form.subject} onChange={(e) => change('subject', e.target.value)} /></Field><Field label="Location" full><input required data-testid="input-observation-location" placeholder="e.g. North ridge, sector 04" value={form.location} onChange={(e) => change('location', e.target.value)} /></Field><Field label="Source" full><input required data-testid="input-observation-source" placeholder="e.g. Ranger patrol 12" value={form.source} onChange={(e) => change('source', e.target.value)} /></Field></div>{create.isError && <p className="mt-3 text-xs font-semibold text-destructive">Could not save this observation. Check the fields and try again.</p>}<div className="mt-7 flex justify-end gap-2"><button type="button" data-testid="button-cancel-observation" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted">Cancel</button><button disabled={create.isPending} data-testid="button-save-observation" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{create.isPending ? 'Saving…' : 'Save observation'}</button></div></form></div>; }
function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) { return <label className={`block ${full ? 'sm:col-span-2' : ''}`}><span className="mb-1.5 block text-xs font-bold">{label}</span>{children}</label>; }

function Alerts() {
  const [status, setStatus] = useState<'all' | ForestAlertStatus>('all'); const query = useGetAlerts({ status }); const qc = useQueryClient(); const update = useUpdateAlert();
  const changeStatus = (id: number, next: ForestAlertStatus) => update.mutate({ id, data: { status: next } }, { onSuccess: () => void qc.invalidateQueries({ queryKey: getGetAlertsQueryKey() }) });
  const alerts = query.data ?? [];
  return <><PageHeading eyebrow="Forest department" title="Response alerts" description="Triage automated signals with the field teams. Acknowledge what is being handled; resolve what is safe." action={<div className="data-mono text-xs text-muted-foreground">{alerts.filter((a) => a.status === 'open').length} open / {alerts.length} total</div>} /><div className="mb-5 flex items-center gap-2 overflow-x-auto">{(['all', 'open', 'acknowledged', 'resolved'] as const).map((item) => <button key={item} data-testid={`button-filter-alerts-${item}`} onClick={() => setStatus(item)} className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold capitalize ${status === item ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}>{item}</button>)}</div>{query.isLoading ? <LoadingRows count={4} /> : query.isError ? <QueryError label="alerts" onRetry={() => void query.refetch()} /> : !alerts.length ? <EmptyState icon={ShieldCheck} title="No alerts here" detail="This response view is clear. Try another status filter." /> : <div className="space-y-3">{alerts.map((alert) => <AlertCard alert={alert} onChange={changeStatus} pending={update.isPending} key={alert.id} />)}</div>}</>;
}
function AlertCard({ alert, onChange, pending }: { alert: ForestAlert; onChange: (id: number, status: ForestAlertStatus) => void; pending: boolean }) { return <article data-testid={`alert-card-${alert.id}`} className={`panel border-l-4 p-5 ${alert.severity === 'critical' ? 'border-l-[hsl(var(--accent))]' : alert.severity === 'high' ? 'border-l-[hsl(43_79%_55%)]' : 'border-l-primary'}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-3"><div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert.severity === 'critical' || alert.severity === 'high' ? 'bg-[hsl(24_59%_54%/.14)] text-[hsl(var(--accent))]' : 'bg-primary/10 text-primary'}`}><AlertTriangle size={19} /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-lg font-extrabold">{alert.title}</h2><span className="rounded-full bg-muted px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{alert.severity}</span></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{alert.description}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted-foreground"><span className="flex items-center gap-1.5"><Map size={13} />{alert.location}</span><span className="flex items-center gap-1.5"><Clock3 size={13} />{fmtDate(alert.createdAt)}</span><span className="flex items-center gap-1.5"><Zap size={13} />{alert.signal}</span></div></div></div><div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-end"><StatusBadge status={alert.status} /><div className="flex gap-2">{alert.status === 'open' && <button disabled={pending} data-testid={`button-acknowledge-alert-${alert.id}`} onClick={() => onChange(alert.id, 'acknowledged')} className="rounded-lg border bg-card px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50">Acknowledge</button>}{alert.status === 'acknowledged' && <button disabled={pending} data-testid={`button-resolve-alert-${alert.id}`} onClick={() => onChange(alert.id, 'resolved')} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"><Check size={13} />Resolve</button>}{alert.status === 'resolved' && <button disabled={pending} data-testid={`button-reopen-alert-${alert.id}`} onClick={() => onChange(alert.id, 'open')} className="rounded-lg border bg-card px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50">Reopen</button>}</div></div></div></article>; }

function SettingsPage() { const [saved, setSaved] = useState(false); const [prefs, setPrefs] = useState({ critical: true, digest: true, satellites: false, field: true, autoRefresh: true }); const toggle = (key: keyof typeof prefs) => { setPrefs((p) => ({ ...p, [key]: !p[key] })); setSaved(false); }; return <><PageHeading eyebrow="Workspace" title="Preferences" description="Tune the monitoring desk to the way your team works. These choices are saved for this browser." /><div className="grid max-w-4xl gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="space-y-5"><SettingsGroup title="Notifications" detail="Choose which signals should interrupt the desk."><ToggleRow label="Critical alert notifications" detail="Immediate notice for wildfire and deforestation signals." value={prefs.critical} onToggle={() => toggle('critical')} /><ToggleRow label="Morning shift digest" detail="A compact brief delivered at the start of your shift." value={prefs.digest} onToggle={() => toggle('digest')} /><ToggleRow label="Satellite pass completed" detail="Know when fresh imagery is ready to review." value={prefs.satellites} onToggle={() => toggle('satellites')} /><ToggleRow label="Field team updates" detail="Updates from ranger patrols and verification teams." value={prefs.field} onToggle={() => toggle('field')} /></SettingsGroup><SettingsGroup title="Monitoring desk" detail="Small defaults that keep the live view current."><ToggleRow label="Auto-refresh live overview" detail="Refresh reserve signals every five minutes while open." value={prefs.autoRefresh} onToggle={() => toggle('autoRefresh')} /></SettingsGroup><button data-testid="button-save-preferences" onClick={() => setSaved(true)} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{saved ? 'Preferences saved' : 'Save preferences'}</button></div><div className="panel forest-grid p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck size={19} /></div><h2 className="mt-5 font-serif text-xl font-extrabold">A calm desk is a ready desk.</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Canopy Watch keeps the signal visible without making the living landscape feel like a spreadsheet. Your team sees the same reserve picture, with enough context to act carefully.</p><div className="mt-6 border-t pt-4"><div className="eyebrow">Workspace</div><div className="mt-2 text-sm font-bold">Sierra Verde Reserve</div><div className="mt-1 text-xs text-muted-foreground">Field intelligence workspace · UTC−05:00</div></div></div></div></>; }
function SettingsGroup({ title, detail, children }: { title: string; detail: string; children: ReactNode }) { return <section className="panel"><div className="border-b px-5 py-4"><h2 className="font-serif text-lg font-extrabold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><div className="divide-y">{children}</div></section>; }
function ToggleRow({ label, detail, value, onToggle }: { label: string; detail: string; value: boolean; onToggle: () => void }) { return <div className="flex items-center gap-4 px-5 py-4"><div className="min-w-0 flex-1"><div className="text-sm font-bold">{label}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div><button role="switch" aria-checked={value} data-testid={`toggle-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={onToggle} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>; }

function Router() { return <ErrorBoundary><Switch><Route path="/" component={Overview} /><Route path="/wildshield" component={WildShieldPage} /><Route path="/zones" component={Zones} /><Route path="/observations" component={Observations} /><Route path="/alerts" component={Alerts} /><Route path="/settings" component={SettingsPage} /><Route component={NotFound} /></Switch></ErrorBoundary>; }

function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Shell><Router /></Shell></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;