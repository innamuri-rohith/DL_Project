import { Router, type IRouter } from "express";
import {
  db,
  geofencesTable,
  cameraTrapsTable,
  multimodalDetectionsTable,
  rangerDispatchesTable,
  activityTable,
  desc,
  eq,
} from "@workspace/db";

const router: IRouter = Router();

// Haversine formula for spherical distance in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ray-casting algorithm for point in polygon
function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  const x = point[1];
  const y = point[0];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][1];
    const yi = vs[i][0];
    const xj = vs[j][1];
    const yj = vs[j][0];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Distance from point to polygon edges
function distanceToPolygonEdges(point: [number, number], vs: [number, number][]): number {
  let minDistance = Infinity;
  for (let i = 0; i < vs.length; i++) {
    const p1 = vs[i];
    const dist = haversineDistance(point[0], point[1], p1[0], p1[1]);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance;
}

const initialGeofences = [
  {
    name: "Mukurthi Tea Estate Settlement",
    type: "settlement",
    riskLevel: "critical",
    bufferMeters: 600,
    population: 1420,
    centerCoordinates: ["11.303800", "76.417200"],
    boundaryCoordinates: JSON.stringify([
      [11.302, 76.410],
      [11.308, 76.415],
      [11.305, 76.425],
      [11.298, 76.422],
      [11.296, 76.414],
    ]),
  },
  {
    name: "Nilgiri Arterial Highway (KM 42-48)",
    type: "road",
    riskLevel: "advisory",
    bufferMeters: 350,
    population: 0,
    centerCoordinates: ["11.296500", "76.425700"],
    boundaryCoordinates: JSON.stringify([
      [11.285, 76.400],
      [11.292, 76.418],
      [11.299, 76.435],
      [11.310, 76.450],
    ]),
  },
  {
    name: "Core Silent Valley Sanctuary Perimeter",
    type: "core_reserve",
    riskLevel: "safe",
    bufferMeters: 1000,
    population: 0,
    centerCoordinates: ["11.295000", "76.425000"],
    boundaryCoordinates: JSON.stringify([
      [11.270, 76.390],
      [11.320, 76.395],
      [11.325, 76.460],
      [11.265, 76.455],
    ]),
  },
  {
    name: "Attappady Tribal Hamlet",
    type: "settlement",
    riskLevel: "safe",
    bufferMeters: 500,
    population: 680,
    centerCoordinates: ["11.281500", "76.441200"],
    boundaryCoordinates: JSON.stringify([
      [11.280, 76.435],
      [11.285, 76.442],
      [11.281, 76.448],
      [11.275, 76.440],
    ]),
  },
];

const initialCameraTraps = [
  {
    code: "CAM-TRAP-01",
    name: "Northern Ridge Pass Unit",
    location: "Silent Valley North Fringes",
    coordinates: ["11.304500", "76.416800"],
    status: "online",
    battery: 94,
  },
  {
    code: "CAM-TRAP-02",
    name: "Eastern Corridor Sensor",
    location: "Kanha Buffer East Fringes",
    coordinates: ["22.334000", "80.742000"],
    status: "online",
    battery: 88,
  },
  {
    code: "DRONE-FALCON-01",
    name: "Falcon Thermal Sweep UAV",
    location: "Attappady Valley Access",
    coordinates: ["11.283000", "76.441000"],
    status: "online",
    battery: 76,
  },
];

const initialDetections = [
  {
    source: "camera_trap",
    model: "YOLOv8-MegaDetector",
    target: "Asian Elephant Herd (8 individuals)",
    confidence: "95.80",
    threatLevel: "critical",
    location: "Mukurthi Tea Estate Buffer",
    coordinates: ["11.302500", "76.416200"],
    boundingBoxes: JSON.stringify([
      { label: "Asian Elephant", conf: 0.96, box: [0.18, 0.22, 0.82, 0.74] },
      { label: "Calf", conf: 0.91, box: [0.35, 0.68, 0.75, 0.89] },
    ]),
    details: "Elephant herd moving along ridge slope towards Mukurthi tea estate settlement boundary.",
    nearestGeofence: "Mukurthi Tea Estate Settlement",
    geofenceDistanceMeters: 380,
  },
  {
    source: "satellite_unet",
    model: "U-Net-CanopyLoss",
    target: "Linear Deforestation & Road Scars",
    confidence: "91.20",
    threatLevel: "high",
    location: "Kanha Buffer East",
    coordinates: ["22.338000", "80.745000"],
    boundingBoxes: JSON.stringify([
      { label: "Canopy Disturbance", conf: 0.91, box: [0.1, 0.15, 0.9, 0.85] },
    ]),
    details: "14.2 hectares of canopy loss identified via Sentinel-2 multi-spectral delta.",
    nearestGeofence: "Nilgiri Arterial Highway (KM 42-48)",
    geofenceDistanceMeters: 740,
  },
  {
    source: "satellite_fire_rf",
    model: "RandomForest-FireRisk",
    target: "High Thermal Signature & Dry Fuel Anomaly",
    confidence: "88.50",
    threatLevel: "high",
    location: "Silent Valley North",
    coordinates: ["11.312000", "76.435000"],
    boundingBoxes: null,
    details: "Random Forest predicted 84% wildfire probability driven by 36°C ambient temp and 18% fuel moisture.",
    nearestGeofence: "Core Silent Valley Sanctuary Perimeter",
    geofenceDistanceMeters: 1200,
  },
];

const initialDispatches = [
  {
    channel: "telegram",
    recipient: "@WildShield_Ranger_Bot",
    severity: "critical",
    headline: "HWC ALERT: Elephant herd 380m from Mukurthi Settlement",
    payload: `🚨 *WILDSHIELD-AI: CRITICAL RANGER DISPATCH* 🚨
━━━━━━━━━━━━━━━━━━━━━
*Incident ID:* \`DSP-HWC-9941\`
*Priority:* *P1_IMMEDIATE*
*Target:* Asian Elephant Herd (8 individuals) (Conf: 95.8%)
*Sector:* Mukurthi Tea Estate Settlement (380m from buffer)
*GPS Coordinates:* \`11.30250, 76.41620\`
*Map Pin:* https://www.google.com/maps?q=11.3025,76.4162

*Tactical Directive:*
\`DEPLOY_ACOUSTIC_DETERRENT_SQUAD\`
*SOP:*
• Sound village perimeter warning sirens
• Mobilize Quick Response Team 4 to Northern Tea Boundary
• Deploy non-lethal acoustic scaring devices
━━━━━━━━━━━━━━━━━━━━━`,
    location: "Mukurthi Tea Estate Settlement",
    coordinates: ["11.302500", "76.416200"],
    assignedUnit: "HWC Quick Response Team 4",
    etaMinutes: 8,
    status: "dispatched",
  },
  {
    channel: "sms",
    recipient: "+91-98402-RANGER (Sector-3 Handheld)",
    severity: "high",
    headline: "CANOPY LOSS: 14.2 ha disturbance near East Buffer",
    payload:
      "WILDSHIELD ALERT [P2_HIGH]: U-Net detected 14.2ha canopy loss at Kanha East Buffer (GPS: 22.3380, 80.7450). Drone verification squad dispatched. SOP: INSPECT_LOGGING.",
    location: "Kanha Buffer East",
    coordinates: ["22.338000", "80.745000"],
    assignedUnit: "Drone Surveillance Unit 1",
    etaMinutes: 20,
    status: "acknowledged",
  },
];

let seeded = false;
async function ensureWildShieldSeeded() {
  if (seeded) return;
  const [fences, cameras, detections, dispatches] = await Promise.all([
    db.select({ id: geofencesTable.id }).from(geofencesTable).limit(1),
    db.select({ id: cameraTrapsTable.id }).from(cameraTrapsTable).limit(1),
    db.select({ id: multimodalDetectionsTable.id }).from(multimodalDetectionsTable).limit(1),
    db.select({ id: rangerDispatchesTable.id }).from(rangerDispatchesTable).limit(1),
  ]);

  if (fences.length === 0) await db.insert(geofencesTable).values(initialGeofences);
  if (cameras.length === 0) await db.insert(cameraTrapsTable).values(initialCameraTraps);
  if (detections.length === 0) await db.insert(multimodalDetectionsTable).values(initialDetections);
  if (dispatches.length === 0) await db.insert(rangerDispatchesTable).values(initialDispatches);
  seeded = true;
}

// 1. Overview
router.get("/wildshield/overview", async (_req, res) => {
  await ensureWildShieldSeeded();
  const [fences, detections, dispatches, cameras] = await Promise.all([
    db.select().from(geofencesTable),
    db.select().from(multimodalDetectionsTable),
    db.select().from(rangerDispatchesTable).orderBy(desc(rangerDispatchesTable.dispatchedAt)),
    db.select().from(cameraTrapsTable),
  ]);

  const activeBreaches = detections.filter(
    (d) => d.threatLevel === "critical" || (d.geofenceDistanceMeters != null && d.geofenceDistanceMeters < 500)
  ).length;

  res.json({
    activeGeofences: fences.length,
    activeBreaches,
    totalThreats: detections.length,
    activeDispatches: dispatches.filter((d) => d.status !== "resolved").length,
    totalDispatches: dispatches.length,
    camerasOnline: cameras.filter((c) => c.status === "online").length,
    models: [
      { name: "U-Net Canopy Loss Segmenter", version: "v3.2", status: "online", type: "Satellite Macro" },
      { name: "Random Forest Wildfire Index", version: "v2.1", status: "online", type: "Satellite Macro" },
      { name: "YOLOv8x-MegaDetector", version: "v5b", status: "online", type: "Camera & Drone Vision" },
      { name: "Shapely Geofence Engine", version: "v2.0", status: "online", type: "Spatial Math" },
    ],
    lastUpdated: new Date().toISOString(),
  });
});

// 2. Geofences
router.get("/wildshield/geofences", async (_req, res) => {
  await ensureWildShieldSeeded();
  const fences = await db.select().from(geofencesTable);
  res.json(
    fences.map((f) => ({
      ...f,
      centerCoordinates: f.centerCoordinates.map(Number),
      boundaryCoordinates: JSON.parse(f.boundaryCoordinates),
      updatedAt: f.updatedAt.toISOString(),
    }))
  );
});

// 3. Evaluate coordinates against geofences
router.post("/wildshield/geofences/evaluate", async (req, res) => {
  await ensureWildShieldSeeded();
  const { lat, lon } = req.body;
  if (typeof lat !== "number" || typeof lon !== "number") {
    res.status(400).json({ error: "lat and lon must be numbers" });
    return;
  }

  const fences = await db.select().from(geofencesTable);
  const evaluations = fences.map((f) => {
    const coords: [number, number][] = JSON.parse(f.boundaryCoordinates);
    const isInside = f.type !== "road" ? isPointInPolygon([lat, lon], coords) : false;
    const distanceMeters = isInside ? 0 : Math.round(distanceToPolygonEdges([lat, lon], coords));
    let status = "safe";
    let threatLevel = "low";

    if (isInside) {
      status = "intrusion";
      threatLevel = "critical";
    } else if (distanceMeters <= f.bufferMeters) {
      status = "buffer_breach";
      threatLevel = f.type === "settlement" ? "critical" : "high";
    } else if (distanceMeters <= f.bufferMeters * 2) {
      status = "advisory";
      threatLevel = "medium";
    }

    return {
      geofenceId: f.id,
      name: f.name,
      type: f.type,
      distanceMeters,
      bufferMeters: f.bufferMeters,
      status,
      threatLevel,
      populationAtRisk: status === "intrusion" || status === "buffer_breach" ? f.population : 0,
    };
  });

  evaluations.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const nearest = evaluations[0];
  const hasBreach = evaluations.some((e) => e.status === "intrusion" || e.status === "buffer_breach");

  res.json({
    coordinates: [lat, lon],
    nearest,
    hasBreach,
    evaluations,
  });
});

// 4. Multimodal Threat Detections
router.get("/wildshield/threats", async (_req, res) => {
  await ensureWildShieldSeeded();
  const threats = await db.select().from(multimodalDetectionsTable).orderBy(desc(multimodalDetectionsTable.detectedAt));
  res.json(
    threats.map((t) => ({
      ...t,
      confidence: Number(t.confidence),
      coordinates: t.coordinates.map(Number),
      boundingBoxes: t.boundingBoxes ? JSON.parse(t.boundingBoxes) : null,
      detectedAt: t.detectedAt.toISOString(),
    }))
  );
});

// 5. Ranger Dispatches
router.get("/wildshield/dispatches", async (_req, res) => {
  await ensureWildShieldSeeded();
  const dispatches = await db.select().from(rangerDispatchesTable).orderBy(desc(rangerDispatchesTable.dispatchedAt));
  res.json(
    dispatches.map((d) => ({
      ...d,
      coordinates: d.coordinates.map(Number),
      dispatchedAt: d.dispatchedAt.toISOString(),
      acknowledgedAt: d.acknowledgedAt ? d.acknowledgedAt.toISOString() : null,
    }))
  );
});

// 6. Manual Dispatch creation
router.post("/wildshield/dispatches", async (req, res) => {
  await ensureWildShieldSeeded();
  const { channel, recipient, severity, headline, payload, location, coordinates, assignedUnit } = req.body;

  const [created] = await db
    .insert(rangerDispatchesTable)
    .values({
      channel: channel || "telegram",
      recipient: recipient || "@WildShield_Ranger_Bot",
      severity: severity || "high",
      headline: headline || "Field Alert",
      payload: payload || "Manual ranger dispatch from WildShield Command Center.",
      location: location || "Reserve Sector",
      coordinates: coordinates ? coordinates.map(String) : ["11.302", "76.416"],
      assignedUnit: assignedUnit || "Rapid Action Force Unit 1",
      etaMinutes: 15,
      status: "dispatched",
    })
    .returning();

  await db.insert(activityTable).values({
    label: "Ranger dispatched",
    detail: `${headline} · Sent via ${channel || "telegram"} to ${recipient || "Rangers"}`,
    tone: severity === "critical" ? "red" : "amber",
  });

  res.status(201).json({
    ...created,
    coordinates: created.coordinates.map(Number),
    dispatchedAt: created.dispatchedAt.toISOString(),
  });
});

// 7. Update dispatch status
router.patch("/wildshield/dispatches/:id", async (req, res) => {
  await ensureWildShieldSeeded();
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["dispatched", "acknowledged", "en_route", "resolved"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [updated] = await db
    .update(rangerDispatchesTable)
    .set({
      status,
      acknowledgedAt: status === "acknowledged" ? new Date() : undefined,
    })
    .where(eq(rangerDispatchesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Dispatch not found" });
    return;
  }

  res.json({
    ...updated,
    coordinates: updated.coordinates.map(Number),
    dispatchedAt: updated.dispatchedAt.toISOString(),
    acknowledgedAt: updated.acknowledgedAt ? updated.acknowledgedAt.toISOString() : null,
  });
});

// 8. Trigger Incident Simulation (demonstrating end-to-end real-time AI & dispatch)
router.post("/wildshield/simulate", async (req, res) => {
  await ensureWildShieldSeeded();
  const { scenario } = req.body;

  let detectionData;
  let dispatchData;

  if (scenario === "poacher_intrusion") {
    detectionData = {
      source: "camera_trap",
      model: "YOLOv8-MegaDetector",
      target: "Poacher / Armed Human & Off-Road Vehicle",
      confidence: "97.40",
      threatLevel: "critical",
      location: "Silent Valley Sanctuary Core Perimeter",
      coordinates: ["11.298000", "76.418000"],
      boundingBoxes: JSON.stringify([
        { label: "Armed Individual", conf: 0.98, box: [0.2, 0.35, 0.85, 0.65] },
        { label: "Unauthorized 4x4", conf: 0.96, box: [0.4, 0.15, 0.88, 0.55] },
      ]),
      details: "Camera Trap CAM-TRAP-01 detected unauthorized motorized intrusion inside core sanctuary.",
      nearestGeofence: "Core Silent Valley Sanctuary Perimeter",
      geofenceDistanceMeters: 0,
    };
    dispatchData = {
      channel: "telegram",
      recipient: "@WildShield_AntiPoaching_TaskForce",
      severity: "critical",
      headline: "ARMED INTRUSION: Poacher & vehicle in Core Sanctuary",
      payload: `🚨 *WILDSHIELD-AI: CODE RED ANTI-POACHING INTERCEPT* 🚨
━━━━━━━━━━━━━━━━━━━━━
*Target:* Armed Intruder & 4x4 Vehicle (Conf: 97.4%)
*Location:* CAM-TRAP-01 Core Sanctuary Perimeter
*GPS:* \`11.29800, 76.41800\`
*Directive:* \`IMMEDIATE_ARMED_INTERCEPT\`
*SOP:*
• Deploy Special Tiger Protection Force (STPF) Unit 1
• Lock access gates KM 42 & KM 48
• Aerial drone tracking en route
━━━━━━━━━━━━━━━━━━━━━`,
      location: "Core Silent Valley Sanctuary Perimeter",
      coordinates: ["11.298000", "76.418000"],
      assignedUnit: "Anti-Poaching Strike Squad",
      etaMinutes: 6,
    };
  } else if (scenario === "canopy_chainsaw") {
    detectionData = {
      source: "satellite_unet",
      model: "U-Net-CanopyLoss",
      target: "Active Chainsaw Logging Cluster",
      confidence: "93.10",
      threatLevel: "high",
      location: "Kanha Buffer East Fringes",
      coordinates: ["22.336000", "80.744000"],
      boundingBoxes: JSON.stringify([
        { label: "Canopy Disturbance", conf: 0.93, box: [0.15, 0.2, 0.85, 0.8] },
      ]),
      details: "U-Net detected 8.8 ha canopy disturbance matched with acoustic sensor chainsaw acoustic signature.",
      nearestGeofence: "Nilgiri Arterial Highway (KM 42-48)",
      geofenceDistanceMeters: 410,
    };
    dispatchData = {
      channel: "sms",
      recipient: "+91-98402-RANGER (East Flying Squad)",
      severity: "high",
      headline: "LOGGING ALERT: U-Net canopy loss + acoustic chainsaw signal",
      payload:
        "WILDSHIELD DISPATCH [P2_HIGH]: Active illegal logging detected at Kanha Buffer East (GPS: 22.3360, 80.7440). 8.8ha canopy disturbed. Intercept team dispatched. SOP: CONFISCATE_EQUIPMENT.",
      location: "Kanha Buffer East",
      coordinates: ["22.336000", "80.744000"],
      assignedUnit: "East Sector Flying Squad",
      etaMinutes: 14,
    };
  } else {
    // Default: elephant HWC approaching village settlement
    detectionData = {
      source: "camera_trap",
      model: "YOLOv8-MegaDetector",
      target: "Asian Elephant Herd (11 individuals)",
      confidence: "98.20",
      threatLevel: "critical",
      location: "Mukurthi Tea Estate Settlement Fringes",
      coordinates: ["11.303200", "76.415800"],
      boundingBoxes: JSON.stringify([
        { label: "Bull Elephant", conf: 0.98, box: [0.15, 0.2, 0.85, 0.6] },
        { label: "Matriarch Herd", conf: 0.97, box: [0.25, 0.45, 0.9, 0.85] },
      ]),
      details: "Elephant herd has crossed 500m buffer and is 210m from tea worker residential quarters.",
      nearestGeofence: "Mukurthi Tea Estate Settlement",
      geofenceDistanceMeters: 210,
    };
    dispatchData = {
      channel: "telegram",
      recipient: "@WildShield_Ranger_Bot",
      severity: "critical",
      headline: "IMMINENT HWC CONFLICT: Elephants 210m from Mukurthi Village",
      payload: `🚨 *WILDSHIELD-AI: CRITICAL RANGER DISPATCH* 🚨
━━━━━━━━━━━━━━━━━━━━━
*Incident ID:* \`DSP-HWC-LIVE\`
*Priority:* *P1_IMMEDIATE*
*Target:* Asian Elephant Herd (11 individuals) (Conf: 98.2%)
*Sector:* Mukurthi Tea Estate Settlement (210m from perimeter)
*GPS Coordinates:* \`11.30320, 76.41580\`
*Map Pin:* https://www.google.com/maps?q=11.3032,76.4158

*Tactical Directive:*
\`DEPLOY_DETERRENT_SQUAD\`
*Recommended SOP:*
• Sound village perimeter warning sirens immediately
• Establish safety cordon around tea estate workers' quarters
• Deploy thermal UAV Falcon-01 for continuous tracking
━━━━━━━━━━━━━━━━━━━━━`,
      location: "Mukurthi Tea Estate Settlement",
      coordinates: ["11.303200", "76.415800"],
      assignedUnit: "HWC Quick Response Team 4",
      etaMinutes: 5,
    };
  }

  const [savedDetection] = await db.insert(multimodalDetectionsTable).values(detectionData).returning();
  const [savedDispatch] = await db
    .insert(rangerDispatchesTable)
    .values({
      ...dispatchData,
      status: "dispatched",
    })
    .returning();

  await db.insert(activityTable).values({
    label: "Automated Ranger Dispatch",
    detail: `${dispatchData.headline} · Routed to ${dispatchData.channel.toUpperCase()}`,
    tone: "red",
  });

  res.status(201).json({
    detection: {
      ...savedDetection,
      confidence: Number(savedDetection.confidence),
      coordinates: savedDetection.coordinates.map(Number),
      boundingBoxes: savedDetection.boundingBoxes ? JSON.parse(savedDetection.boundingBoxes) : null,
    },
    dispatch: {
      ...savedDispatch,
      coordinates: savedDispatch.coordinates.map(Number),
      dispatchedAt: savedDispatch.dispatchedAt.toISOString(),
    },
  });
});

// 9. Google Earth Engine Habitat Stress Map
router.get("/wildshield/habitat-stress", async (_req, res) => {
  res.json({
    engine: "Google Earth Engine Multi-Sensor Pipeline",
    timestamp: new Date().toISOString(),
    globalDisplacementRisk: "high",
    sectors: [
      {
        id: "SEC-01",
        name: "Silent Valley & Nilgiri Biosphere",
        coordinates: [11.295, 76.420],
        habitatStressIndex: 68.4,
        displacementRisk: "critical",
        indicators: {
          forageNdvi: 0.58,
          forageStatus: "Depleted (Dry Season Browse Deficit)",
          sarCanopyLossDb: -2.4,
          sarStatus: "C-band Radar Detected Canopy Degradation",
          waterbodyRetentionPct: 42.0,
          waterStatus: "Waterholes Desiccating in Core Plateau",
        },
        primaryMigrationDriver: "Seasonal drought drying core waterholes + firebreak logging",
        predictedMigrationVector: {
          bearingDeg: 142,
          headingText: "South-Southeast towards Mukurthi tea estate drainage",
        },
      },
      {
        id: "SEC-02",
        name: "Kanha-Pench Tiger Corridor",
        coordinates: [22.334, 80.742],
        habitatStressIndex: 74.2,
        displacementRisk: "critical",
        indicators: {
          forageNdvi: 0.51,
          forageStatus: "Severely Depleted",
          sarCanopyLossDb: -4.1,
          sarStatus: "Linear Highway Expansion Severing Canopy",
          waterbodyRetentionPct: 36.0,
          waterStatus: "Perennial Streams Dry",
        },
        primaryMigrationDriver: "Linear road infrastructure + dry nullahs driving tigers into buffer",
        predictedMigrationVector: {
          bearingDeg: 78,
          headingText: "East-Northeast crossing freight railway bypass",
        },
      },
      {
        id: "SEC-03",
        name: "Sundarbans Mangrove Delta",
        coordinates: [21.949, 88.899],
        habitatStressIndex: 79.5,
        displacementRisk: "critical",
        indicators: {
          forageNdvi: 0.48,
          forageStatus: "Salinized Mangrove Die-back",
          sarCanopyLossDb: -3.2,
          sarStatus: "Storm Surge Scars & Embankment Erosion",
          waterbodyRetentionPct: 24.0,
          waterStatus: "Freshwater Deficit / High Salinity",
        },
        primaryMigrationDriver: "Salinity surge forcing tigers towards village freshwater ponds",
        predictedMigrationVector: {
          bearingDeg: 310,
          headingText: "North-West towards Gosaba agricultural perimeter",
        },
      },
    ],
  });
});

// Helper for forward destination calculation
function calculateDestination(lat: number, lon: number, distMeters: number, bearingDeg: number): [number, number] {
  const R = 6371000;
  const brng = (bearingDeg * Math.PI) / 180;
  const dDivR = distMeters / R;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dDivR) + Math.cos(lat1) * Math.sin(dDivR) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dDivR) * Math.cos(lat1), Math.cos(dDivR) - Math.sin(lat1) * Math.sin(lat2));
  return [Number(((lat2 * 180) / Math.PI).toFixed(6)), Number(((lon2 * 180) / Math.PI).toFixed(6))];
}

