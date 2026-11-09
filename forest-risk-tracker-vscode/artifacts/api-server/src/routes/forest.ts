import { Router, type IRouter } from "express";
import { db, activityTable, alertsTable, observationsTable, riskZonesTable, desc, eq } from "@workspace/db";
import {
  CreateObservationBody,
  GetAlertsQueryParams,
  GetObservationsQueryParams,
  UpdateAlertBody,
  UpdateAlertParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const seedZones = [
  { name: "Silent Valley North", region: "Nilgiri Biosphere", risk: "91.00", riskType: "wildfire", change: "14.20", area: "1840.00", coordinates: ["11.295", "76.420"] },
  { name: "Kanha Buffer East", region: "Madhya Pradesh", risk: "78.00", riskType: "deforestation", change: "8.60", area: "920.00", coordinates: ["22.334", "80.742"] },
  { name: "Kaziranga Wetlands", region: "Assam Floodplain", risk: "64.00", riskType: "ecological", change: "-2.40", area: "640.00", coordinates: ["26.577", "93.171"] },
  { name: "Bandipur South Ridge", region: "Western Ghats", risk: "49.00", riskType: "wildfire", change: "3.10", area: "1180.00", coordinates: ["11.650", "76.630"] },
];

const seedObservations = [
  { type: "wildlife", subject: "Asian elephant herd", location: "Silent Valley North", confidence: "96.00", source: "Sentinel-2 + ranger report", status: "verified" },
  { type: "wildlife", subject: "Tiger corridor crossing", location: "Kanha Buffer East", confidence: "88.00", source: "Camera trap sync", status: "verified" },
  { type: "vegetation", subject: "Canopy stress cluster", location: "Bandipur South Ridge", confidence: "79.00", source: "NDVI change model", status: "review" },
  { type: "vegetation", subject: "Wetland regeneration", location: "Kaziranga Wetlands", confidence: "91.00", source: "Sentinel-2 time series", status: "emerging" },
];

const seedAlerts = [
  { title: "Rapid heat signature detected", description: "A cluster of thermal anomalies was detected along the northern firebreak.", severity: "critical", location: "Silent Valley North", status: "open", signal: "VIIRS thermal + wind" },
  { title: "Canopy loss above threshold", description: "Vegetation index dropped 8.6% in the monitored buffer over the last 14 days.", severity: "high", location: "Kanha Buffer East", status: "open", signal: "NDVI change model" },
  { title: "Wildlife corridor activity", description: "A verified elephant herd signal is moving toward a high-traffic access road.", severity: "medium", location: "Silent Valley North", status: "acknowledged", signal: "Ranger report + satellite" },
  { title: "Seasonal vegetation recovery", description: "Wetland vegetation is recovering above the expected seasonal baseline.", severity: "low", location: "Kaziranga Wetlands", status: "resolved", signal: "NDVI time series" },
];

const seedActivity = [
  { label: "Risk model refreshed", detail: "4 zones recalculated from the latest satellite pass", tone: "blue" },
  { label: "Alert escalated", detail: "Rapid heat signature detected in Silent Valley North", tone: "red" },
  { label: "Wildlife signal verified", detail: "Asian elephant herd · ranger report matched", tone: "green" },
  { label: "Field review requested", detail: "Canopy stress cluster needs local confirmation", tone: "amber" },
];

let seedPromise: Promise<void> | null = null;

async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const [zoneCount, observationCount, alertCount, activityCount] = await Promise.all([
        db.select({ id: riskZonesTable.id }).from(riskZonesTable).limit(1),
        db.select({ id: observationsTable.id }).from(observationsTable).limit(1),
        db.select({ id: alertsTable.id }).from(alertsTable).limit(1),
        db.select({ id: activityTable.id }).from(activityTable).limit(1),
      ]);
      if (zoneCount.length === 0) await db.insert(riskZonesTable).values(seedZones);
      if (observationCount.length === 0) await db.insert(observationsTable).values(seedObservations);
      if (alertCount.length === 0) await db.insert(alertsTable).values(seedAlerts);
      if (activityCount.length === 0) await db.insert(activityTable).values(seedActivity);
    })();
  }
  await seedPromise;
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapZone(zone: typeof riskZonesTable.$inferSelect) {
  return {
    ...zone,
    risk: Number(zone.risk),
    change: Number(zone.change),
    area: Number(zone.area),
    coordinates: zone.coordinates.map(Number),
    updatedAt: iso(zone.updatedAt),
  };
}

