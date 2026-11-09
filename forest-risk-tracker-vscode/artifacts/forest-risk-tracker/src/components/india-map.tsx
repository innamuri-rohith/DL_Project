import { useState } from 'react';
import { Flame, Trees, Bird, AlertTriangle, Crosshair, ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react';

export interface IndiaZone {
  id: number;
  name: string;
  state: string;
  stateCode: string;
  region: string;
  risk: number;
  riskType: string;
  change: number;
  area: number;
  coordinates: [number, number]; // [lat, lon]
  vegetation: {
    currentNdvi: number;
    baselineNdvi: number;
    canopyDensityPct: number;
    lossRate6mo: number;
    primaryDriver: string;
    unetStatus: string;
    history: Array<{ month: string; ndvi: number; canopy: number }>;
  };
  wildlife: {
    keySpecies: string[];
    activeSignals: number;
    lastSighting: string;
    corridorStatus: string;
    cameraTrapCode: string;
    movementHeading: string;
    threatDescription: string;
  };
  alerts: Array<{
    id: string;
    title: string;
    severity: string;
    signal: string;
    time: string;
  }>;
  humanDanger: {
    nearestSettlement: string;
    distanceMeters: number;
    populationAtRisk: number;
    hwcRiskLevel: string;
    conflictHistory: string;
    recommendedSOP: string;
    geofenceStatus: string;
  };
}

interface IndiaMapProps {
  zones: IndiaZone[];
  selectedZone: IndiaZone | null;
  onSelectZone: (zone: IndiaZone) => void;
}

export default function IndiaMap({ zones, selectedZone, onSelectZone }: IndiaMapProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [hoveredZone, setHoveredZone] = useState<IndiaZone | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // India geographic bounds
  // Longitude: 68°E to 97.5°E -> X: 30 to 570
  // Latitude: 8°N to 37°N -> Y: 560 to 10 (inverted)
  const minLon = 68.0, maxLon = 97.5;
  const minLat = 7.5, maxLat = 37.5;
  const mapW = 540, mapH = 560;
  const padX = 30, padY = 10;

  const projectX = (lon: number) => padX + ((lon - minLon) / (maxLon - minLon)) * mapW;
  const projectY = (lat: number) => padY + mapH - ((lat - minLat) / (maxLat - minLat)) * mapH;

  const filteredZones = zones.filter((z) => {
    if (filterType === 'all') return true;
    if (filterType === 'critical') return z.risk >= 80;
    if (filterType === 'hwc') return z.humanDanger.hwcRiskLevel === 'critical' || z.riskType === 'wildlife_conflict';
    return z.riskType === filterType;
  });

  const getPinColor = (zone: IndiaZone) => {
    if (zone.risk >= 85) return { fill: '#ef4444', glow: '#f87171', ring: 'rgba(239,68,68,0.3)' };
    if (zone.risk >= 75) return { fill: '#f59e0b', glow: '#fcd34d', ring: 'rgba(245,158,11,0.3)' };
    return { fill: '#10b981', glow: '#6ee7b7', ring: 'rgba(16,185,129,0.3)' };
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card shadow-xl">
      {/* Map Control Bar */}
      <div className="flex flex-col gap-3 border-b bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="eyebrow">National Ecological Intelligence Grid</span>
          </div>
          <h2 className="mt-1 font-serif text-lg font-extrabold">All-India Forest & Wildlife Danger Map</h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {[
            { id: 'all', label: `All Zones (${zones.length})` },
            { id: 'critical', label: 'Critical Risk' },
            { id: 'wildfire', label: 'Wildfire' },
            { id: 'deforestation', label: 'Deforestation' },
            { id: 'hwc', label: 'HWC Danger' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`rounded-lg px-2.5 py-1.5 transition ${filterType === item.id ? 'bg-primary text-primary-foreground shadow' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#060e14] via-[#071610] to-[#040f09]" style={{ minHeight: 560 }}>

        {/* Ocean / background texture */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, rgba(56,189,248,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.1) 0%, transparent 35%)',
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(16,185,129,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.25) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Zoom Controls */}
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-1.5 rounded-xl border border-white/15 bg-black/70 p-1.5 backdrop-blur">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))}
            className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
            className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-20 hidden rounded-2xl border border-white/15 bg-black/80 p-3.5 backdrop-blur sm:block text-[11px] text-white/80 space-y-1.5 shadow-2xl">
          <div className="font-serif text-xs font-bold text-white mb-2 flex items-center gap-1.5">
            <Crosshair size={13} className="text-emerald-400" /> Threat Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-rose-500" />
            <span>Critical ≥85% · P1 Immediate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-amber-500" />
            <span>High 75–84% · P2 Elevated</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
            <span>Monitored · Satellite Watch</span>
          </div>
          <p className="text-[10px] text-white/50 pt-1 border-t border-white/10">
            Click any pin → 4D Zone Intelligence
          </p>
        </div>

        {/* SVG India Map with Accurate Outline */}
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', height: 580 }}
        >
          <svg
            viewBox="0 0 600 590"
            className="w-full h-full"
            style={{ maxHeight: 580 }}
          >
            <defs>
              <filter id="glowPin" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowSoft" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="indiaBody" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#1a3a28" />
                <stop offset="60%" stopColor="#0f2419" />
                <stop offset="100%" stopColor="#070f0b" />
              </radialGradient>
            </defs>

            {/* 
              India SVG outline — geographic coordinates mapped to our projection:
              Longitude 68–97.5 → X: 30–570
              Latitude 7.5–37.5 → Y: 570–10

              Key border points (approximate, following coastline + borders):
            */}

            {/* Main India Body */}
            <path
              d="
                M 195 42
                C 200 35, 218 28, 238 35
                C 252 40, 260 50, 268 60
                C 278 72, 286 82, 290 95
                C 298 110, 312 115, 330 118
                C 350 122, 375 125, 400 130
                C 422 135, 445 132, 462 140
                C 478 148, 490 158, 502 165
                C 516 173, 530 178, 540 190
                C 548 200, 546 214, 538 222
                C 528 232, 512 232, 498 238
                C 480 246, 468 258, 462 272
                C 456 286, 462 300, 468 314
                C 472 325, 472 336, 464 344
                C 452 356, 434 358, 420 366
                C 404 376, 390 392, 374 415
                C 358 438, 340 468, 320 498
                C 306 520, 290 545, 274 562
                C 265 570, 258 563, 252 548
                C 242 525, 228 495, 215 462
                C 204 432, 196 400, 186 374
                C 175 348, 156 338, 138 330
                C 118 322, 96 328, 84 316
                C 74 306, 76 290, 90 278
                C 102 268, 120 268, 134 258
                C 148 248, 152 230, 148 212
                C 144 194, 148 176, 158 160
                C 166 146, 176 132, 184 116
                C 192 100, 192 66, 195 42 Z
              "
              fill="url(#indiaBody)"
              stroke="#2e6b48"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />

            {/* Kashmir / Northern Disputed Region */}
            <path
              d="M 195 42 C 210 30, 230 22, 248 28 C 260 34, 268 44, 272 52 C 262 48, 244 38, 228 38 C 212 38, 198 44, 195 42 Z"
              fill="#1a3a28"
              stroke="#2e6b48"
              strokeWidth="1"
            />

            {/* Northeastern Region (Assam, NE states) */}
            <path
              d="M 500 162 C 518 165, 536 172, 548 182 C 556 190, 556 200, 550 208 C 540 218, 526 222, 512 228 C 498 234, 484 240, 474 248 C 470 240, 472 228, 476 220 C 482 210, 492 200, 500 188 Z"
              fill="#1a3a28"
              stroke="#2e6b48"
              strokeWidth="1"
            />

            {/* Sri Lanka (small island south) */}
            <ellipse cx="295" cy="576" rx="10" ry="14" fill="#0f2419" stroke="#2e6b48" strokeWidth="1" opacity="0.7" />

            {/* Andaman & Nicobar (small chain) */}
            <ellipse cx="548" cy="380" rx="5" ry="28" fill="#0f2419" stroke="#2e6b48" strokeWidth="0.8" opacity="0.6" />

            {/* Eco-Region Shading Overlays */}
            {/* Western Ghats */}
            <path
              d="M 190 370 C 200 400, 212 435, 230 470 C 240 490, 252 510, 256 538 C 240 525, 220 490, 204 450 C 192 420, 186 390, 186 370 Z"
              fill="rgba(16,185,129,0.18)"
              stroke="rgba(16,185,129,0.5)"
              strokeWidth="0.8"
              strokeDasharray="4 3"
            />
            {/* Terai Arc */}
            <path
              d="M 220 118 C 270 126, 330 128, 395 132 L 390 148 C 328 142, 270 140, 218 134 Z"
              fill="rgba(56,189,248,0.15)"
              stroke="rgba(56,189,248,0.4)"
              strokeWidth="0.8"
            />
            {/* Central Tiger Corridor */}
            <ellipse cx="310" cy="290" rx="70" ry="38" fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.25)" strokeWidth="1" strokeDasharray="5 4" />
            {/* Sundarbans Delta */}
            <ellipse cx="428" cy="322" rx="22" ry="16" fill="rgba(139,92,246,0.18)" stroke="rgba(139,92,246,0.5)" strokeWidth="1" />
            {/* Brahmaputra Wetlands */}
            <path
              d="M 462 185 C 492 188, 522 194, 538 210 C 520 216, 492 208, 468 198 Z"
              fill="rgba(16,185,129,0.2)"
              stroke="rgba(16,185,129,0.45)"
              strokeWidth="0.8"
            />

            {/* Region Labels */}
            <text x="210" y="88" fill="rgba(255,255,255,0.25)" fontSize="8.5" fontWeight="bold" letterSpacing="1" fontFamily="sans-serif">NORTHERN HIMALAYAS</text>
            <text x="255" y="278" fill="rgba(255,255,255,0.22)" fontSize="8.5" fontWeight="bold" letterSpacing="1" fontFamily="sans-serif">CENTRAL HIGHLANDS</text>
            <text x="140" y="460" fill="rgba(16,185,129,0.6)" fontSize="8" fontWeight="bold" letterSpacing="0.5" fontFamily="sans-serif">WESTERN GHATS</text>
            <text x="462" y="175" fill="rgba(255,255,255,0.22)" fontSize="8" fontWeight="bold" letterSpacing="0.5" fontFamily="sans-serif">NORTHEAST</text>
            <text x="412" y="338" fill="rgba(139,92,246,0.7)" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">SUNDARBANS</text>

            {/* Ocean Labels */}
            <text x="42" y="320" fill="rgba(56,189,248,0.3)" fontSize="8" fontWeight="bold" letterSpacing="0.5" fontFamily="sans-serif" transform="rotate(-90,42,320)">ARABIAN SEA</text>
            <text x="510" y="430" fill="rgba(56,189,248,0.3)" fontSize="8" fontWeight="bold" letterSpacing="0.5" fontFamily="sans-serif" transform="rotate(90,510,430)">BAY OF BENGAL</text>

            {/* Danger Zone Markers */}
            {filteredZones.map((zone) => {
              const x = projectX(zone.coordinates[1]);
              const y = projectY(zone.coordinates[0]);
              const isSelected = selectedZone?.id === zone.id;
              const isHovered = hoveredZone?.id === zone.id;
              const colors = getPinColor(zone);
              const active = isSelected || isHovered;
              const iconEmoji = zone.riskType === 'wildfire' ? '🔥' : zone.riskType === 'deforestation' ? '🌳' : '🐾';

              return (
                <g
                  key={zone.id}
                  className="cursor-pointer"
                  onClick={() => onSelectZone(zone)}
                  onMouseEnter={() => setHoveredZone(zone)}
                  onMouseLeave={() => setHoveredZone(null)}
                  style={{ transition: 'transform 0.2s' }}
                >
                  {/* Outer Pulsating Ring */}
                  <circle
                    cx={x}
                    cy={y}
                    r={active ? 22 : 16}
                    fill={colors.ring}
                    className="animate-ping"
                    style={{ animationDuration: zone.risk >= 80 ? '1.6s' : '2.8s' }}
                  />

                  {/* Mid Halo */}
                  <circle
                    cx={x}
                    cy={y}
                    r={active ? 14 : 10}
                    fill={colors.ring}
                    stroke={colors.fill}
                    strokeWidth={active ? 1.5 : 0.8}
                  />

                  {/* Core Pin */}
                  <circle
                    cx={x}
                    cy={y}
                    r={active ? 8 : 6}
                    fill={colors.fill}
                    stroke="white"
                    strokeWidth={active ? 2 : 1.5}
                    filter="url(#glowPin)"
                  />

                  {/* Label Badge */}
                  <g transform={`translate(${x + 12}, ${y - 10})`}>
                    <rect
                      x={0}
                      y={0}
                      width={zone.name.split(' ').slice(0, 2).join(' ').length * 5.8 + 12}
                      height={19}
                      rx={5}
                      fill="rgba(4,12,8,0.92)"
                      stroke={active ? colors.fill : 'rgba(255,255,255,0.18)'}
                      strokeWidth={active ? 1.5 : 0.7}
                    />
                    <text
                      x={6}
                      y={13}
                      fill="#ffffff"
                      fontSize={9}
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {iconEmoji} {zone.name.split(' ').slice(0, 2).join(' ')} · {zone.risk}%
                    </text>
                  </g>

                  {/* Selected state — bright selection ring */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={18}
                      fill="none"
                      stroke={colors.glow}
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      opacity={0.9}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Tooltip */}
        {hoveredZone && !selectedZone && (
          <div className="absolute right-4 bottom-4 z-30 w-80 rounded-2xl border border-white/20 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur animate-[fade-in_.15s_ease-out]">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
                {hoveredZone.state}
              </span>
              <span className={`data-mono text-sm font-extrabold ${hoveredZone.risk >= 80 ? 'text-rose-400' : 'text-amber-400'}`}>
                {hoveredZone.risk}% RISK
              </span>
            </div>
            <h4 className="mt-2 font-serif text-base font-extrabold">{hoveredZone.name}</h4>
            <p className="mt-1 text-[11px] text-white/70 leading-relaxed line-clamp-2">
              {hoveredZone.humanDanger.conflictHistory}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-2 text-[10px] text-white/60">
              <div>
                <span className="block text-white/40">NDVI</span>
                <strong className="text-emerald-400">{hoveredZone.vegetation.currentNdvi}</strong>
              </div>
              <div>
                <span className="block text-white/40">Village</span>
                <strong className="text-amber-400">{hoveredZone.humanDanger.distanceMeters}m</strong>
              </div>
              <div>
                <span className="block text-white/40">Pop. at Risk</span>
                <strong className="text-rose-400">{hoveredZone.humanDanger.populationAtRisk}</strong>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary">
              <MapPin size={10} /> Click for full 4D intelligence →
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