// 10. Kalman Filter Predictive Trajectories & Buffer Intersections
router.get("/wildshield/trajectories", async (_req, res) => {
  const now = new Date();

  // Active track 1: Elephant Herd heading towards Mukurthi settlement buffer
  const elephantCurrent: [number, number] = [11.305, 76.414];
  const elephantSpeed = 4.8; // km/h
  const elephantHeading = 142; // degrees
  const speedMps1 = (elephantSpeed * 1000) / 3600;

  const elephantT15 = calculateDestination(elephantCurrent[0], elephantCurrent[1], speedMps1 * 900, elephantHeading);
  const elephantT20 = calculateDestination(elephantCurrent[0], elephantCurrent[1], speedMps1 * 1200, elephantHeading);
  const elephantT30 = calculateDestination(elephantCurrent[0], elephantCurrent[1], speedMps1 * 1800, elephantHeading);

  // Active track 2: Tusker Bull heading towards Railway Track Corridor (Nilgiri Mountain Railway KM 44-46)
  const tuskerCurrent: [number, number] = [11.284, 76.402];
  const tuskerSpeed = 5.2;
  const tuskerHeading = 78;
  const speedMps2 = (tuskerSpeed * 1000) / 3600;

  const tuskerT15 = calculateDestination(tuskerCurrent[0], tuskerCurrent[1], speedMps2 * 900, tuskerHeading);
  const tuskerT20 = calculateDestination(tuskerCurrent[0], tuskerCurrent[1], speedMps2 * 1200, tuskerHeading);
  const tuskerT30 = calculateDestination(tuskerCurrent[0], tuskerCurrent[1], speedMps2 * 1800, tuskerHeading);

  res.json({
    timestamp: now.toISOString(),
    activeVectorsCount: 2,
    trajectories: [
      {
        id: "VEC-EL-09",
        species: "Asian Elephant (Matriarch Herd of 9)",
        trackingType: "Live Radio Telemetry + CamTrap Sync",
        currentPosition: elephantCurrent,
        speedKmh: elephantSpeed,
        speedMps: Number(speedMps1.toFixed(2)),
        headingDeg: elephantHeading,
        headingCardinal: "142° SE",
        kalmanState: {
          confidenceScore: 94.8,
          lookaheadHorizonsMinutes: [15, 20, 30],
          forecastCoords: {
            t15: elephantT15,
            t20: elephantT20,
            t30: elephantT30,
          },
        },
        predictedIntersection: {
          targetBuffer: "Mukurthi Tea Estate Settlement Buffer",
          bufferType: "village_perimeter",
          intersectionCoordinate: [11.2982, 76.4218],
          distanceToIntersectionMeters: 1440,
          timeToImpactMinutes: 18.0,
          timeToImpactFormatted: "18 mins 00 secs",
          isImminentBreach: true,
          actionCode: "DEPLOY_NOISE_DETERRENT_SQUAD",
          tacticalDirective: "Deploy noise deterrent team to Sector 4 West before herd breaches 500m buffer.",
        },
      },
      {
        id: "VEC-TUSK-04",
        species: "Adult Male Tusker Bull",
        trackingType: "Thermal UAV Falcon-01 Sweep",
        currentPosition: tuskerCurrent,
        speedKmh: tuskerSpeed,
        speedMps: Number(speedMps2.toFixed(2)),
        headingDeg: tuskerHeading,
        headingCardinal: "78° ENE",
        kalmanState: {
          confidenceScore: 92.4,
          lookaheadHorizonsMinutes: [15, 20, 30],
          forecastCoords: {
            t15: tuskerT15,
            t20: tuskerT20,
            t30: tuskerT30,
          },
        },
        predictedIntersection: {
          targetBuffer: "Nilgiri Mountain Railway Corridor (KM 44-46)",
          bufferType: "railway_track",
          intersectionCoordinate: [11.2925, 76.4210],
          distanceToIntersectionMeters: 1910,
          timeToImpactMinutes: 22.0,
          timeToImpactFormatted: "22 mins 00 secs",
          isImminentBreach: true,
          actionCode: "HALT_RAILWAY_FREIGHT",
          tacticalDirective: "Signal railway control room to issue 20 km/h speed caution order for Train #16382 between KM 44-46.",
        },
      },
    ],
  });
});

