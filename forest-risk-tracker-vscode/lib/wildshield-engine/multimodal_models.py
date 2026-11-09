"""
WildShield-AI: Multimodal Threat Detection Engine
Combines:
1. Macro Satellite Models:
   - U-Net for canopy loss & deforestation segmentation
   - Random Forest for wildfire danger probability
2. Micro Vision Models:
   - YOLOv8 / MegaDetector for wildlife identification and human/poacher intrusion
3. Multimodal Fusion Engine:
   - Cross-correlates macro satellite alerts with ground camera trap detections and geofence proximities.
"""

from typing import List, Dict, Any, Optional
import math
import random
import json


class UNetCanopySegmenter:
    """
    Simulates / wraps U-Net semantic segmentation network trained on Sentinel-2 & PlanetScope imagery
    to detect canopy disturbance, illegal logging scars, and road carving.
    """
    def __init__(self, model_version: str = "unet-v3.2-canopy"):
        self.model_version = model_version
        self.input_bands = ["B02_Blue", "B03_Green", "B04_Red", "B08_NIR", "B11_SWIR"]

    def infer_canopy_patch(self, sector_name: str, base_ndvi: float, current_ndvi: float, area_km2: float) -> Dict[str, Any]:
        """Compute pixel-level segmentation delta and return disturbed canopy polygons."""
        ndvi_loss = max(0.0, base_ndvi - current_ndvi)
        loss_pct = (ndvi_loss / max(base_ndvi, 0.01)) * 100.0

        is_significant = loss_pct >= 5.0
        affected_hectares = round((area_km2 * 100.0) * (loss_pct / 100.0), 2)
        confidence = min(98.5, 60.0 + (loss_pct * 3.2))

        severity = 'critical' if loss_pct >= 12.0 else ('high' if loss_pct >= 6.0 else 'medium')

        return {
            'model': 'U-Net-CanopyLoss-v3.2',
            'sector': sector_name,
            'base_ndvi': round(base_ndvi, 3),
            'current_ndvi': round(current_ndvi, 3),
            'canopy_loss_percent': round(loss_pct, 2),
            'affected_hectares': affected_hectares,
            'confidence': round(confidence, 1),
            'severity': severity if is_significant else 'low',
            'detected_clusters': 3 if is_significant else 0,
            'pattern': 'linear_road_clearing' if loss_pct > 10 else 'selective_logging_fringe',
            'recommended_action': 'Dispatch drone overflight to inspect canopy gap.' if is_significant else 'Monitor in next pass'
        }


class RandomForestWildfireRisk:
    """
    Simulates / wraps Random Forest Classifier + Regressor trained on MODIS/VIIRS historical fires,
    ERA5 meteorological parameters, and topography.
    """
    def __init__(self, n_estimators: int = 150):
        self.n_estimators = n_estimators

    def predict_fire_risk(self, temp_c: float, humidity_pct: float, wind_kmh: float, drought_index: float) -> Dict[str, Any]:
        """
        Evaluate fire risk using weather and fuel moisture parameters.
        drought_index: 0 to 100 (Keetch-Byram Drought Index normalized)
        """
        # Feature scoring equation
        f_temp = min(1.0, max(0.0, (temp_c - 20.0) / 25.0))
        f_dry = min(1.0, max(0.0, (70.0 - humidity_pct) / 60.0))
        f_wind = min(1.0, max(0.0, wind_kmh / 45.0))
        f_fuel = min(1.0, max(0.0, drought_index / 100.0))

        risk_score = (f_temp * 0.30 + f_dry * 0.35 + f_wind * 0.20 + f_fuel * 0.15) * 100.0
        risk_score = round(min(99.0, max(5.0, risk_score)), 1)

        level = 'critical' if risk_score >= 75 else ('high' if risk_score >= 50 else ('moderate' if risk_score >= 30 else 'low'))
        spread_bearing_deg = 45  # Wind vector direction

        return {
            'model': 'RandomForest-WildfireRisk-v2.1',
            'risk_score': risk_score,
            'threat_level': level,
            'ignition_probability': round(risk_score * 0.85, 1),
            'projected_spread_rate_kmh': round(wind_kmh * 0.12, 2) if risk_score >= 50 else 0.2,
            'spread_direction_deg': spread_bearing_deg,
            'fuel_dryness_class': 'Extremely High' if f_dry > 0.7 else ('High' if f_dry > 0.4 else 'Moderate'),
            'recommended_action': 'Pre-stage tanker units at northern firebreak' if risk_score >= 70 else 'Standard watch'
        }


