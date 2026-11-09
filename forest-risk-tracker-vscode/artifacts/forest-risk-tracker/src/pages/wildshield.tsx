import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, Radio, Send, Crosshair, MapPin, Eye, Flame, Trees,
  CheckCircle2, AlertOctagon, PhoneCall, MessageSquare, Compass,
  Layers, Users, Activity, Play, RefreshCw, X, ExternalLink, ChevronRight, Zap
} from 'lucide-react';
import { PredictiveTrajectory } from '../components/predictive-trajectory';

interface GeofenceItem {
  id: number;
  name: string;
  type: string;
  riskLevel: string;
  bufferMeters: number;
  population: number;
  centerCoordinates: [number, number];
  boundaryCoordinates: [number, number][];
  updatedAt: string;
}

interface ThreatDetection {
  id: number;
  source: string;
  model: string;
  target: string;
  confidence: number;
  threatLevel: string;
  location: string;
  coordinates: [number, number];
  boundingBoxes: Array<{ label: string; conf: number; box: [number, number, number, number] }> | null;
  details: string;
  nearestGeofence: string | null;
  geofenceDistanceMeters: number | null;
  detectedAt: string;
}

interface RangerDispatchItem {
  id: number;
  channel: string;
  recipient: string;
  severity: string;
  headline: string;
  payload: string;
  location: string;
  coordinates: [number, number];
  assignedUnit: string;
  etaMinutes: number;
  status: 'dispatched' | 'acknowledged' | 'en_route' | 'resolved';
  dispatchedAt: string;
  acknowledgedAt: string | null;
}

interface WildShieldOverview {
  activeGeofences: number;
  activeBreaches: number;
  totalThreats: number;
  activeDispatches: number;
  totalDispatches: number;
  camerasOnline: number;
  models: Array<{ name: string; version: string; status: string; type: string }>;
  lastUpdated: string;
}

