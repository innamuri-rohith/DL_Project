from openpyxl import Workbook

zone_templates = [
    {"zone_name": "Silent Valley North", "state": "Kerala", "lat": 11.304, "lon": 76.416, "risk_type": "ecological", "risk_score": 78.4, "forest_area_ha": 1240, "key_species": "Asian Elephant, Gaur", "status": "active", "source": "Sentinel-2 + SAR + Ranger report"},
    {"zone_name": "Kanha East Buffer", "state": "Madhya Pradesh", "lat": 22.338, "lon": 80.745, "risk_type": "deforestation", "risk_score": 89.1, "forest_area_ha": 1760, "key_species": "Tiger, Leopard", "status": "critical", "source": "U-Net canopy loss + SAR delta"},
    {"zone_name": "Kaziranga Wetlands", "state": "Assam", "lat": 26.573, "lon": 93.183, "risk_type": "flooding", "risk_score": 67.8, "forest_area_ha": 940, "key_species": "One-horned Rhino, Elephant", "status": "high", "source": "NDWI + rainfall anomaly"},
    {"zone_name": "Sundarbans Fringe", "state": "West Bengal", "lat": 22.023, "lon": 88.892, "risk_type": "salinity", "risk_score": 82.2, "forest_area_ha": 1525, "key_species": "Bengal Tiger, Saltwater Crocodile", "status": "critical", "source": "Surface water salinity + NDVI stress"},
    {"zone_name": "Nilgiri Tea Estate Corridor", "state": "Tamil Nadu", "lat": 11.298, "lon": 76.422, "risk_type": "human_wildlife_conflict", "risk_score": 74.9, "forest_area_ha": 1115, "key_species": "Asian Elephant, Gaur", "status": "high", "source": "Trajectory forecast + geofence proximity"},
    {"zone_name": "Pench Central Corridor", "state": "Madhya Pradesh", "lat": 21.653, "lon": 79.299, "risk_type": "road_incursion", "risk_score": 70.6, "forest_area_ha": 1335, "key_species": "Tiger, Leopard", "status": "active", "source": "SAR fragmentation + camera trap"},
    {"zone_name": "Corbett Eastern Range", "state": "Uttarakhand", "lat": 29.517, "lon": 78.958, "risk_type": "poaching", "risk_score": 76.1, "forest_area_ha": 1640, "key_species": "Elephant, Tiger", "status": "high", "source": "YOLOv8 + geofence proximity"},
    {"zone_name": "Buxa Forest Edge", "state": "West Bengal", "lat": 26.623, "lon": 89.557, "risk_type": "illegal_logging", "risk_score": 83.7, "forest_area_ha": 1180, "key_species": "Elephant, Gaur", "status": "critical", "source": "U-Net canopy loss + thermal scan"},
    {"zone_name": "Gir Dry Belt", "state": "Gujarat", "lat": 21.524, "lon": 70.866, "risk_type": "drought", "risk_score": 68.5, "forest_area_ha": 989, "key_species": "Asiatic Lion, Deer", "status": "moderate", "source": "NDVI + water retention deficit"},
    {"zone_name": "Mysuru Buffer Hills", "state": "Karnataka", "lat": 12.185, "lon": 76.342, "risk_type": "electric_fence", "risk_score": 72.3, "forest_area_ha": 1086, "key_species": "Elephant, Leopard", "status": "high", "source": "Camera trap + corridor analysis"},
    {"zone_name": "Namdapha Valley", "state": "Arunachal Pradesh", "lat": 27.535, "lon": 96.418, "risk_type": "forest_fire", "risk_score": 81.2, "forest_area_ha": 2105, "key_species": "Red Panda, Hornbill", "status": "critical", "source": "Random Forest fire risk model"},
    {"zone_name": "Bhitarkanika Delta", "state": "Odisha", "lat": 20.718, "lon": 86.832, "risk_type": "tidal_inundation", "risk_score": 69.4, "forest_area_ha": 1410, "key_species": "Saltwater Crocodile, Deer", "status": "high", "source": "NDWI + shoreline stress"}
]

species_pool = [
    "Asian Elephant", "Tiger", "Bengal Tiger", "Leopard", "Gaur", "One-horned Rhino",
    "Elephant", "Red Panda", "Sloth Bear", "Asiatic Lion", "Deer", "Saltwater Crocodile",
    "Hornbill", "Wild Boar"
]

alert_titles = [
    "Canopy Fragmentation Warning",
    "Habitat Stress Increase",
    "Salinity-driven displacement risk",
    "Settlement breach risk",
    "Wetland inundation alert",
    "Road incursion risk",
    "Poacher detection alert",
    "Illegal logging cluster",
    "Drought stress watch",
    "Fence crossing warning",
    "Fire ignition warning",
    "Tidal surge risk",
    "Human intrusion near reserve boundary",
    "Waterhole desiccation alert"
]