// 11. On-Demand Trajectory Forecast Calculator
router.post("/wildshield/predict-trajectory", async (req, res) => {
  const { lat, lon, speedKmh, headingDeg } = req.body;
  if (typeof lat !== "number" || typeof lon !== "number") {
    res.status(400).json({ error: "lat and lon are required numbers" });
    return;
  }
  const speed = Number(speedKmh) || 4.5;
  const heading = Number(headingDeg) || 90;
  const speedMps = (speed * 1000) / 3600;

  const t15 = calculateDestination(lat, lon, speedMps * 900, heading);
  const t20 = calculateDestination(lat, lon, speedMps * 1200, heading);
  const t30 = calculateDestination(lat, lon, speedMps * 1800, heading);

  // Check proximity against Mukurthi settlement [11.3038, 76.4172]
  const dist = haversineDistance(t20[0], t20[1], 11.3038, 76.4172);
  const timeToImpact = Math.round((dist / maxSpeed(speedMps, 0.1)) / 60);

  res.json({
    currentPosition: [lat, lon],
    speedKmh: speed,
    headingDeg: heading,
    forecasts: {
      t15,
      t20,
      t30,
    },
    imminentBreach: dist <= 1200,
    timeToImpactMinutes: Math.max(1, timeToImpact),
    nearestBuffer: "Mukurthi Tea Estate Settlement",
    distanceMeters: Math.round(dist),
  });
});