function mapObservation(observation: typeof observationsTable.$inferSelect) {
  return { ...observation, confidence: Number(observation.confidence), recordedAt: iso(observation.recordedAt) };
}

function mapAlert(alert: typeof alertsTable.$inferSelect) {
  return { ...alert, createdAt: iso(alert.createdAt) };
}

router.get("/forest/overview", async (req, res) => {
  await ensureSeeded();
  const [zones, alerts, observations] = await Promise.all([
    db.select().from(riskZonesTable),
    db.select().from(alertsTable),
    db.select().from(observationsTable),
  ]);
  const openAlerts = alerts.filter((alert) => alert.status !== "resolved");
  const highRiskZones = zones.filter((zone) => Number(zone.risk) >= 70);
  const wildlifeSignals = observations.filter((observation) => observation.type === "wildlife").length;
  req.log.info({ zones: zones.length, alerts: openAlerts.length }, "Forest overview requested");
  res.json({
    lastUpdated: new Date().toISOString(),
    monitoredArea: zones.reduce((sum, zone) => sum + Number(zone.area), 0),
    highRiskZones: highRiskZones.length,
    activeAlerts: openAlerts.length,
    wildlifeSignals,
    vegetationChange: -4.8,
    trend: [
      { label: "08 Aug", risk: 42, vegetation: 78 },
      { label: "15 Aug", risk: 48, vegetation: 74 },
      { label: "22 Aug", risk: 45, vegetation: 76 },
      { label: "29 Aug", risk: 61, vegetation: 69 },
      { label: "05 Sep", risk: 68, vegetation: 64 },
    ],
  });
});

router.get("/forest/risk-zones", async (_req, res) => {
  await ensureSeeded();
  const zones = await db.select().from(riskZonesTable).orderBy(desc(riskZonesTable.risk));
  res.json(zones.map(mapZone));
});

