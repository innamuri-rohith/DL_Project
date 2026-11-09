import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Compass, Radio, AlertTriangle, Clock, MapPin, Send, Zap,
  Navigation, CheckCircle2, Shield, Eye, Droplets, Satellite,
  Trees, ArrowUpRight, Flame, Layers, Play, Check
} from 'lucide-react';

interface HabitatStressData {
  engine: string;
  timestamp: string;
  globalDisplacementRisk: string;
  sectors: Array<{
    id: string;
    name: string;
    coordinates: [number, number];
    habitatStressIndex: number;
    displacementRisk: string;
    indicators: {
      forageNdvi: number;
      forageStatus: string;
      sarCanopyLossDb: number;
      sarStatus: string;
      waterbodyRetentionPct: number;
      waterStatus: string;
    };
    primaryMigrationDriver: string;
    predictedMigrationVector: {
      bearingDeg: number;
      headingText: string;
    };
  }>;
}

interface TrajectoryData {
  timestamp: string;
  activeVectorsCount: number;
  trajectories: Array<{
    id: string;
    species: string;
    trackingType: string;
    currentPosition: [number, number];
    speedKmh: number;
    speedMps: number;
    headingDeg: number;
    headingCardinal: string;
    kalmanState: {
      confidenceScore: number;
      lookaheadHorizonsMinutes: number[];
      forecastCoords: {
        t15: [number, number];
        t20: [number, number];
        t30: [number, number];
      };
    };
    predictedIntersection: {
      targetBuffer: string;
      bufferType: string;
      intersectionCoordinate: [number, number];
      distanceToIntersectionMeters: number;
      timeToImpactMinutes: number;
      timeToImpactFormatted: string;
      isImminentBreach: boolean;
      actionCode: string;
      tacticalDirective: string;
    };
  }>;
}