export default function WildShieldPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'geofence' | 'threats' | 'dispatches' | 'predictive'>('geofence');
  const [threatModelTab, setThreatModelTab] = useState<'yolo' | 'unet' | 'rf'>('yolo');
  const [selectedFence, setSelectedFence] = useState<GeofenceItem | null>(null);
  const [evalCoords, setEvalCoords] = useState<{ lat: string; lon: string }>({ lat: '11.3025', lon: '76.4162' });
  const [evalResult, setEvalResult] = useState<any>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    channel: 'telegram',
    recipient: '@WildShield_Ranger_Bot',
    severity: 'critical',
    headline: '',
    payload: '',
    location: 'Mukurthi Tea Estate Buffer',
    lat: '11.3025',
    lon: '76.4162',
    assignedUnit: 'Quick Response Team 4',
  });

  // Queries
  const overviewQuery = useQuery<WildShieldOverview>({
    queryKey: ['wildshield-overview'],
    queryFn: async () => {
      const res = await fetch('/api/wildshield/overview');
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const geofencesQuery = useQuery<GeofenceItem[]>({
    queryKey: ['wildshield-geofences'],
    queryFn: async () => {
      const res = await fetch('/api/wildshield/geofences');
      if (!res.ok) throw new Error('Failed to fetch geofences');
      return res.json();
    },
  });

  const threatsQuery = useQuery<ThreatDetection[]>({
    queryKey: ['wildshield-threats'],
    queryFn: async () => {
      const res = await fetch('/api/wildshield/threats');
      if (!res.ok) throw new Error('Failed to fetch threats');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const dispatchesQuery = useQuery<RangerDispatchItem[]>({
    queryKey: ['wildshield-dispatches'],
    queryFn: async () => {
      const res = await fetch('/api/wildshield/dispatches');
      if (!res.ok) throw new Error('Failed to fetch dispatches');
      return res.json();
    },
    refetchInterval: 8000,
  });

  // Mutations
  const evaluateMutation = useMutation({
    mutationFn: async ({ lat, lon }: { lat: number; lon: number }) => {
      const res = await fetch('/api/wildshield/geofences/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }),
      });
      if (!res.ok) throw new Error('Evaluation failed');
      return res.json();
    },
    onSuccess: (data) => {
      setEvalResult(data);
    },
  });

  const simulateMutation = useMutation({
    mutationFn: async (scenario: string) => {
      const res = await fetch('/api/wildshield/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      if (!res.ok) throw new Error('Simulation failed');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wildshield-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['wildshield-threats'] });
      void queryClient.invalidateQueries({ queryKey: ['wildshield-dispatches'] });
      setActiveTab('dispatches');
    },
  });

  const updateDispatchMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/wildshield/dispatches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Status update failed');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wildshield-dispatches'] });
      void queryClient.invalidateQueries({ queryKey: ['wildshield-overview'] });
    },
  });

  const createDispatchMutation = useMutation({
    mutationFn: async (payload: typeof dispatchForm) => {
      const res = await fetch('/api/wildshield/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          coordinates: [Number(payload.lat), Number(payload.lon)],
        }),
      });
      if (!res.ok) throw new Error('Dispatch failed');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wildshield-dispatches'] });
      void queryClient.invalidateQueries({ queryKey: ['wildshield-overview'] });
      setIsDispatchModalOpen(false);
    },
  });

  const overview = overviewQuery.data;
  const geofences = geofencesQuery.data ?? [];
  const threats = threatsQuery.data ?? [];
  const dispatches = dispatchesQuery.data ?? [];

  // Map coordinates projection for SVG visualization (Sierra Verde / Nilgiri local bounds)
  // Lat range: 11.26 to 11.33, Lon range: 76.38 to 76.47
  const minLat = 11.26, maxLat = 11.33;
  const minLon = 76.38, maxLon = 76.47;
  const projectX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * 600;
  const projectY = (lat: number) => 400 - ((lat - minLat) / (maxLat - minLat)) * 400;

  return (
    <div className="animate-[fade-in_.3s_ease-out] space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-[hsl(163_48%_12%)] via-[hsl(163_34%_18%)] to-[hsl(201_35%_18%)] p-6 text-white shadow-xl md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
              WildShield-AI Active Response Engine
            </div>
            <h1 className="mt-3 font-serif text-3xl font-extrabold tracking-tight md:text-4xl">
              Real-Time Geofencing & Ranger Dispatch
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
              Autonomous defense pipeline bridging macro-satellite models (U-Net & Random Forest), micro-animal vision (YOLOv8/MegaDetector), and instant Telegram/SMS dispatch to field rangers.
            </p>
          </div>

          {/* Incident Quick Simulation Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <button
              disabled={simulateMutation.isPending}
              onClick={() => simulateMutation.mutate('elephant_hwc')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              <ShieldAlert size={16} />
              Simulate Elephant Breach
            </button>
            <button
              disabled={simulateMutation.isPending}
              onClick={() => simulateMutation.mutate('poacher_intrusion')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              <AlertOctagon size={16} />
              Simulate Poacher Intrusion
            </button>
            <button
              disabled={simulateMutation.isPending}
              onClick={() => simulateMutation.mutate('canopy_chainsaw')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <Trees size={16} />
              Simulate U-Net Canopy Loss
            </button>
            <button
              onClick={() => setActiveTab('predictive')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-xs font-extrabold text-slate-950 transition hover:brightness-110 shadow-lg"
            >
              <Zap size={16} className="fill-current" />
              15–30m Pre-Breach Intercept
            </button>
          </div>
        </div>

        {/* Live Model Indicators Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-[11px] font-semibold text-white/70">
          <span className="flex items-center gap-1.5"><Radio size={14} className="text-emerald-400" /> Pipeline: <strong>ONLINE</strong></span>
          <span className="hidden sm:inline text-white/30">•</span>
          <span className="flex items-center gap-1.5"><strong>U-Net Canopy v3.2</strong> (Sentinel-2)</span>
          <span className="hidden sm:inline text-white/30">•</span>
          <span className="flex items-center gap-1.5"><strong>Random Forest Fire v2.1</strong> (Thermal + ERA5)</span>
          <span className="hidden sm:inline text-white/30">•</span>
          <span className="flex items-center gap-1.5"><strong>YOLOv8x-MegaDetector v5b</strong> (Vision)</span>
          <span className="hidden sm:inline text-white/30">•</span>
          <span className="flex items-center gap-1.5"><strong>Shapely Engine</strong> (Spatial)</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Virtual Geofences</span>
            <Crosshair size={18} className="text-primary" />
          </div>
          <div className="mt-3 data-mono text-2xl font-bold">{overview?.activeGeofences ?? 4}</div>
          <p className="mt-1 text-xs text-muted-foreground">Settlement & road safety zones</p>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Active Breaches</span>
            <AlertOctagon size={18} className="text-[hsl(var(--accent))]" />
          </div>
          <div className="mt-3 data-mono text-2xl font-bold text-[hsl(var(--accent))]">
            {overview?.activeBreaches ?? 1}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Within defensive buffer rings</p>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Multimodal Threats</span>
            <Eye size={18} className="text-blue-500" />
          </div>
          <div className="mt-3 data-mono text-2xl font-bold">{overview?.totalThreats ?? 3}</div>
          <p className="mt-1 text-xs text-muted-foreground">U-Net + RF + YOLOv8 signals</p>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Ranger Dispatches</span>
            <Send size={18} className="text-emerald-500" />
          </div>
          <div className="mt-3 data-mono text-2xl font-bold">{overview?.activeDispatches ?? 2}</div>
          <p className="mt-1 text-xs text-muted-foreground">Active Telegram & SMS units</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('geofence')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'geofence' ? 'bg-primary text-primary-foreground shadow' : 'bg-card text-muted-foreground hover:bg-muted'}`}
          >
            <Compass size={15} />
            1. Real-Time Geofencing
          </button>
          <button
            onClick={() => setActiveTab('threats')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'threats' ? 'bg-primary text-primary-foreground shadow' : 'bg-card text-muted-foreground hover:bg-muted'}`}
          >
            <Layers size={15} />
            2. Multimodal Threat Detection
          </button>
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'dispatches' ? 'bg-primary text-primary-foreground shadow' : 'bg-card text-muted-foreground hover:bg-muted'}`}
          >
            <Radio size={15} />
            3. Automated Action Pipeline ({dispatches.length})
          </button>
          <button
            onClick={() => setActiveTab('predictive')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === 'predictive' ? 'bg-primary text-primary-foreground shadow' : 'bg-card text-muted-foreground hover:bg-muted'}`}
          >
            <Zap size={15} className={activeTab === 'predictive' ? 'text-amber-300' : 'text-amber-500'} />
            4. Predictive Trajectory & GEE Stress
          </button>
        </div>

        {activeTab === 'dispatches' && (
          <button
            onClick={() => setIsDispatchModalOpen(true)}
            className="hidden items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow sm:inline-flex hover:opacity-90"
          >
            <Send size={13} />
            Manual Dispatch
          </button>
        )}
      </div>

      {/* TAB 1: Real-Time Geofencing */}
      {activeTab === 'geofence' && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
          {/* Geofence Radar / Interactive SVG Visualizer */}
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="eyebrow">Shapely / GeoPandas Spatial Visualizer</div>
                <h2 className="mt-1 font-serif text-lg font-extrabold">Live Boundary Radar & Buffers</h2>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Settlement</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Road Strip</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Core Sanctuary</span>
              </div>
            </div>

            {/* SVG Interactive Geofence Map */}
            <div className="relative h-[380px] w-full bg-[hsl(163_32%_10%)] p-2">
              <svg viewBox="0 0 600 400" className="h-full w-full">
                {/* Background Grid */}
                <defs>
                  <pattern id="radarGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="hsl(163 20% 20%)" strokeWidth="0.5" />
                  </pattern>
                  <radialGradient id="bufferGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(24 59% 54%)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(24 59% 54%)" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#radarGrid)" />

                {/* Draw Geofences */}
                {geofences.map((fence) => {
                  const pts = fence.boundaryCoordinates.map(([lat, lon]) => `${projectX(lon)},${projectY(lat)}`).join(' ');
                  const cx = projectX(fence.centerCoordinates[1]);
                  const cy = projectY(fence.centerCoordinates[0]);
                  const isSettlement = fence.type === 'settlement';
                  const isRoad = fence.type === 'road';
                  const isCore = fence.type === 'core_reserve';

                  return (
                    <g key={fence.id} className="cursor-pointer" onClick={() => setSelectedFence(fence)}>
                      {/* Concentric Buffer Rings for Settlements */}
                      {isSettlement && (
                        <>
                          <circle cx={cx} cy={cy} r="65" fill="url(#bufferGlow)" />
                          <circle cx={cx} cy={cy} r="65" fill="none" stroke="hsl(24 80% 50%)" strokeWidth="1" strokeDasharray="4 4" className="animate-pulse" />
                          <circle cx={cx} cy={cy} r="40" fill="none" stroke="hsl(0 80% 55%)" strokeWidth="1" strokeDasharray="2 2" />
                        </>
                      )}

                      {/* Polygon or Line */}
                      {isRoad ? (
                        <polyline points={pts} fill="none" stroke="hsl(43 85% 60%)" strokeWidth="3" strokeLinecap="round" />
                      ) : (
                        <polygon
                          points={pts}
                          fill={isSettlement ? 'hsl(24 59% 54% / 0.35)' : isCore ? 'hsl(163 48% 30% / 0.3)' : 'hsl(201 35% 49% / 0.3)'}
                          stroke={isSettlement ? 'hsl(24 80% 55%)' : isCore ? 'hsl(163 60% 45%)' : 'hsl(201 50% 60%)'}
                          strokeWidth="1.8"
                        />
                      )}

                      {/* Settlement Pin & Label */}
                      <circle cx={cx} cy={cy} r="4" fill={isSettlement ? 'hsl(24 80% 55%)' : 'hsl(163 60% 55%)'} />
                      <text x={cx + 7} y={cy + 3} fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                        {fence.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}

                {/* Threat / Incident Live Markers */}
                {threats.map((threat) => {
                  const tx = projectX(threat.coordinates[1]);
                  const ty = projectY(threat.coordinates[0]);
                  const isCritical = threat.threatLevel === 'critical';

                  return (
                    <g key={threat.id} className="cursor-pointer">
                      <circle cx={tx} cy={ty} r="8" fill={isCritical ? 'hsl(0 80% 55% / 0.3)' : 'hsl(43 85% 60% / 0.3)'} className="animate-ping" />
                      <circle cx={tx} cy={ty} r="5" fill={isCritical ? 'hsl(0 85% 55%)' : 'hsl(43 85% 60%)'} stroke="white" strokeWidth="1" />
                      <text x={tx + 8} y={ty - 6} fill={isCritical ? '#ff6b6b' : '#feca57'} fontSize="9" fontWeight="bold">
                        {threat.target.includes('Elephant') ? '🐘 Elephant (380m)' : threat.target.includes('Poacher') ? '🦹 Poacher' : '🚨 Threat'}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-[10px] text-white/80 backdrop-blur">
                Click any zone polygon to inspect coordinates & buffer status
              </div>
            </div>

            {/* Selected Geofence Detail Drawer / Footer */}
            {selectedFence && (
              <div className="border-t bg-muted/30 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {selectedFence.type}
                    </span>
                    <h3 className="mt-1 font-serif text-base font-extrabold">{selectedFence.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Buffer Radius: {selectedFence.bufferMeters}m · Population at risk: {selectedFence.population || '0 (Corridor Zone)'}
                    </p>
                  </div>
                  <button onClick={() => setSelectedFence(null)} className="rounded p-1 hover:bg-muted"><X size={16} /></button>
                </div>
              </div>
            )}
          </div>

          {/* Coordinate Evaluator & Geofence List */}
          <div className="space-y-4">
            {/* Coordinate Conflict Evaluator Form */}
            <div className="panel p-5">
              <div className="eyebrow">Real-Time Geofence Evaluator</div>
              <h3 className="mt-1 font-serif text-base font-extrabold">Test Entity Coordinates</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Run ray-casting & Shapely distance math to determine if a point breaches settlement safety boundaries.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold">
                  Latitude
                  <input
                    type="text"
                    value={evalCoords.lat}
                    onChange={(e) => setEvalCoords((c) => ({ ...c, lat: e.target.value }))}
                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs font-mono"
                  />
                </label>
                <label className="text-[11px] font-bold">
                  Longitude
                  <input
                    type="text"
                    value={evalCoords.lon}
                    onChange={(e) => setEvalCoords((c) => ({ ...c, lon: e.target.value }))}
                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs font-mono"
                  />
                </label>
              </div>

              <button
                disabled={evaluateMutation.isPending}
                onClick={() => evaluateMutation.mutate({ lat: Number(evalCoords.lat), lon: Number(evalCoords.lon) })}
                className="mt-3 w-full rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {evaluateMutation.isPending ? 'Calculating...' : 'Evaluate Proximity & Conflict'}
              </button>

              {/* Evaluation Result */}
              {evalResult && (
                <div className={`mt-4 rounded-xl border p-3 ${evalResult.hasBreach ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Nearest: {evalResult.nearest?.name}</span>
                    <span className="uppercase text-[10px]">{evalResult.nearest?.status}</span>
                  </div>
                  <div className="mt-2 data-mono text-xl font-bold">
                    {evalResult.nearest?.distanceMeters} meters away
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {evalResult.hasBreach ? '⚠️ Inside defensive safety buffer! Automatic dispatch triggered.' : '✅ Entity is beyond safety buffer perimeter.'}
                  </p>
                </div>
              )}
            </div>

            {/* Geofences List */}
            <div className="panel divide-y">
              <div className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Registered Boundaries ({geofences.length})
              </div>
              {geofences.map((fence) => (
                <div key={fence.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition">
                  <div>
                    <div className="text-sm font-bold">{fence.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {fence.type} · Buffer: {fence.bufferMeters}m · {fence.population ? `${fence.population} residents` : 'Wildlife path'}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${fence.riskLevel === 'critical' ? 'bg-rose-500/20 text-rose-600' : 'bg-emerald-500/20 text-emerald-600'}`}>
                    {fence.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Multimodal Threat Detection */}
      {activeTab === 'threats' && (
        <div className="space-y-6">
          {/* Sub-tabs for Model Inspector */}
          <div className="flex gap-2">
            <button
              onClick={() => setThreatModelTab('yolo')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${threatModelTab === 'yolo' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              Micro-Vision: YOLOv8 / MegaDetector
            </button>
            <button
              onClick={() => setThreatModelTab('unet')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${threatModelTab === 'unet' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              Macro-Satellite: U-Net Canopy Loss
            </button>
            <button
              onClick={() => setThreatModelTab('rf')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${threatModelTab === 'rf' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
            >
              Macro-Satellite: Random Forest Wildfire
            </button>
          </div>

          {/* YOLOv8 / MegaDetector Vision Stream View */}
          {threatModelTab === 'yolo' && (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
              <div className="panel overflow-hidden">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <div className="eyebrow">Camera Trap & Drone Optical Feed</div>
                    <h3 className="mt-1 font-serif text-lg font-extrabold">YOLOv8x-MegaDetector Frame Analysis</h3>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-600">
                    <Crosshair size={12} /> Target Acquired
                  </span>
                </div>

                {/* Simulated Camera Trap Frame with Bounding Box */}
                <div className="relative h-72 w-full overflow-hidden bg-slate-950 p-4">
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage: 'radial-gradient(ellipse at 40% 50%, #1e3a29 0%, #06120b 100%)',
                    }}
                  />

                  {/* Synthetic bounding boxes */}
                  <div className="absolute inset-6 border border-dashed border-emerald-500/30">
                    {/* Elephant Box */}
                    <div className="absolute left-[20%] top-[25%] h-[55%] w-[45%] rounded border-2 border-emerald-400 bg-emerald-500/10 p-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <span className="inline-block rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-slate-950">
                        Asian Elephant: 96.2%
                      </span>
                    </div>

                    {/* Calf Box */}
                    <div className="absolute left-[68%] top-[45%] h-[35%] w-[25%] rounded border-2 border-amber-400 bg-amber-500/10 p-1">
                      <span className="inline-block rounded bg-amber-400 px-1 py-0.5 text-[9px] font-bold text-slate-950">
                        Calf: 91.0%
                      </span>
                    </div>
                  </div>

                  {/* Optical Telemetry HUD */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-[10px] text-emerald-400">
                    <span>CAM-TRAP-01 (Silent Valley North)</span>
                    <span>FPS: 28.4 · INFERENCE: 24ms</span>
                    <span>GPS: 11.3025, 76.4162</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x border-t p-4 text-center">
                  <div>
                    <div className="eyebrow">Target</div>
                    <div className="mt-1 font-bold text-xs sm:text-sm">Asian Elephant Herd</div>
                  </div>
                  <div>
                    <div className="eyebrow">Confidence</div>
                    <div className="mt-1 font-bold text-xs sm:text-sm text-emerald-600">96.2%</div>
                  </div>
                  <div>
                    <div className="eyebrow">Proximity Warning</div>
                    <div className="mt-1 font-bold text-xs sm:text-sm text-rose-600">380m to Village</div>
                  </div>
                </div>
              </div>

              {/* Detections Log */}
              <div className="panel divide-y">
                <div className="px-5 py-4">
                  <div className="eyebrow">Micro Vision Stream</div>
                  <h3 className="mt-1 font-serif text-base font-extrabold">Recent Camera Detections</h3>
                </div>
                {threats.map((threat) => (
                  <div key={threat.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">{threat.target}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${threat.threatLevel === 'critical' ? 'bg-rose-500/20 text-rose-600' : 'bg-amber-500/20 text-amber-600'}`}>
                        {threat.threatLevel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{threat.details}</p>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <span>Model: {threat.model}</span>
                      <span className="data-mono text-primary font-bold">{threat.confidence}% conf</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* U-Net Canopy Loss View */}
          {threatModelTab === 'unet' && (
            <div className="panel p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="eyebrow">Satellite Spectral Semantic Segmentation</div>
                  <h3 className="mt-1 font-serif text-2xl font-extrabold">U-Net Canopy Disturbance & Logging Scars</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                    Multi-spectral analysis compares Sentinel-2 Band 8 (NIR) and Band 11 (SWIR) reflectance over 14-day baselines to segment illegal canopy loss clusters before roads are widened.
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-right">
                  <div className="data-mono text-2xl font-bold text-emerald-600">14.2 ha</div>
                  <div className="text-[10px] font-bold uppercase text-emerald-600">Loss Segmented</div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border p-4">
                  <div className="eyebrow">NDVI Baseline Delta</div>
                  <div className="mt-2 text-xl font-bold text-rose-600">-14.2%</div>
                  <p className="mt-1 text-xs text-muted-foreground">Severe canopy depression</p>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="eyebrow">Disturbance Pattern</div>
                  <div className="mt-2 text-xl font-bold">Linear Clearing</div>
                  <p className="mt-1 text-xs text-muted-foreground">Matches illegal skid trail</p>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="eyebrow">Automated SOP</div>
                  <div className="mt-2 text-xl font-bold text-primary">Drone Overflight</div>
                  <p className="mt-1 text-xs text-muted-foreground">Falcon-01 queued for sweep</p>
                </div>
              </div>
            </div>
          )}

          {/* Random Forest Wildfire View */}
          {threatModelTab === 'rf' && (
            <div className="panel p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="eyebrow">Multi-Feature Meteorological Model</div>
                  <h3 className="mt-1 font-serif text-2xl font-extrabold">Random Forest Wildfire Danger Index</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                    Evaluates ERA5 thermal surface temperature, vapor pressure deficit, Keetch-Byram drought index, and wind vectors to compute probability of ignition and fire spread vectors.
                  </p>
                </div>
                <div className="rounded-2xl bg-rose-500/10 p-3 text-right">
                  <div className="data-mono text-2xl font-bold text-rose-600">84.0%</div>
                  <div className="text-[10px] font-bold uppercase text-rose-600">Ignition Risk</div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                <div className="rounded-xl border p-4">
                  <div className="eyebrow">Ambient Temp</div>
                  <div className="mt-2 text-xl font-bold">36.2 °C</div>
                  <p className="mt-1 text-xs text-muted-foreground">Above seasonal avg</p>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="eyebrow">Fuel Moisture</div>
                  <div className="mt-2 text-xl font-bold text-rose-600">18.4%</div>
                  <p className="mt-1 text-xs text-muted-foreground">Critically dry timber</p>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="eyebrow">Wind Vector</div>
                  <div className="mt-2 text-xl font-bold">24 km/h (NE)</div>
                  <p className="mt-1 text-xs text-muted-foreground">Spreads to Mukurthi</p>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="eyebrow">Forest Action</div>
                  <div className="mt-2 text-xl font-bold text-amber-600">Pre-Stage Tanker</div>
                  <p className="mt-1 text-xs text-muted-foreground">Northern Firebreak 03</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Automated Action Pipeline & Ranger Dispatch Channel */}
      {activeTab === 'dispatches' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="eyebrow">Live Incident Routing Queue</div>
              <h2 className="font-serif text-2xl font-extrabold">Telegram & SMS Ranger Dispatch Channel</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Autonomous field notifications triggered by geofence breaches and multimodal AI classifications.
              </p>
            </div>
            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:opacity-90"
            >
              <Send size={14} />
              Manual Alert Dispatch
            </button>
          </div>

          <div className="grid gap-5">
            {dispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className={`panel border-l-4 p-5 ${dispatch.severity === 'critical' ? 'border-l-rose-500' : 'border-l-amber-500'}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${dispatch.channel === 'telegram' ? 'bg-sky-500/20 text-sky-600' : 'bg-emerald-500/20 text-emerald-600'}`}>
                        {dispatch.channel === 'telegram' ? <MessageSquare size={11} className="inline mr-1" /> : <PhoneCall size={11} className="inline mr-1" />}
                        {dispatch.channel}
                      </span>
                      <h3 className="font-serif text-lg font-extrabold">{dispatch.headline}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                        {dispatch.severity}
                      </span>
                    </div>

                    {/* Formatted Channel Output Preview */}
                    <div className="rounded-xl border bg-card/80 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {dispatch.payload}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-muted-foreground pt-1">
                      <span className="flex items-center gap-1"><Users size={13} /> Assigned: <strong>{dispatch.assignedUnit}</strong></span>
                      <span className="flex items-center gap-1"><MapPin size={13} /> {dispatch.location}</span>
                      <span className="flex items-center gap-1"><Activity size={13} /> ETA: {dispatch.etaMinutes} mins</span>
                      <span className="flex items-center gap-1">Recipient: {dispatch.recipient}</span>
                    </div>
                  </div>

                  {/* Dispatch Action Progression Buttons */}
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${dispatch.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-600' : dispatch.status === 'en_route' ? 'bg-amber-500/20 text-amber-600' : dispatch.status === 'acknowledged' ? 'bg-sky-500/20 text-sky-600' : 'bg-rose-500/20 text-rose-600'}`}>
                      ● {dispatch.status.replace('_', ' ')}
                    </span>

                    <div className="flex items-center gap-2">
                      {dispatch.status === 'dispatched' && (
                        <button
                          disabled={updateDispatchMutation.isPending}
                          onClick={() => updateDispatchMutation.mutate({ id: dispatch.id, status: 'acknowledged' })}
                          className="rounded-lg border bg-card px-3 py-1.5 text-xs font-bold hover:bg-muted"
                        >
                          Acknowledge
                        </button>
                      )}
                      {dispatch.status === 'acknowledged' && (
                        <button
                          disabled={updateDispatchMutation.isPending}
                          onClick={() => updateDispatchMutation.mutate({ id: dispatch.id, status: 'en_route' })}
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                        >
                          Mark En Route
                        </button>
                      )}
                      {dispatch.status === 'en_route' && (
                        <button
                          disabled={updateDispatchMutation.isPending}
                          onClick={() => updateDispatchMutation.mutate({ id: dispatch.id, status: 'resolved' })}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                        >
                          <CheckCircle2 size={13} />
                          Resolve Incident
                        </button>
                      )}
                      {dispatch.status === 'resolved' && (
                        <span className="text-xs font-semibold text-emerald-600">Incident Closed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Predictive Trajectory & GEE Habitat Stress */}
      {activeTab === 'predictive' && <PredictiveTrajectory />}

      {/* Manual Dispatch Modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setIsDispatchModalOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl animate-[fade-in_.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">Ranger Operational Dispatch</div>
                <h3 className="mt-1 font-serif text-2xl font-extrabold">Send Live Field Alert</h3>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="rounded p-1.5 hover:bg-muted"><X size={18} /></button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createDispatchMutation.mutate(dispatchForm);
              }}
              className="mt-5 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">
                  Channel
                  <select
                    value={dispatchForm.channel}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, channel: e.target.value }))}
                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs"
                  >
                    <option value="telegram">Telegram Ranger Bot</option>
                    <option value="sms">SMS Satellite Handheld</option>
                  </select>
                </label>
                <label className="text-xs font-bold">
                  Severity
                  <select
                    value={dispatchForm.severity}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, severity: e.target.value }))}
                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs"
                  >
                    <option value="critical">Critical (P1)</option>
                    <option value="high">High (P2)</option>
                    <option value="medium">Medium (P3)</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-bold">
                Headline
                <input
                  required
                  placeholder="e.g. ELEPHANT HERD: Moving towards Mukurthi Sector 4"
                  value={dispatchForm.headline}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, headline: e.target.value }))}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs"
                />
              </label>

              <label className="block text-xs font-bold">
                Assigned Response Unit
                <input
                  required
                  placeholder="e.g. HWC Quick Response Team 4"
                  value={dispatchForm.assignedUnit}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, assignedUnit: e.target.value }))}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs"
                />
              </label>

              <label className="block text-xs font-bold">
                Dispatch Payload (Markdown / SMS text)
                <textarea
                  required
                  rows={4}
                  placeholder="Tactical directive, GPS location, SOP instructions..."
                  value={dispatchForm.payload}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, payload: e.target.value }))}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-xs font-mono"
                />
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  disabled={createDispatchMutation.isPending}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {createDispatchMutation.isPending ? 'Sending...' : 'Transmit Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