const INDIA_DANGER_ZONES = [
  {
    id: 1,
    name: "Silent Valley & Nilgiri Biosphere",
    state: "Kerala / Tamil Nadu",
    stateCode: "KL",
    region: "Western Ghats Eco-Belt",
    risk: 91,
    riskType: "wildfire",
    change: -14.2,
    area: 1840,
    coordinates: [11.295, 76.420],
    vegetation: {
      currentNdvi: 0.68,
      baselineNdvi: 0.81,
      canopyDensityPct: 74,
      lossRate6mo: -8.4,
      primaryDriver: "Severe dry season heatwave drying upper canopy & flammable undergrowth",
      unetStatus: "U-Net segmented 320 hectares under severe moisture stress along firebreak",
      history: [
        { month: "Apr", ndvi: 0.81, canopy: 82 },
        { month: "May", ndvi: 0.79, canopy: 80 },
        { month: "Jun", ndvi: 0.84, canopy: 85 },
        { month: "Jul", ndvi: 0.82, canopy: 83 },
        { month: "Aug", ndvi: 0.74, canopy: 78 },
        { month: "Sep", ndvi: 0.68, canopy: 74 },
      ],
    },
    wildlife: {
      keySpecies: ["Asian Elephant (Herd of 14)", "Bengal Tiger", "Lion-tailed Macaque", "Nilgiri Tahr"],
      activeSignals: 6,
      lastSighting: "28 mins ago · Radio telemetry collar #EL-09 matched",
      corridorStatus: "critical",
      cameraTrapCode: "CAM-TRAP-01",
      movementHeading: "South-Southeast towards Mukurthi tea estate fringe",
      threatDescription: "Elephant breeding herd moving across dried riverbed into human settlement buffer zone.",
    },
    alerts: [
      { id: "A-01", title: "VIIRS Thermal Cluster Alert", severity: "critical", signal: "VIIRS 375m high-temperature anomaly", time: "14m ago" },
      { id: "A-02", title: "Canopy Dryness Flammability Warning", severity: "high", signal: "Random Forest fire danger index 84%", time: "1h ago" },
      { id: "A-03", title: "HWC Corridor Crossing Alert", severity: "critical", signal: "Acoustic sensor + camera trap sync", time: "45m ago" },
    ],
    humanDanger: {
      nearestSettlement: "Mukurthi Tea Estate & Attappady Hamlets",
      distanceMeters: 380,
      populationAtRisk: 2100,
      hwcRiskLevel: "critical",
      conflictHistory: "5 crop raiding incidents recorded in last 30 days; 2 boundary wall damages.",
      recommendedSOP: "Deploy acoustic siren deterrents, establish village defense cordon, pre-stage QRT-4 squad.",
      geofenceStatus: "Buffer Breach (Within 500m)",
    },
  },
  {
    id: 2,
    name: "Kanha-Pench Tiger Corridor",
    state: "Madhya Pradesh",
    stateCode: "MP",
    region: "Central Indian Highlands",
    risk: 84,
    riskType: "deforestation",
    change: -11.6,
    area: 920,
    coordinates: [22.334, 80.742],
    vegetation: {
      currentNdvi: 0.59,
      baselineNdvi: 0.72,
      canopyDensityPct: 62,
      lossRate6mo: -14.2,
      primaryDriver: "Linear road widening, transmission line clearing & illegal selective logging",
      unetStatus: "U-Net detected 14.2 hectares of fragmented canopy strips along highway",
      history: [
        { month: "Apr", ndvi: 0.71, canopy: 72 },
        { month: "May", ndvi: 0.69, canopy: 70 },
        { month: "Jun", ndvi: 0.73, canopy: 74 },
        { month: "Jul", ndvi: 0.70, canopy: 71 },
        { month: "Aug", ndvi: 0.64, canopy: 66 },
        { month: "Sep", ndvi: 0.59, canopy: 62 },
      ],
    },
    wildlife: {
      keySpecies: ["Royal Bengal Tiger (T-24 lineage)", "Indian Leopard", "Barasingha (Swamp Deer)", "Dhole Pack"],
      activeSignals: 4,
      lastSighting: "1h ago · Camera trap CAM-KP-02 auto-sync",
      corridorStatus: "critical",
      cameraTrapCode: "CAM-KP-02",
      movementHeading: "North-East crossing national highway bypass",
      threatDescription: "Adult male tiger crossing unmitigated road corridor during peak evening freight hours.",
    },
    alerts: [
      { id: "A-04", title: "Canopy Fragmentation Warning", severity: "high", signal: "Sentinel-2 multi-spectral NDVI delta", time: "2h ago" },
      { id: "A-05", title: "Unauthorized Vehicle & Chainsaw Acoustic", severity: "critical", signal: "Microphone grid detection", time: "3h ago" },
    ],
    humanDanger: {
      nearestSettlement: "Baihar Village Cluster",
      distanceMeters: 740,
      populationAtRisk: 3400,
      hwcRiskLevel: "high",
      conflictHistory: "3 cattle predation events in village grazing commons over past fortnight.",
      recommendedSOP: "Restrict forest access, deploy camera drone verification, issue farmer grazing advisory.",
      geofenceStatus: "Advisory Zone (740m)",
    },
  },
  {
    id: 3,
    name: "Kaziranga & Brahmaputra Wetlands",
    state: "Assam",
    stateCode: "AS",
    region: "Brahmaputra Floodplain",
    risk: 76,
    riskType: "ecological",
    change: -4.2,
    area: 640,
    coordinates: [26.577, 93.171],
    vegetation: {
      currentNdvi: 0.72,
      baselineNdvi: 0.76,
      canopyDensityPct: 68,
      lossRate6mo: -4.2,
      primaryDriver: "Monsoon wetland submergence, silt deposition & invasive water hyacinth mats",
      unetStatus: "U-Net mapped 48 sq km water inundation across northern grasslands",
      history: [
        { month: "Apr", ndvi: 0.75, canopy: 70 },
        { month: "May", ndvi: 0.78, canopy: 72 },
        { month: "Jun", ndvi: 0.79, canopy: 73 },
        { month: "Jul", ndvi: 0.65, canopy: 61 },
        { month: "Aug", ndvi: 0.69, canopy: 64 },
        { month: "Sep", ndvi: 0.72, canopy: 68 },
      ],
    },
    wildlife: {
      keySpecies: ["Greater One-horned Rhino", "Wild Water Buffalo", "Eastern Swamp Deer", "Bengal Tiger"],
      activeSignals: 8,
      lastSighting: "12 mins ago · Drone Falcon-KZ overflight",
      corridorStatus: "watch",
      cameraTrapCode: "CAM-KZ-04",
      movementHeading: "South toward Karbi Anglong highlands refuge",
      threatDescription: "Rhino herds navigating highland migration corridors to escape seasonal water surge.",
    },
    alerts: [
      { id: "A-06", title: "Highway NH-715 Animal Speed Barrier Alert", severity: "high", signal: "Automated speed radar sensor", time: "22m ago" },
      { id: "A-07", title: "Flood Level High Ground Inundation", severity: "medium", signal: "Hydrological telemetry sensor", time: "4h ago" },
    ],
    humanDanger: {
      nearestSettlement: "Bokakhat Peripheral Fringes",
      distanceMeters: 1100,
      populationAtRisk: 1800,
      hwcRiskLevel: "moderate",
      conflictHistory: "Occasional rhino straying into paddy fields during night high water.",
      recommendedSOP: "Activate highway convoy pacing, manned highland refuge guards, anti-poaching boats.",
      geofenceStatus: "Safe Buffer (> 1km)",
    },
  },
  {
    id: 4,
    name: "Jim Corbett & Terai Arc Corridor",
    state: "Uttarakhand",
    stateCode: "UK",
    region: "Shivalik & Terai Arc",
    risk: 82,
    riskType: "wildlife_conflict",
    change: -6.8,
    area: 1288,
    coordinates: [29.530, 78.774],
    vegetation: {
      currentNdvi: 0.65,
      baselineNdvi: 0.73,
      canopyDensityPct: 71,
      lossRate6mo: -6.8,
      primaryDriver: "Riverbank gravel mining, luxury resort corridor encroachment & river trail narrowing",
      unetStatus: "U-Net identified illegal cleared clearing along Kosi river corridor",
      history: [
        { month: "Apr", ndvi: 0.73, canopy: 75 },
        { month: "May", ndvi: 0.70, canopy: 73 },
        { month: "Jun", ndvi: 0.76, canopy: 78 },
        { month: "Jul", ndvi: 0.74, canopy: 77 },
        { month: "Aug", ndvi: 0.69, canopy: 74 },
        { month: "Sep", ndvi: 0.65, canopy: 71 },
      ],
    },
    wildlife: {
      keySpecies: ["Royal Bengal Tiger (Breeding Females)", "Asian Elephant Tuskers", "Gharial", "Sambar"],
      activeSignals: 5,
      lastSighting: "18 mins ago · Foot patrol pugmark confirmation",
      corridorStatus: "critical",
      cameraTrapCode: "CAM-CORB-08",
      movementHeading: "West crossing Ramganga river towards Mohan buffer",
      threatDescription: "High frequency tiger movement along village footpaths bordering tourist resorts.",
    },
    alerts: [
      { id: "A-08", title: "Unauthorized Night Pedestrian Intrusion", severity: "critical", signal: "PIR motion sensor grid", time: "1h ago" },
      { id: "A-09", title: "Tiger-Human Proximity Warning", severity: "critical", signal: "Camera trap YOLOv8 detection", time: "35m ago" },
    ],
    humanDanger: {
      nearestSettlement: "Mohan & Dhangarhi Villages",
      distanceMeters: 420,
      populationAtRisk: 2750,
      hwcRiskLevel: "critical",
      conflictHistory: "4 human injuries and repeated evening encounters reported over past 60 days.",
      recommendedSOP: "Enforce dusk curfew, install solar high-intensity lighting, maintain round-the-clock QRT jeep.",
      geofenceStatus: "Buffer Breach (Within 500m)",
    },
  },
  {
    id: 5,
    name: "Sundarbans Mangrove Tiger Delta",
    state: "West Bengal",
    stateCode: "WB",
    region: "Ganga-Brahmaputra Mangroves",
    risk: 88,
    riskType: "ecological",
    change: -11.5,
    area: 2585,
    coordinates: [21.949, 88.899],
    vegetation: {
      currentNdvi: 0.54,
      baselineNdvi: 0.65,
      canopyDensityPct: 58,
      lossRate6mo: -11.5,
      primaryDriver: "High soil salinity intrusion, cyclone storm surge embankment erosion & mangrove die-back",
      unetStatus: "U-Net segmented 410 hectares of defoliated mangrove canopy along tidal creeks",
      history: [
        { month: "Apr", ndvi: 0.64, canopy: 66 },
        { month: "May", ndvi: 0.61, canopy: 63 },
        { month: "Jun", ndvi: 0.66, canopy: 68 },
        { month: "Jul", ndvi: 0.59, canopy: 62 },
        { month: "Aug", ndvi: 0.56, canopy: 60 },
        { month: "Sep", ndvi: 0.54, canopy: 58 },
      ],
    },
    wildlife: {
      keySpecies: ["Royal Bengal Tiger (Swimmer Clade)", "Saltwater Crocodile", "Irrawaddy Dolphin", "Fishing Cat"],
      activeSignals: 5,
      lastSighting: "40 mins ago · Forest guard boat patrol visual",
      corridorStatus: "critical",
      cameraTrapCode: "CAM-SUND-03",
      movementHeading: "North-West crossing Matla river creek into Gosaba buffer",
      threatDescription: "Tigers swimming across narrow tidal creeks directly into honey-collector and fisherman camps.",
    },
    alerts: [
      { id: "A-10", title: "Tidal Embankment Breached", severity: "critical", signal: "Automated tide gauge sensor", time: "1h ago" },
      { id: "A-11", title: "Tiger Incursion Net Breach", severity: "critical", signal: "Nylon fence tension sensor", time: "50m ago" },
    ],
    humanDanger: {
      nearestSettlement: "Gosaba & Bali Island Villages",
      distanceMeters: 620,
      populationAtRisk: 4800,
      hwcRiskLevel: "high",
      conflictHistory: "6 fatal human-tiger interactions in the buffer zone over the past 12 months.",
      recommendedSOP: "Repair nylon net perimeter fences, deploy armed forest speedboats, mandate protective face-masks.",
      geofenceStatus: "Advisory Buffer (620m)",
    },
  },
  {
    id: 6,
    name: "Bandipur-Nagarhole Corridor",
    state: "Karnataka",
    stateCode: "KA",
    region: "Western Ghats - Nilgiri South",
    risk: 73,
    riskType: "wildfire",
    change: -5.2,
    area: 1180,
    coordinates: [11.666, 76.629],
    vegetation: {
      currentNdvi: 0.61,
      baselineNdvi: 0.68,
      canopyDensityPct: 66,
      lossRate6mo: -5.2,
      primaryDriver: "Lantana camara invasive weed proliferation drying out native understory flammability",
      unetStatus: "U-Net identified high-density Lantana weed fuel beds bordering southern fireline",
      history: [
        { month: "Apr", ndvi: 0.67, canopy: 71 },
        { month: "May", ndvi: 0.65, canopy: 69 },
        { month: "Jun", ndvi: 0.72, canopy: 75 },
        { month: "Jul", ndvi: 0.70, canopy: 73 },
        { month: "Aug", ndvi: 0.65, canopy: 69 },
        { month: "Sep", ndvi: 0.61, canopy: 66 },
      ],
    },
    wildlife: {
      keySpecies: ["Asian Elephants", "Indian Leopards", "Bengal Tigers", "Gaur (Indian Bison)"],
      activeSignals: 7,
      lastSighting: "15 mins ago · Highway patrol visual sync",
      corridorStatus: "watch",
      cameraTrapCode: "CAM-BAND-05",
      movementHeading: "South crossing NH-766 Mysore-Ooty road",
      threatDescription: "Elephant herds crossing national highway corridor during early evening vehicle congestion.",
    },
    alerts: [
      { id: "A-12", title: "Lantana High Fuel Combustibility Alert", severity: "high", signal: "Random Forest wildfire scoring", time: "2h ago" },
      { id: "A-13", title: "Night Vehicular Collision Warning", severity: "medium", signal: "Highway speed sensor trigger", time: "3h ago" },
    ],
    humanDanger: {
      nearestSettlement: "Gundlupet Agricultural Hamlets",
      distanceMeters: 550,
      populationAtRisk: 1600,
      hwcRiskLevel: "high",
      conflictHistory: "Crop raiding frequency spikes in sugarcane harvest season; electric fences breached.",
      recommendedSOP: "Clear firebreaks of Lantana, maintain elephant-proof trenches (EPT), activate optical night patrols.",
      geofenceStatus: "Advisory Buffer (550m)",
    },
  },
  {
    id: 7,
    name: "Gir National Park & Saurashtra Coast",
    state: "Gujarat",
    stateCode: "GJ",
    region: "Saurashtra Dry Deciduous",
    risk: 79,
    riskType: "wildlife_conflict",
    change: -7.1,
    area: 1412,
    coordinates: [21.124, 70.824],
    vegetation: {
      currentNdvi: 0.44,
      baselineNdvi: 0.52,
      canopyDensityPct: 42,
      lossRate6mo: -7.1,
      primaryDriver: "Semi-arid drought stress, open scrub thinning & livestock grazing pressure along fringes",
      unetStatus: "U-Net detected scrub degradation along eastern Shetrunji river corridor",
      history: [
        { month: "Apr", ndvi: 0.50, canopy: 46 },
        { month: "May", ndvi: 0.45, canopy: 43 },
        { month: "Jun", ndvi: 0.53, canopy: 48 },
        { month: "Jul", ndvi: 0.51, canopy: 47 },
        { month: "Aug", ndvi: 0.47, canopy: 44 },
        { month: "Sep", ndvi: 0.44, canopy: 42 },
      ],
    },
    wildlife: {
      keySpecies: ["Asiatic Lion (Pride of 9)", "Striped Hyena", "Chinkara", "Indian Leopard"],
      activeSignals: 6,
      lastSighting: "10 mins ago · Radio GPS collar #LION-M28",
      corridorStatus: "critical",
      cameraTrapCode: "CAM-GIR-02",
      movementHeading: "East toward coastal agro-pastoral scrublands",
      threatDescription: "Asiatic lions dispersing outside sanctuary borders sheltering in village mango orchards.",
    },
    alerts: [
      { id: "A-14", title: "Lion Pride Tracking Near Railway Track", severity: "critical", signal: "Automated geofence proximity trigger", time: "18m ago" },
      { id: "A-15", title: "Open Farm Well Proximity Hazard", severity: "high", signal: "Ranger patrol GPS pin", time: "1h ago" },
    ],
    humanDanger: {
      nearestSettlement: "Talala & Sasan Farm Settlements",
      distanceMeters: 320,
      populationAtRisk: 2300,
      hwcRiskLevel: "high",
      conflictHistory: "Frequent cattle and buffalo predation inside open sheds; peaceful co-existence strained.",
      recommendedSOP: "Cap all open agricultural irrigation wells, speed limits on Pipavav freight trains, deploy lion trackers.",
      geofenceStatus: "Buffer Breach (Within 350m)",
    },
  },
  {
    id: 8,
    name: "Simlipal Biosphere Reserve",
    state: "Odisha",
    stateCode: "OD",
    region: "Eastern Ghats Ecozone",
    risk: 86,
    riskType: "wildfire",
    change: -12.8,
    area: 2750,
    coordinates: [21.855, 86.342],
    vegetation: {
      currentNdvi: 0.67,
      baselineNdvi: 0.79,
      canopyDensityPct: 69,
      lossRate6mo: -12.8,
      primaryDriver: "Recurring ground forest fires ignited during Mahua flower and Sal leaf collection",
      unetStatus: "U-Net segmented 680 hectares of ground burn scars across central core plateau",
      history: [
        { month: "Apr", ndvi: 0.77, canopy: 77 },
        { month: "May", ndvi: 0.72, canopy: 73 },
        { month: "Jun", ndvi: 0.81, canopy: 80 },
        { month: "Jul", ndvi: 0.79, canopy: 78 },
        { month: "Aug", ndvi: 0.73, canopy: 73 },
        { month: "Sep", ndvi: 0.67, canopy: 69 },
      ],
    },
    wildlife: {
      keySpecies: ["Melanistic (Black) Tiger", "Asian Elephants", "Indian Pangolin", "Chausingha (Four-horned Antelope)"],
      activeSignals: 5,
      lastSighting: "32 mins ago · Thermal sensor cluster sync",
      corridorStatus: "critical",
      cameraTrapCode: "CAM-SIM-07",
      movementHeading: "North-East fleeing smoke plume toward Pithabata range",
      threatDescription: "Rare pseudo-melanistic tiger displaced by ground fire moving toward human peripheral villages.",
    },
    alerts: [
      { id: "A-16", title: "12 Simultaneous Active Fire Hotspots", severity: "critical", signal: "MODIS/VIIRS thermal pass", time: "8m ago" },
      { id: "A-17", title: "Dense Smoke Plume Dispersion", severity: "high", signal: "Sentinel-3 optical aerosol index", time: "45m ago" },
    ],
    humanDanger: {
      nearestSettlement: "Baripada Fringe Tribal Villages",
      distanceMeters: 850,
      populationAtRisk: 3100,
      hwcRiskLevel: "moderate",
      conflictHistory: "Smoke causing respiratory emergencies in village schools; minor wild elephant crop raids.",
      recommendedSOP: "Mobilize 120 fire-blower squads, engage tribal community fire marshals, deploy water drops.",
      geofenceStatus: "Advisory Buffer (850m)",
    },
  },
  {
    id: 9,
    name: "Ranthambore National Park",
    state: "Rajasthan",
    stateCode: "RJ",
    region: "Aravalli & Vindhya Confluence",
    risk: 71,
    riskType: "deforestation",
    change: -5.9,
    area: 1334,
    coordinates: [26.017, 76.502],
    vegetation: {
      currentNdvi: 0.46,
      baselineNdvi: 0.54,
      canopyDensityPct: 45,
      lossRate6mo: -5.9,
      primaryDriver: "Illegal firewood extraction, cattle lopping along boundary walls & dry scrub erosion",
      unetStatus: "U-Net detected localized canopy thinning along Kailadevi corridor route",
      history: [
        { month: "Apr", ndvi: 0.51, canopy: 49 },
        { month: "May", ndvi: 0.47, canopy: 46 },
        { month: "Jun", ndvi: 0.55, canopy: 52 },
        { month: "Jul", ndvi: 0.53, canopy: 51 },
        { month: "Aug", ndvi: 0.49, canopy: 48 },
        { month: "Sep", ndvi: 0.46, canopy: 45 },
      ],
    },
    wildlife: {
      keySpecies: ["Royal Bengal Tiger (Arrowhead Clan)", "Sloth Bear", "Mugger Crocodile", "Caracal"],
      activeSignals: 6,
      lastSighting: "5 mins ago · Drone overflight visual match",
      corridorStatus: "watch",
      cameraTrapCode: "CAM-RANTH-01",
      movementHeading: "North-West toward Sawai Madhopur peripheral ravines",
      threatDescription: "Sub-adult tiger exploring territory venturing into ravines bordering township schools.",
    },
    alerts: [
      { id: "A-18", title: "Boundary Masonry Wall Gap Detected", severity: "medium", signal: "Ground sensor patrol report", time: "2h ago" },
      { id: "A-19", title: "Waterhole Drought Desiccation Alert", severity: "high", signal: "Water level sensor trigger", time: "5h ago" },
    ],
    humanDanger: {
      nearestSettlement: "Sawai Madhopur Peripheral Wards",
      distanceMeters: 480,
      populationAtRisk: 5200,
      hwcRiskLevel: "high",
      conflictHistory: "Tigers repeatedly sighted in peripheral mustard fields; livestock cattle taken.",
      recommendedSOP: "Repair boundary masonry breach, deploy quick response vehicle patrol, refill solar borewells.",
      geofenceStatus: "Buffer Breach (480m)",
    },
  },
  {
    id: 10,
    name: "Pakke & Nameri Sub-Himalayan Corridor",
    state: "Arunachal Pradesh / Assam",
    stateCode: "AR",
    region: "Eastern Himalayan Foothills",
    risk: 75,
    riskType: "deforestation",
    change: -8.1,
    area: 860,
    coordinates: [27.025, 92.930],
    vegetation: {
      currentNdvi: 0.79,
      baselineNdvi: 0.88,
      canopyDensityPct: 82,
      lossRate6mo: -8.1,
      primaryDriver: "Illegal timber felling of valuable hardwood & agricultural riverbed encroachment",
      unetStatus: "U-Net detected 240 hectares of selective hardwood felling along Bhoreli river",
      history: [
        { month: "Apr", ndvi: 0.88, canopy: 89 },
        { month: "May", ndvi: 0.85, canopy: 87 },
        { month: "Jun", ndvi: 0.91, canopy: 92 },
        { month: "Jul", ndvi: 0.89, canopy: 90 },
        { month: "Aug", ndvi: 0.84, canopy: 86 },
        { month: "Sep", ndvi: 0.79, canopy: 82 },
      ],
    },
    wildlife: {
      keySpecies: ["Great Hornbill (Breeding Pairs)", "Clouded Leopard", "Asian Elephant Herd", "White-winged Wood Duck"],
      activeSignals: 5,
      lastSighting: "50 mins ago · Acoustic hornbill monitoring grid",
      corridorStatus: "watch",
      cameraTrapCode: "CAM-PAKKE-04",
      movementHeading: "South across Jia Bhoreli river toward Nameri buffer",
      threatDescription: "Elephant herd river crossing disrupted by illegal timber raft floating operations.",
    },
    alerts: [
      { id: "A-20", title: "Acoustic Gunshot & Chainsaw Trigger", severity: "critical", signal: "Microphone sensor array #PK-09", time: "1h ago" },
      { id: "A-21", title: "River Raft Timber Extraction Detected", severity: "high", signal: "Thermal UAV night sweep", time: "2h ago" },
    ],
    humanDanger: {
      nearestSettlement: "Bhalukpong Tribal Hamlets",
      distanceMeters: 920,
      populationAtRisk: 1400,
      hwcRiskLevel: "moderate",
      conflictHistory: "Elephants entering community orange orchards during pre-harvest ripening.",
      recommendedSOP: "Intercept river log rafts, deploy community hornbill nest protectors, solar boundary fencing.",
      geofenceStatus: "Advisory Zone (920m)",
    },
  },
];