alert_signals = [
    "Sentinel-2 NDVI delta",
    "Waterbody retention deficit",
    "Surface water salinity anomaly",
    "Kalman trajectory intersection",
    "NDWI flood spike",
    "Vehicle corridor proximity",
    "YOLOv8 armed-human detection",
    "U-Net canopy loss patch",
    "NDVI water stress anomaly",
    "Elephant movement near settlement edge",
    "Random Forest fire probability",
    "NDWI shoreline change",
    "Thermal camera movement cluster",
    "SAR canopy disturbance"
]

headers = [
    "record_type", "zone_id", "zone_name", "state", "lat", "lon", "risk_type", "risk_score",
    "forest_area_ha", "key_species", "status", "source", "last_updated", "obs_id", "species",
    "category", "confidence", "time_utc", "alert_id", "title", "severity", "signal", "time_ago",
    "recommended_action"
]

combined_rows = []

for i in range(1000):
    zone = zone_templates[i % len(zone_templates)]
    zone_id = f"RZ-{(i % len(zone_templates)) + 1:03d}"
    record_type = ["risk_zone", "wildlife_observation", "forest_alert"][i % 3]

    if record_type == "risk_zone":
        combined_rows.append({
            "record_type": "risk_zone",
            "zone_id": zone_id,
            "zone_name": zone["zone_name"],
            "state": zone["state"],
            "lat": zone["lat"] + (i * 0.0007 % 0.03),
            "lon": zone["lon"] + (i * 0.0011 % 0.04),
            "risk_type": zone["risk_type"],
            "risk_score": round(zone["risk_score"] + (i % 15) * 0.9, 1),
            "forest_area_ha": zone["forest_area_ha"] + (i % 20) * 17,
            "key_species": zone["key_species"],
            "status": zone["status"],
            "source": zone["source"],
            "last_updated": "2026-10-12",
            "obs_id": "",
            "species": "",
            "category": "",
            "confidence": "",
            "time_utc": "",
            "alert_id": "",
            "title": "",
            "severity": "",
            "signal": "",
            "time_ago": "",
            "recommended_action": "",
        })
    elif record_type == "wildlife_observation":
        species = species_pool[i % len(species_pool)]
        confidence = round(80 + ((i * 7) % 17) + ((i % 5) * 0.8), 1)
        combined_rows.append({
            "record_type": "wildlife_observation",
            "zone_id": zone_id,
            "zone_name": zone["zone_name"],
            "state": zone["state"],
            "lat": zone["lat"] + 0.0025 * (i % 6),
            "lon": zone["lon"] + 0.0031 * (i % 7),
            "risk_type": "",
            "risk_score": "",
            "forest_area_ha": "",
            "key_species": "",
            "status": ["verified", "active", "monitored"][i % 3],
            "source": "Camera trap + ranger report",
            "last_updated": "",
            "obs_id": f"WO-{i+1:04d}",
            "species": species,
            "category": "wildlife",
            "confidence": confidence,
            "time_utc": f"2026-10-12T{(8 + (i % 12)):02d}:{(10 + (i * 7) % 45):02d}:00Z",
            "alert_id": "",
            "title": "",
            "severity": "",
            "signal": "",
            "time_ago": "",
            "recommended_action": "",
        })
    else:
        title = alert_titles[i % len(alert_titles)]
        signal = alert_signals[i % len(alert_signals)]
        severity = ["low", "medium", "high", "critical"][i % 4]
        combined_rows.append({
            "record_type": "forest_alert",
            "zone_id": zone_id,
            "zone_name": zone["zone_name"],
            "state": zone["state"],
            "lat": zone["lat"] + 0.0018 * (i % 5),
            "lon": zone["lon"] + 0.0022 * (i % 4),
            "risk_type": "",
            "risk_score": "",
            "forest_area_ha": "",
            "key_species": "",
            "status": "",
            "source": "",
            "last_updated": "",
            "obs_id": "",
            "species": "",
            "category": "",
            "confidence": "",
            "time_utc": "",
            "alert_id": f"FA-{i+1:04d}",
            "title": title,
            "severity": severity,
            "signal": signal,
            "time_ago": f"{(i % 6) + 1}h ago",
            "recommended_action": "Dispatch field response team and review sensor feed",
        })

wb = Workbook()
ws = wb.active
ws.title = "AllProjectData"
ws.append(headers)
for row in combined_rows:
    ws.append([row.get(h, "") for h in headers])

wb.save("forest-risk-complete-dataset.xlsx")
print(f"Created forest-risk-complete-dataset.xlsx with {len(combined_rows)} rows")
