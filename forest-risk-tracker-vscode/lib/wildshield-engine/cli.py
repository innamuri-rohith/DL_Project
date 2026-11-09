"""
WildShield-AI Command-Line Interface
Usage:
  py lib/wildshield-engine/cli.py evaluate --lat 11.3025 --lon 76.4162 --target "Asian Elephant Herd"
  py lib/wildshield-engine/cli.py simulate --scenario elephant_hwc
  py lib/wildshield-engine/cli.py status
"""

import sys
import json
import argparse
from geofence import evaluate_all_geofences, STANDARD_GEOFENCES
from multimodal_models import MultimodalFusionEngine
from pipeline import RangerDispatchPipeline

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def run_evaluation(lat: float, lon: float, target: str, source: str = "camera_trap"):
    engine = MultimodalFusionEngine()
    pipeline = RangerDispatchPipeline()

    geo_eval = evaluate_all_geofences(lat, lon)
    micro = engine.yolo.analyze_frame("CAM-LIVE", geo_eval['nearest_geofence']['geofence_name'], target, 94.0, [lat, lon])
    fused = engine.fuse_signals(micro, geo_eval)
    dispatch = pipeline.dispatch(fused, channel="telegram")

    return {
        'geofence_evaluation': geo_eval,
        'multimodal_threat': fused,
        'dispatch': dispatch
    }


def main():
    parser = argparse.ArgumentParser(description="WildShield-AI Engine CLI")
    subparsers = parser.add_subparsers(dest="command")

    eval_parser = subparsers.add_parser("evaluate")
    eval_parser.add_argument("--lat", type=float, required=True)
    eval_parser.add_argument("--lon", type=float, required=True)
    eval_parser.add_argument("--target", type=str, default="Asian Elephant Herd")

    subparsers.add_parser("status")

    args = parser.parse_args()

    if args.command == "evaluate":
        res = run_evaluation(args.lat, args.lon, args.target)
        print(json.dumps(res, indent=2))
    elif args.command == "status":
        print(json.dumps({
            "engine": "WildShield-AI Operational Core",
            "version": "2.4.0",
            "models": ["U-Net-CanopyLoss-v3.2", "RandomForest-WildfireRisk-v2.1", "YOLOv8x-MegaDetector"],
            "geofences_loaded": len(STANDARD_GEOFENCES),
            "dispatch_channels": ["telegram", "sms", "radio_mesh"]
        }, indent=2))
    else:
        # Default test run
        res = run_evaluation(11.3025, 76.4162, "Asian Elephant Herd (8 individuals)")
        print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
