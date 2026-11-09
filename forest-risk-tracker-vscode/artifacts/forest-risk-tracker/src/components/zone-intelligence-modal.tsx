import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Leaf, Bird, AlertTriangle, ShieldAlert, Users, Send,
  TrendingDown, Activity, Radio, MapPin, CheckCircle2, ChevronRight
} from 'lucide-react';
import type { IndiaZone } from './india-map';

interface ZoneIntelligenceModalProps {
  zone: IndiaZone;
  onClose: () => void;
}

export default function ZoneIntelligenceModal({ zone, onClose }: ZoneIntelligenceModalProps) {
  const [activeTab, setActiveTab] = useState<'vegetation' | 'wildlife' | 'alerts' | 'human_danger'>('vegetation');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const queryClient = useQueryClient();

  const triggerDispatchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/wildshield/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'telegram',
          recipient: '@WildShield_Ranger_Bot',
          severity: zone.risk >= 80 ? 'critical' : 'high',
          headline: `PRIORITY DISPATCH: ${zone.name} (${zone.humanDanger.nearestSettlement})`,
          payload: `🚨 *WILDSHIELD TACTICAL RANGER DISPATCH* 🚨\n━━━━━━━━━━━━━━━━━━━━━\n*Zone:* ${zone.name} (${zone.state})\n*Threat Level:* ${zone.risk}% Risk (${zone.riskType.toUpperCase()})\n*GPS:* \`${zone.coordinates[0]}, ${zone.coordinates[1]}\`\n*Target Species:* ${zone.wildlife.keySpecies.join(', ')}\n*Nearest Settlement:* ${zone.humanDanger.nearestSettlement} (${zone.humanDanger.distanceMeters}m away)\n*Population at Risk:* ${zone.humanDanger.populationAtRisk} residents\n\n*Tactical Directive:*\n\`${zone.humanDanger.recommendedSOP}\`\n━━━━━━━━━━━━━━━━━━━━━`,
          location: zone.name,
          coordinates: zone.coordinates,
          assignedUnit: `Sector Rapid Response Unit (${zone.stateCode})`,
        }),
      });
      if (!res.ok) throw new Error('Failed to dispatch');
      return res.json();
    },
    onSuccess: () => {
      setDispatchSuccess(true);
      void queryClient.invalidateQueries({ queryKey: ['wildshield-dispatches'] });
      void queryClient.invalidateQueries({ queryKey: ['wildshield-overview'] });
      setTimeout(() => setDispatchSuccess(false), 4000);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-card shadow-2xl animate-[fade-in_.2s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b bg-gradient-to-r from-[hsl(163_35%_12%)] to-[hsl(201_35%_16%)] p-6 text-white">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <span className="rounded bg-white/10 px-2 py-0.5">{zone.state}</span>
              <span>•</span>
              <span>{zone.region}</span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-extrabold sm:text-3xl">{zone.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/80">
              <span>GPS: <strong className="font-mono">{zone.coordinates[0]}°N, {zone.coordinates[1]}°E</strong></span>
              <span>•</span>
              <span>Monitored Area: <strong>{zone.area} km²</strong></span>
              <span>•</span>
              <span>Risk Type: <strong className="uppercase">{zone.riskType}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`data-mono text-3xl font-extrabold ${zone.risk >= 80 ? 'text-rose-400' : 'text-amber-400'}`}>
                {zone.risk}%
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-white/60">Risk Index</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 4 Feature Tabs */}
        <div className="flex border-b bg-muted/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('vegetation')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${activeTab === 'vegetation' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Leaf size={15} />
            1. Vegetation Dynamics
          </button>
          <button
            onClick={() => setActiveTab('wildlife')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${activeTab === 'wildlife' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Bird size={15} />
            2. Wildlife Signals ({zone.wildlife.activeSignals})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${activeTab === 'alerts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <AlertTriangle size={15} />
            3. Zone Alerts ({zone.alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('human_danger')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${activeTab === 'human_danger' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <ShieldAlert size={15} />
            4. Human Danger & Conflict
          </button>
        </div>

        {/* Modal Body / Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: VEGETATION */}
          {activeTab === 'vegetation' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="eyebrow">Current NDVI Index</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="data-mono text-2xl font-bold">{zone.vegetation.currentNdvi}</span>
                    <span className="text-xs text-muted-foreground">baseline: {zone.vegetation.baselineNdvi}</span>
                  </div>
                  <div className="mt-1 text-xs text-rose-500 font-bold">
                    {zone.vegetation.lossRate6mo}% change over 6 months
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="eyebrow">Canopy Density</div>
                  <div className="mt-2 data-mono text-2xl font-bold">{zone.vegetation.canopyDensityPct}%</div>
                  <div className="mt-1 text-xs text-muted-foreground">Crown cover density</div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="eyebrow">U-Net Segmenter Status</div>
                  <div className="mt-2 text-xs font-semibold leading-relaxed text-foreground/90">
                    {zone.vegetation.unetStatus}
                  </div>
                </div>
              </div>

              {/* 6-Month Historical Progression Chart */}
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="eyebrow">Satellite Spectral Time-Series</div>
                    <h4 className="font-serif text-base font-bold">6-Month Vegetation & Canopy Density Curve</h4>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Canopy %</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> NDVI</span>
                  </div>
                </div>

                <div className="mt-4 flex h-36 items-end justify-between gap-3 px-2 pt-4">
                  {zone.vegetation.history.map((pt) => (
                    <div key={pt.month} className="flex flex-1 flex-col items-center gap-2">
                      <div className="text-[10px] font-mono font-bold text-muted-foreground">{pt.canopy}%</div>
                      <div className="relative w-full rounded-t-lg bg-emerald-500/20" style={{ height: `${pt.canopy * 1.1}px` }}>
                        <div
                          className="absolute inset-x-0 bottom-0 rounded-t-lg bg-emerald-500 transition-all"
                          style={{ height: `${pt.ndvi * 100}px` }}
                        />
                      </div>
                      <div className="text-[11px] font-bold">{pt.month}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Primary Driver of Vegetation Change */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <TrendingDown size={20} className="mt-0.5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                      Primary Disturbance Driver
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {zone.vegetation.primaryDriver}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WILDLIFE */}
          {activeTab === 'wildlife' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="eyebrow">Tracked Indicator Species</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {zone.wildlife.keySpecies.map((species) => (
                      <span key={species} className="rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        🐾 {species}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="eyebrow">Telemetry & Corridors</div>
                  <div className="mt-2 text-xs space-y-1">
                    <div>Last Signal: <strong>{zone.wildlife.lastSighting}</strong></div>
                    <div>Corridor Status: <strong className="uppercase text-rose-500">{zone.wildlife.corridorStatus}</strong></div>
                    <div>Active Camera Trap: <strong className="font-mono">{zone.wildlife.cameraTrapCode}</strong></div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-5">
                <div className="eyebrow">Movement Direction & Corridor Vector</div>
                <h4 className="mt-1 font-serif text-base font-extrabold">{zone.wildlife.movementHeading}</h4>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {zone.wildlife.threatDescription}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="eyebrow">Real-Time Threat Events in this Zone</div>
              {zone.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-2xl border p-4 ${alert.severity === 'critical' ? 'border-rose-500/40 bg-rose-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{alert.title}</span>
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-card">
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Signal: {alert.signal}</span>
                    <span className="font-mono">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: HUMAN DANGER & CONFLICT */}
          {activeTab === 'human_danger' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="eyebrow">Nearest Settlement</div>
                  <div className="mt-1 font-bold text-sm">{zone.humanDanger.nearestSettlement}</div>
                  <div className="mt-2 font-mono text-xl font-extrabold text-rose-600">
                    {zone.humanDanger.distanceMeters} meters away
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="eyebrow">Population at Risk</div>
                  <div className="mt-1 font-mono text-2xl font-bold">{zone.humanDanger.populationAtRisk}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Residents in buffer</div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="eyebrow">HWC Conflict Rating</div>
                  <div className="mt-1 font-bold uppercase text-rose-600 text-base">
                    {zone.humanDanger.hwcRiskLevel}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{zone.humanDanger.geofenceStatus}</div>
                </div>
              </div>

              <div className="rounded-2xl border p-4 space-y-2">
                <div className="eyebrow">30-Day Incident History</div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {zone.humanDanger.conflictHistory}
                </p>
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="eyebrow">Recommended Standard Operating Procedure (SOP)</div>
                <p className="text-xs leading-relaxed font-semibold text-foreground">
                  {zone.humanDanger.recommendedSOP}
                </p>
              </div>

              {/* Action Button: Dispatch Rangers */}
              <div className="pt-2">
                <button
                  disabled={triggerDispatchMutation.isPending || dispatchSuccess}
                  onClick={() => triggerDispatchMutation.mutate()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition hover:bg-rose-500 disabled:opacity-50"
                >
                  {dispatchSuccess ? (
                    <>
                      <CheckCircle2 size={16} />
                      Dispatched to Telegram & SMS Ranger Channel!
                    </>
                  ) : triggerDispatchMutation.isPending ? (
                    'Transmitting Live Field Alert...'
                  ) : (
                    <>
                      <Send size={15} />
                      🚨 Transmit Instant WildShield Ranger Dispatch to {zone.name}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-muted/40 px-6 py-4">
          <span className="text-xs text-muted-foreground">
            Zone ID #{zone.id} · Connected to WildShield-AI Telegram Bot & SMS Dispatch
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-card border px-4 py-2 text-xs font-bold hover:bg-muted"
          >
            Close Intelligence Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