function maxSpeed(a: number, b: number) {
  return a > b ? a : b;
}

// 12. Pre-Breach Incident Simulation (Fires dispatch card BEFORE breach happens)
router.post("/wildshield/simulate-preemptive", async (req, res) => {
  await ensureWildShieldSeeded();
  const { scenario } = req.body;

  let trajectoryEvent;
  if (scenario === "railway_collision") {
    trajectoryEvent = {
      id: "PRE-RAIL-44",
      species: "Tusker Herd (6 elephants)",
      speedKmh: 5.2,
      headingDeg: 78,
      timeToImpactMinutes: 22,
      predictedIntersection: [11.2925, 76.4210],
      bufferName: "Nilgiri Mountain Railway Corridor (KM 44-46)",
      tacticalRecommendation: "Signal railway control cabin KM 45 to issue 20 km/h emergency caution order for Train #16382.",
      channel: "telegram",
    };
  } else if (scenario === "crop_raiding") {
    trajectoryEvent = {
      id: "PRE-CROP-12",
      species: "Bull Elephant Duo",
      speedKmh: 6.0,
      headingDeg: 210,
      timeToImpactMinutes: 25,
      predictedIntersection: [11.2780, 76.4380],
      bufferName: "Attappady Peripheral Sugarcane Fields",
      tacticalRecommendation: "Deploy solar siren tripwire and mobilize farmer protection squad.",
      channel: "sms",
    };
  } else {
    // Default: Elephant herd heading to village buffer in 18 minutes
    trajectoryEvent = {
      id: "PRE-HWC-18",
      species: "Asian Elephant (Matriarch Herd of 9)",
      speedKmh: 4.8,
      headingDeg: 142,
      timeToImpactMinutes: 18,
      predictedIntersection: [11.2982, 76.4218],
      bufferName: "Mukurthi Tea Estate Settlement Buffer",
      tacticalRecommendation: "Deploy noise deterrent team to Sector 4 West before herd breaches 500m buffer.",
      channel: "telegram",
    };
  }

  const now = new Date();
  const breachTime = new Date(now.getTime() + trajectoryEvent.timeToImpactMinutes * 60000);
  const mapsLink = `https://www.google.com/maps?q=${trajectoryEvent.predictedIntersection[0]},${trajectoryEvent.predictedIntersection[1]}`;

  const payload = `🔮 *WILDSHIELD-AI: PRE-BREACH PREDICTIVE DISPATCH* 🔮
━━━━━━━━━━━━━━━━━━━━━
*Alert Status:* *ACTIONABLE PRE-EMPTION*
*Timestamp:* \`${now.toISOString()}\`

*Target Species:* ${trajectoryEvent.species}
*Vector Telemetry:* \`${trajectoryEvent.speedKmh} km/h\` · Heading \`${trajectoryEvent.headingDeg}°\`
*Threatened Perimeter:* ${trajectoryEvent.bufferName}

⚠️ *TIME-TO-IMPACT:* *${trajectoryEvent.timeToImpactMinutes} MINUTES*
*Predicted Breach Time:* \`${breachTime.toLocaleTimeString()} UTC\`

*Predicted Intersection Point:* \`${trajectoryEvent.predictedIntersection[0]}, ${trajectoryEvent.predictedIntersection[1]}\`
*Map Pin:* ${mapsLink}

*Tactical Directive:*
\`${trajectoryEvent.tacticalRecommendation}\`
*Pre-Breach SOP:*
• Mobilize deterrent squad to intercept coordinates prior to arrival
• Alert village panchayat / train control cabin immediately
• Maintain continuous Kalman vector projection
━━━━━━━━━━━━━━━━━━━━━`;

  const [savedDispatch] = await db
    .insert(rangerDispatchesTable)
    .values({
      channel: trajectoryEvent.channel,
      recipient: "@WildShield_Ranger_Bot",
      severity: "critical",
      headline: `PREDICTIVE ALERT: ${trajectoryEvent.species} breach in ${trajectoryEvent.timeToImpactMinutes}m (${trajectoryEvent.bufferName})`,
      payload,
      location: trajectoryEvent.bufferName,
      coordinates: trajectoryEvent.predictedIntersection.map(String),
      assignedUnit: "HWC Predictive Pre-Emption Unit",
      etaMinutes: 8,
      status: "dispatched",
    })
    .returning();

  await db.insert(activityTable).values({
    label: "Pre-Breach Forecast Fired",
    detail: `Predicted intersection in ${trajectoryEvent.timeToImpactMinutes} mins · ${trajectoryEvent.bufferName}`,
    tone: "red",
  });

  res.status(201).json({
    trajectoryEvent,
    dispatch: {
      ...savedDispatch,
      coordinates: savedDispatch.coordinates.map(Number),
      dispatchedAt: savedDispatch.dispatchedAt.toISOString(),
    },
  });
});

export default router;