export function PredictiveTrajectory() {
  const queryClient = useQueryClient();
  const [selectedVectorIdx, setSelectedVectorIdx] = useState(0);
  const [selectedSectorIdx, setSelectedSectorIdx] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(18 * 60);
  const [isSimulatingPreBreach, setIsSimulatingPreBreach] = useState(false);
  const [lastDispatchedAlert, setLastDispatchedAlert] = useState<any>(null);

  // Custom forecast calculator state
  const [customLat, setCustomLat] = useState('11.305');
  const [customLon, setCustomLon] = useState('76.414');
  const [customSpeed, setCustomSpeed] = useState(4.8);
  const [customHeading, setCustomHeading] = useState(142);
  const [customResult, setCustomResult] = useState<any>(null);

  // Queries
  const stressQuery = useQuery<HabitatStressData>({
    queryKey: ['wildshield-habitat-stress'],
    queryFn: async () => {
      const res = await fetch('/api/wildshield/habitat-stress');
      if (!res.ok) throw new Error('Failed to fetch habitat stress data');
      return res.json();
    },
    refetchInterval: 15000,
  });

  const trajectoriesQuery = useQuery<TrajectoryData>({
    queryKey: ['wildshield-trajectories'],
    queryFn: async () => {
      const res = await fetch('/api/wildshield/trajectories');
      if (!res.ok) throw new Error('Failed to fetch trajectory predictions');
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Preemptive Simulation Mutation
  const preemptiveMutation = useMutation({
    mutationFn: async (scenario: string) => {
      setIsSimulatingPreBreach(true);
      const res = await fetch('/api/wildshield/simulate-preemptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      if (!res.ok) throw new Error('Preemptive simulation failed');
      return res.json();
    },
    onSuccess: (data) => {
      setIsSimulatingPreBreach(false);
      setLastDispatchedAlert(data);
      void queryClient.invalidateQueries({ queryKey: ['wildshield-dispatches'] });
      void queryClient.invalidateQueries({ queryKey: ['wildshield-overview'] });
    },
    onError: () => {
      setIsSimulatingPreBreach(false);
    },
  });

  // Custom prediction mutation
  const calculateMutation = useMutation({
    mutationFn: async (payload: { lat: number; lon: number; speedKmh: number; headingDeg: number }) => {
      const res = await fetch('/api/wildshield/predict-trajectory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Prediction calculation failed');
      return res.json();
    },
    onSuccess: (data) => {
      setCustomResult(data);
    },
  });

  // Live countdown timer for selected vector
  const selectedVector = trajectoriesQuery.data?.trajectories[selectedVectorIdx];
  useEffect(() => {
    if (selectedVector) {
      setTimerSeconds(Math.round(selectedVector.predictedIntersection.timeToImpactMinutes * 60));
    }
  }, [selectedVectorIdx, selectedVector]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sectors = stressQuery.data?.sectors ?? [];
  const activeSector = sectors[selectedSectorIdx] ?? sectors[0];
  const trajectories = trajectoriesQuery.data?.trajectories ?? [];
  const currentTraj = trajectories[selectedVectorIdx] ?? trajectories[0];

  return (
    <div className="space-y-6">
      {/* Top Banner: Predictive vs Reactive Paradigm */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[hsl(24_59%_12%)] via-[hsl(30_45%_14%)] to-[hsl(163_35%_14%)] p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md">
              <Compass className="h-3.5 w-3.5 animate-spin text-amber-400" />
              Kalman 2D Filter + Google Earth Engine Habitat Stress
            </div>
            <h2 className="mt-2 font-serif text-2xl font-extrabold tracking-tight md:text-3xl text-amber-100">
              Predictive Pre-Emption: 15–30m Trajectory & Satellite Stress Engine
            </h2>
            <p className="mt-1.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-amber-200/80">
              <strong>Predictive vs. Reactive Paradigm:</strong> Standard satellite systems report past destruction after animals cross boundaries. WildShield-AI projects vector trajectories 15 to 30 minutes into the future using Kalman filters and dynamic Shapely buffers, dispatching actionable SOP directives to field rangers <em>before</em> physical contact happens.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={preemptiveMutation.isPending}
              onClick={() => preemptiveMutation.mutate('village_breach')}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50 shadow-md"
            >
              <Zap size={14} className="fill-current" />
              Simulate Village Intercept (18m)
            </button>
            <button
              disabled={preemptiveMutation.isPending}
              onClick={() => preemptiveMutation.mutate('railway_collision')}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50 shadow-md"
            >
              <AlertTriangle size={14} />
              Simulate Railway Intercept (22m)
            </button>
            <button
              disabled={preemptiveMutation.isPending}
              onClick={() => preemptiveMutation.mutate('crop_raiding')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50 shadow-md"
            >
              <Trees size={14} />
              Simulate Crop Intercept (25m)
            </button>
          </div>
        </div>

        {/* Telemetry quick bar */}
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/10 pt-3 text-[11px] text-amber-200/90">
          <span className="flex items-center gap-1.5"><Radio size={14} className="text-emerald-400" /> Multi-Sensor GEE Sync: <strong>LIVE</strong></span>
          <span className="text-white/20">•</span>
          <span>Sentinel-1 SAR C-Band: <strong>Active (Cloud-Penetrating)</strong></span>
          <span className="text-white/20">•</span>
          <span>Kalman State Lookahead: <strong>t+15m, t+20m, t+30m</strong></span>
          <span className="text-white/20">•</span>
          <span>Shapely Dynamic Buffer Intersect: <strong>GeoPandas Active</strong></span>
        </div>
      </div>

      {/* Main Grid: Left = Visual Trajectory Radar & Buffers | Right = GEE Habitat Stress */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_.95fr]">
        
        {/* LEFT COLUMN: Kalman Trajectory Vector Visualizer & Dynamic Buffers */}
        <div className="space-y-6">
          <div className="panel overflow-hidden">
            {/* Header with active vector selector */}
            <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="eyebrow flex items-center gap-1 text-primary">
                  <Navigation size={12} /> Kalman Filter Dynamic Projection
                </span>
                <h3 className="font-serif text-lg font-bold">15–30 Minute Future Trajectory & Buffer Cut</h3>
              </div>

              {/* Vector switcher */}
              <div className="flex gap-1.5 rounded-xl bg-muted/60 p-1">
                {trajectories.map((traj, idx) => (
                  <button
                    key={traj.id}
                    onClick={() => setSelectedVectorIdx(idx)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      selectedVectorIdx === idx
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {idx === 0 ? '🐘 Matriarch Herd' : '🚂 Tusker Bull'}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Radar / Trajectory Canvas (SVG) */}
            <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/40 p-4 text-white">
              {/* Radar Coordinate Grid */}
              <div className="relative flex justify-center">
                <svg
                  viewBox="0 0 650 420"
                  className="w-full max-w-[650px] rounded-2xl border border-emerald-500/20 bg-slate-950/80 shadow-2xl"
                >
                  <defs>
                    <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="hsl(163 48% 40% / 0.15)" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    </pattern>
                  </defs>

                  {/* Grid background */}
                  <rect width="650" height="420" fill="url(#gridPattern)" />
                  <rect width="650" height="420" fill="url(#radarGlow)" />

                  {/* Range Rings from Reserve Center */}
                  <circle cx="325" cy="210" r="80" fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeDasharray="3 3" />
                  <circle cx="325" cy="210" r="150" fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeDasharray="3 3" />
                  <circle cx="325" cy="210" r="210" fill="none" stroke="rgba(16, 185, 129, 0.1)" strokeDasharray="4 4" />

                  {/* Geofence / Buffer 1: Mukurthi Tea Estate Settlement (Village Perimeter Buffer) */}
                  <g className="cursor-pointer">
                    {/* Outer 500m Buffer Zone */}
                    <polygon
                      points="370,180 520,150 560,260 410,290"
                      fill="rgba(245, 158, 11, 0.12)"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    {/* Inner Core Settlement */}
                    <polygon
                      points="400,195 500,175 530,245 430,265"
                      fill="rgba(239, 68, 68, 0.2)"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                    />
                    <text x="415" y="225" fill="#fef3c7" fontSize="11" fontWeight="bold">
                      Mukurthi Village
                    </text>
                    <text x="415" y="240" fill="#fcd34d" fontSize="9" opacity="0.85">
                      500m Defensive Buffer Ring
                    </text>
                  </g>

                  {/* Geofence / Buffer 2: Nilgiri Mountain Railway Corridor (KM 44-46) */}
                  <g>
                    {/* 300m Railway Corridor Buffer */}
                    <rect
                      x="160"
                      y="320"
                      width="360"
                      height="50"
                      transform="rotate(-15 340 345)"
                      fill="rgba(239, 68, 68, 0.12)"
                      stroke="#ef4444"
                      strokeWidth="1"
                      strokeDasharray="5 3"
                    />
                    {/* Railway Track Line */}
                    <line
                      x1="120"
                      y1="380"
                      x2="520"
                      y2="280"
                      stroke="#94a3b8"
                      strokeWidth="3"
                      strokeDasharray="8 4"
                    />
                    <text x="180" y="385" fill="#fca5a5" fontSize="10" fontWeight="bold">
                      🚂 Railway Track Corridor (KM 44-46)
                    </text>
                  </g>

                  {/* Geofence / Buffer 3: Attappady Agricultural Farmland */}
                  <g>
                    <polygon
                      points="70,140 180,120 210,220 100,240"
                      fill="rgba(34, 197, 94, 0.12)"
                      stroke="#22c55e"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <text x="95" y="180" fill="#86efac" fontSize="10" fontWeight="bold">
                      🌾 Sugarcane Farmland
                    </text>
                  </g>

                  {/* Dynamic Trajectory Vector Visualization */}
                  {selectedVectorIdx === 0 ? (
                    // Vector 1: Elephant Herd heading Southeast towards Mukurthi Buffer
                    <g>
                      {/* Past Path Trail */}
                      <circle cx="160" cy="110" r="3" fill="#6ee7b7" opacity="0.4" />
                      <circle cx="190" cy="130" r="3.5" fill="#6ee7b7" opacity="0.6" />
                      <circle cx="220" cy="150" r="4" fill="#6ee7b7" opacity="0.8" />
                      <line x1="160" y1="110" x2="250" y2="170" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />

                      {/* Current Animal Position (t0) */}
                      <g transform="translate(250, 170)">
                        <circle r="22" fill="rgba(16, 185, 129, 0.2)" className="animate-ping" />
                        <circle r="14" fill="#047857" stroke="#34d399" strokeWidth="2.5" />
                        <text x="0" y="4" textAnchor="middle" fontSize="12">🐘</text>
                      </g>
                      <text x="270" y="165" fill="#a7f3d0" fontSize="11" fontWeight="bold">
                        Current: Matriarch Herd (9)
                      </text>
                      <text x="270" y="180" fill="#6ee7b7" fontSize="9">
                        4.8 km/h · Heading 142° SE
                      </text>

                      {/* Projected Trajectory Vector Ray */}
                      <line
                        x1="250"
                        y1="170"
                        x2="480"
                        y2="285"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                      />

                      {/* Forecast Node: t + 15m */}
                      <g transform="translate(340, 215)">
                        <circle r="6" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.5" />
                        <text x="8" y="4" fill="#fde68a" fontSize="10" fontWeight="bold">t+15m</text>
                      </g>

                      {/* PREDICTED INTERSECTION POINT (t + 18m) on Buffer Border */}
                      <g transform="translate(372, 231)">
                        <circle r="18" fill="rgba(239, 68, 68, 0.3)" className="animate-ping" />
                        <circle r="9" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                        <circle r="3" fill="#ffffff" />
                        <text x="14" y="-5" fill="#fca5a5" fontSize="11" fontWeight="bold">
                          🚨 PREDICTED BUFFER BREACH: t+18m
                        </text>
                        <text x="14" y="8" fill="#fecaca" fontSize="9">
                          Lat: 11.2982, Lon: 76.4218
                        </text>
                      </g>

                      {/* Forecast Node: t + 20m */}
                      <g transform="translate(390, 240)">
                        <circle r="5" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.5" />
                        <text x="8" y="4" fill="#fde68a" fontSize="10">t+20m</text>
                      </g>

                      {/* Forecast Node: t + 30m */}
                      <g transform="translate(460, 275)">
                        <circle r="5" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.5" opacity="0.7" />
                        <text x="8" y="4" fill="#fde68a" fontSize="10" opacity="0.8">t+30m</text>
                      </g>
                    </g>
                  ) : (
                    // Vector 2: Tusker Bull heading towards Railway Track (KM 44-46)
                    <g>
                      {/* Past Path Trail */}
                      <circle cx="150" cy="220" r="3" fill="#f59e0b" opacity="0.4" />
                      <circle cx="180" cy="240" r="3.5" fill="#f59e0b" opacity="0.6" />
                      <circle cx="210" cy="260" r="4" fill="#f59e0b" opacity="0.8" />
                      <line x1="150" y1="220" x2="240" y2="280" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" />

                      {/* Current Animal Position (t0) */}
                      <g transform="translate(240, 280)">
                        <circle r="22" fill="rgba(245, 158, 11, 0.2)" className="animate-ping" />
                        <circle r="14" fill="#b45309" stroke="#fcd34d" strokeWidth="2.5" />
                        <text x="0" y="4" textAnchor="middle" fontSize="12">🐘</text>
                      </g>
                      <text x="260" y="275" fill="#fef3c7" fontSize="11" fontWeight="bold">
                        Current: Tusker Bull
                      </text>
                      <text x="260" y="290" fill="#fde68a" fontSize="9">
                        5.2 km/h · Heading 78° ENE
                      </text>

                      {/* Projected Trajectory Vector Ray */}
                      <line
                        x1="240"
                        y1="280"
                        x2="450"
                        y2="330"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                      />

                      {/* Forecast Node: t + 15m */}
                      <g transform="translate(320, 299)">
                        <circle r="6" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.5" />
                        <text x="-15" y="-10" fill="#fde68a" fontSize="10" fontWeight="bold">t+15m</text>
                      </g>

                      {/* PREDICTED INTERSECTION POINT (t + 22m) on Railway Track */}
                      <g transform="translate(375, 312)">
                        <circle r="18" fill="rgba(239, 68, 68, 0.35)" className="animate-ping" />
                        <circle r="9" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
                        <circle r="3" fill="#ffffff" />
                        <text x="-40" y="28" fill="#fca5a5" fontSize="11" fontWeight="bold">
                          🚨 RAILWAY COLLISION INTERSECT: t+22m
                        </text>
                        <text x="-30" y="40" fill="#fecaca" fontSize="9">
                          KM 44-46 · Lat: 11.2925, Lon: 76.4210
                        </text>
                      </g>

                      {/* Forecast Node: t + 30m */}
                      <g transform="translate(420, 323)">
                        <circle r="5" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.5" opacity="0.7" />
                        <text x="8" y="4" fill="#fde68a" fontSize="10" opacity="0.8">t+30m</text>
                      </g>
                    </g>
                  )}
                </svg>
              </div>

              {/* T-Minus Impact Countdown Box */}
              <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-slate-900/90 p-4 sm:flex-row">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                    <Clock size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                      Predictive Pre-Breach Clock
                    </div>
                    <div className="text-sm font-bold text-white">
                      Target: {currentTraj?.predictedIntersection.targetBuffer}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center sm:text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Time to Buffer Impact
                    </div>
                    <div className="data-mono text-3xl font-extrabold text-amber-400">
                      T-MINUS {formatCountdown(timerSeconds)}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      preemptiveMutation.mutate(
                        selectedVectorIdx === 0 ? 'village_breach' : 'railway_collision'
                      )
                    }
                    disabled={preemptiveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    <Send size={14} />
                    Dispatch Pre-Breach
                  </button>
                </div>
              </div>
            </div>

            {/* Trajectory Vector Telemetry Bar */}
            <div className="grid grid-cols-2 gap-3 border-t bg-card p-4 sm:grid-cols-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Speed / Telemetry</span>
                <span className="font-bold data-mono text-sm">{currentTraj?.speedKmh} km/h</span>
                <span className="text-muted-foreground ml-1">({currentTraj?.speedMps} m/s)</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Bearing / Heading</span>
                <span className="font-bold data-mono text-sm">{currentTraj?.headingCardinal}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Kalman Confidence</span>
                <span className="font-bold data-mono text-sm text-emerald-600 dark:text-emerald-400">
                  {currentTraj?.kalmanState.confidenceScore}% Lookahead
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Distance to Buffer</span>
                <span className="font-bold data-mono text-sm text-amber-600 dark:text-amber-400">
                  {currentTraj?.predictedIntersection.distanceToIntersectionMeters} meters
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Trajectory On-Demand Forecast Calculator */}
          <div className="panel p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="eyebrow flex items-center gap-1 text-primary">
                  <Compass size={12} /> Custom Kalman Projection
                </span>
                <h3 className="font-serif text-base font-bold">Simulate Custom Animal Vector & Future Coordinates</h3>
              </div>
              <button
                onClick={() =>
                  calculateMutation.mutate({
                    lat: Number(customLat),
                    lon: Number(customLon),
                    speedKmh: Number(customSpeed),
                    headingDeg: Number(customHeading),
                  })
                }
                disabled={calculateMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                <Play size={12} /> Calculate 15m / 20m / 30m
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Start Latitude</label>
                <input
                  type="text"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-1.5 text-xs data-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Start Longitude</label>
                <input
                  type="text"
                  value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-1.5 text-xs data-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Speed: <span className="text-foreground font-bold">{customSpeed} km/h</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={customSpeed}
                  onChange={(e) => setCustomSpeed(Number(e.target.value))}
                  className="mt-2 w-full accent-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Heading: <span className="text-foreground font-bold">{customHeading}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={customHeading}
                  onChange={(e) => setCustomHeading(Number(e.target.value))}
                  className="mt-2 w-full accent-primary"
                />
              </div>
            </div>

            {/* Custom Projection Results */}
            {customResult && (
              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs">
                <div className="flex items-center justify-between font-bold text-primary">
                  <span>Forecast Projections (Calculated via 2D Geodesic Kalman Filter)</span>
                  <span>Impact Est: {customResult.timeToImpactMinutes} mins</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center data-mono">
                  <div className="rounded-xl border bg-card p-2">
                    <span className="block text-[10px] text-muted-foreground font-sans">t + 15 min</span>
                    <strong>{customResult.forecasts.t15[0]}, {customResult.forecasts.t15[1]}</strong>
                  </div>
                  <div className="rounded-xl border bg-card p-2">
                    <span className="block text-[10px] text-muted-foreground font-sans">t + 20 min</span>
                    <strong>{customResult.forecasts.t20[0]}, {customResult.forecasts.t20[1]}</strong>
                  </div>
                  <div className="rounded-xl border bg-card p-2">
                    <span className="block text-[10px] text-muted-foreground font-sans">t + 30 min</span>
                    <strong>{customResult.forecasts.t30[0]}, {customResult.forecasts.t30[1]}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Google Earth Engine Habitat Stress & Actionable Telegram Dispatch Card */}
        <div className="space-y-6">

          {/* GEE Habitat Stress Map Card */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="eyebrow flex items-center gap-1 text-primary">
                  <Satellite size={12} /> Google Earth Engine Multi-Sensor
                </span>
                <h3 className="font-serif text-lg font-bold">Habitat Stress & Displacement Map</h3>
              </div>
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                High Forced Migration Pressure
              </span>
            </div>

            {/* Sector Selector Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {sectors.map((sec, idx) => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectorIdx(idx)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                    selectedSectorIdx === idx
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {sec.name.split('&')[0]}
                </button>
              ))}
            </div>

            {/* Active Sector Indicators */}
            {activeSector && (
              <div className="space-y-4">
                {/* Habitat Stress Gauge */}
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Overall Habitat Stress Index</span>
                    <span className="data-mono text-xl font-extrabold text-rose-500">
                      {activeSector.habitatStressIndex}%
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 transition-all duration-500"
                      style={{ width: `${activeSector.habitatStressIndex}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    <strong>Forced Migration Driver:</strong> {activeSector.primaryMigrationDriver}
                  </p>
                </div>

                {/* Satellite Sensor Sub-Metrics */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {/* Forage NDVI */}
                  <div className="rounded-xl border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <Trees size={14} /> Forage Food (NDVI)
                    </div>
                    <div className="mt-1 data-mono text-lg font-extrabold">{activeSector.indicators.forageNdvi}</div>
                    <div className="text-[10px] text-muted-foreground">{activeSector.indicators.forageStatus}</div>
                  </div>

                  {/* SAR Canopy Loss */}
                  <div className="rounded-xl border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-bold">
                      <Satellite size={14} /> SAR Canopy Loss
                    </div>
                    <div className="mt-1 data-mono text-lg font-extrabold">{activeSector.indicators.sarCanopyLossDb} dB</div>
                    <div className="text-[10px] text-muted-foreground">{activeSector.indicators.sarStatus}</div>
                  </div>

                  {/* Waterbody Retention */}
                  <div className="rounded-xl border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                      <Droplets size={14} /> Waterbody (NDWI)
                    </div>
                    <div className="mt-1 data-mono text-lg font-extrabold">{activeSector.indicators.waterbodyRetentionPct}%</div>
                    <div className="text-[10px] text-muted-foreground">{activeSector.indicators.waterStatus}</div>
                  </div>
                </div>

                {/* Forced Migration Direction Vector */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                    <ArrowUpRight
                      size={20}
                      style={{ transform: `rotate(${activeSector.predictedMigrationVector.bearingDeg - 45}deg)` }}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Forced Migration Pressure Vector ({activeSector.predictedMigrationVector.bearingDeg}°)
                    </div>
                    <div className="text-xs font-semibold text-foreground">
                      {activeSector.predictedMigrationVector.headingText}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Structured Pre-Breach Telegram Alert Card Preview */}
          <div className="panel overflow-hidden border-2 border-emerald-500/30 shadow-lg">
            {/* Telegram Header */}
            <div className="flex items-center justify-between bg-[#229ED9] px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                  <Send size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    @WildShield_Ranger_Bot <Check size={12} className="stroke-[3]" />
                  </div>
                  <div className="text-[9px] text-white/80">Automated Dispatch Channel</div>
                </div>
              </div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                Pre-Breach SOP
              </span>
            </div>

            {/* Telegram Message Body */}
            <div className="bg-slate-900 p-4 text-xs font-sans text-slate-100 space-y-3 leading-relaxed">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-mono text-amber-400 font-bold">🔮 PRE-BREACH PREDICTIVE DISPATCH</span>
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                  P1 PRE-EMPTION
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div>
                  <strong className="text-slate-400">Target Species:</strong>{' '}
                  <span className="text-white font-bold">{currentTraj?.species}</span>
                </div>
                <div>
                  <strong className="text-slate-400">Vector Telemetry:</strong>{' '}
                  <span className="font-mono text-emerald-400">{currentTraj?.speedKmh} km/h</span> · Heading{' '}
                  <span className="font-mono text-emerald-400">{currentTraj?.headingCardinal}</span>
                </div>
                <div>
                  <strong className="text-slate-400">Threatened Perimeter:</strong>{' '}
                  <span className="text-white">{currentTraj?.predictedIntersection.targetBuffer}</span>
                </div>
              </div>

              {/* Time to Impact Highlight */}
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <AlertTriangle size={14} /> PREDICTED IMPACT IN {currentTraj?.predictedIntersection.timeToImpactFormatted}
                </div>
                <div className="mt-1 text-[11px] text-amber-200">
                  Breach point: Lat {currentTraj?.predictedIntersection.intersectionCoordinate[0]}, Lon {currentTraj?.predictedIntersection.intersectionCoordinate[1]}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${currentTraj?.predictedIntersection.intersectionCoordinate[0]},${currentTraj?.predictedIntersection.intersectionCoordinate[1]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 underline hover:text-blue-300"
                >
                  <MapPin size={11} /> Open Predicted Crossing Coordinates on Google Maps
                </a>
              </div>

              {/* Preventative Tactical SOP Directive */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-[11px]">
                <strong className="text-emerald-400 block font-bold">Tactical Preventative Directive:</strong>
                <p className="mt-1 text-emerald-100">{currentTraj?.predictedIntersection.tacticalDirective}</p>
                <div className="mt-2 text-[10px] text-slate-400">
                  • Mobilize deterrent squad to intercept coordinates prior to arrival<br />
                  • Alert village panchayat / railway control room immediately
                </div>
              </div>

              {/* Trigger Button inside Card */}
              <button
                onClick={() =>
                  preemptiveMutation.mutate(
                    selectedVectorIdx === 0 ? 'village_breach' : 'railway_collision'
                  )
                }
                disabled={preemptiveMutation.isPending}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-center text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={13} />
                {preemptiveMutation.isPending ? 'Routing to Telegram...' : 'Trigger Live Pre-Breach Dispatch'}
              </button>

              {lastDispatchedAlert && (
                <div className="rounded-xl bg-emerald-900/60 p-2 text-center text-[10px] text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={13} /> Alert routed to Telegram Ranger Dispatch channel!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