router.get("/forest/india-zones", async (_req, res) => {
  res.json(INDIA_DANGER_ZONES);
});


router.get("/forest/observations", async (req, res) => {
  await ensureSeeded();
  const query = GetObservationsQueryParams.parse(req.query);
  const rows = await db.select().from(observationsTable).orderBy(desc(observationsTable.recordedAt));
  const filtered = query.type === "all" ? rows : rows.filter((row) => row.type === query.type);
  res.json(filtered.slice(0, query.limit).map(mapObservation));
});

router.post("/forest/observations", async (req, res) => {
  await ensureSeeded();
  const input = CreateObservationBody.parse(req.body);
  const [created] = await db.insert(observationsTable).values({
    ...input,
    confidence: String(input.confidence),
    status: input.confidence >= 85 ? "verified" : "review",
  }).returning();
  res.status(201).json(mapObservation(created));
});

router.get("/forest/alerts", async (req, res) => {
  await ensureSeeded();
  const query = GetAlertsQueryParams.parse(req.query);
  const rows = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt));
  const filtered = query.status === "all" ? rows : rows.filter((row) => row.status === query.status);
  res.json(filtered.map(mapAlert));
});

router.patch("/forest/alerts/:id", async (req, res) => {
  await ensureSeeded();
  const { id } = UpdateAlertParams.parse(req.params);
  const { status } = UpdateAlertBody.parse(req.body);
  const [updated] = await db.update(alertsTable).set({ status }).where(eq(alertsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  req.log.info({ id, status }, "Forest alert updated");
  res.json(mapAlert(updated));
});

router.get("/forest/activity", async (_req, res) => {
  await ensureSeeded();
  const rows = await db.select().from(activityTable).orderBy(desc(activityTable.timestamp));
  res.json(rows.map((item) => ({ ...item, timestamp: iso(item.timestamp) })));
});

export default router;