class YOLOv8MegaDetector:
    """
    Simulates / wraps YOLOv8 fine-tuned on MegaDetector v5b dataset for camera trap and drone imagery.
    Classifies animals, people, vehicles, and weapons.
    """
    CLASSES = [
        "Asian Elephant",
        "Bengal Tiger",
        "Indian Leopard",
        "Sloth Bear",
        "Poacher / Armed Human",
        "Unauthorized Vehicle",
        "Chainsaw Logging Activity"
    ]

    def __init__(self, weights: str = "yolov8x-megadetector.pt"):
        self.weights = weights

    def analyze_frame(self, camera_id: str, location: str, target_class: str, confidence: float, coordinates: List[float]) -> Dict[str, Any]:
        """Generate detection payload with realistic bounding box and threat classification."""
        is_threat = "Poacher" in target_class or "Vehicle" in target_class or "Logging" in target_class
        is_conflict_prone = "Elephant" in target_class or "Tiger" in target_class or "Leopard" in target_class

        # Generate realistic normalized bounding box [ymin, xmin, ymax, xmax]
        box = [
            round(random.uniform(0.15, 0.30), 3),
            round(random.uniform(0.20, 0.40), 3),
            round(random.uniform(0.70, 0.88), 3),
            round(random.uniform(0.65, 0.85), 3)
        ]

        threat_level = 'critical' if is_threat else ('high' if is_conflict_prone else 'medium')

        return {
            'model': 'YOLOv8x-MegaDetector',
            'camera_trap_id': camera_id,
            'location': location,
            'detected_species_or_object': target_class,
            'confidence': round(confidence, 2),
            'threat_level': threat_level,
            'coordinates': coordinates,
            'bounding_box': {
                'ymin': box[0],
                'xmin': box[1],
                'ymax': box[2],
                'xmax': box[3],
                'class_label': target_class,
                'confidence': confidence
            },
            'timestamp': '2026-09-12T10:45:00Z',
            'is_human_intrusion': is_threat,
            'is_wildlife_conflict_risk': is_conflict_prone
        }


class MultimodalFusionEngine:
    """
    Fuses macro satellite signals (U-Net, Random Forest) with micro camera trap vision (YOLOv8)
    and evaluates proximity to human settlement geofences.
    """
    def __init__(self):
        self.unet = UNetCanopySegmenter()
        self.rf = RandomForestWildfireRisk()
        self.yolo = YOLOv8MegaDetector()

    def fuse_signals(self, micro_detection: Dict[str, Any], geofence_eval: Dict[str, Any], macro_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Produce unified threat score and trigger classification."""
        nearest_fence = geofence_eval.get('nearest_geofence') or {}
        dist_m = nearest_fence.get('distance_meters', 9999)
        fence_name = nearest_fence.get('geofence_name', 'Unknown')
        fence_type = nearest_fence.get('fence_type', 'none')

        target = micro_detection.get('detected_species_or_object', '')
        conf = micro_detection.get('confidence', 0.85)

        # Fusion logic
        is_elephant_near_settlement = "Elephant" in target and fence_type == 'settlement' and dist_m < 1000
        is_poacher = "Poacher" in target or "Unauthorized Vehicle" in target or "Logging" in target

        if is_elephant_near_settlement:
            threat_severity = 'critical'
            headline = f"IMMINENT HWC CONFLICT: {target} is {int(dist_m)}m from {fence_name}"
            dispatch_priority = 'P1_IMMEDIATE'
            action_code = 'DEPLOY_DETERRENT_SQUAD'
        elif is_poacher:
            threat_severity = 'critical'
            headline = f"SECURITY BREACH: {target} detected near {nearest_fence.get('geofence_name')}"
            dispatch_priority = 'P1_IMMEDIATE'
            action_code = 'INTERCEPT_PATROL'
        elif dist_m < 500:
            threat_severity = 'high'
            headline = f"Geofence buffer breach: {target} within {int(dist_m)}m of {fence_name}"
            dispatch_priority = 'P2_ELEVATED'
            action_code = 'VERIFICATION_PATROL'
        else:
            threat_severity = 'medium'
            headline = f"Observation logged: {target} moving in {micro_detection.get('location')}"
            dispatch_priority = 'P3_ROUTINE'
            action_code = 'LOG_AND_MONITOR'

        return {
            'fusion_id': f"FUSE-{random.randint(1000, 9999)}",
            'threat_severity': threat_severity,
            'dispatch_priority': dispatch_priority,
            'headline': headline,
            'action_code': action_code,
            'target': target,
            'confidence': conf,
            'coordinates': micro_detection.get('coordinates'),
            'nearest_geofence': fence_name,
            'distance_to_settlement_meters': dist_m,
            'macro_context': macro_context,
            'micro_detection': micro_detection,
            'automated_dispatch_required': threat_severity in ['critical', 'high']
        }


if __name__ == '__main__':
    engine = MultimodalFusionEngine()
    # Test sample fusion
    micro = engine.yolo.analyze_frame("CAM-04", "Silent Valley North Fringes", "Asian Elephant", 94.5, [11.304, 76.416])
    from geofence import evaluate_all_geofences
    geo_eval = evaluate_all_geofences(11.304, 76.416)
    fused = engine.fuse_signals(micro, geo_eval)
    print(json.dumps(fused, indent=2))
