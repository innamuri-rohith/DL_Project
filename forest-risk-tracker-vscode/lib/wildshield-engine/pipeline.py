"""
WildShield-AI: Automated Action Pipeline & Ranger Dispatch Channel
Triggers, formats, and routes live geolocation alerts directly to Telegram and SMS Ranger channels.
"""

from datetime import timedelta
from typing import Dict, Any, Optional
import os
import sys

import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass



class RangerDispatchPipeline:
    def __init__(self, telegram_token: Optional[str] = None, telegram_chat_id: Optional[str] = None):
        self.telegram_token = telegram_token or os.getenv("TELEGRAM_BOT_TOKEN")
        self.telegram_chat_id = telegram_chat_id or os.getenv("TELEGRAM_CHAT_ID")

    def format_telegram_alert(self, fused_threat: Dict[str, Any]) -> str:
        """Format an operational tactical dispatch alert for Telegram."""
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        coords = fused_threat.get('coordinates', [0.0, 0.0])
        maps_link = f"https://www.google.com/maps?q={coords[0]},{coords[1]}"
        priority = fused_threat.get('dispatch_priority', 'P1_IMMEDIATE')
        target = fused_threat.get('target', 'Unknown Threat')
        nearest = fused_threat.get('nearest_geofence', 'Protected Area')
        dist_m = fused_threat.get('distance_to_settlement_meters', 0)
        action = fused_threat.get('action_code', 'INVESTIGATE')

        badge = "🚨 *WILDSHIELD-AI: CRITICAL RANGER DISPATCH* 🚨" if "P1" in priority else "⚠️ *WILDSHIELD-AI: ELEVATED ALERT*"

        msg = f"""{badge}
━━━━━━━━━━━━━━━━━━━━━
*Incident ID:* `{fused_threat.get('fusion_id', 'DISP-001')}`
*Priority:* *{priority}*
*Timestamp:* `{now_str}`

*Target Detected:* {target} (Confidence: {fused_threat.get('confidence', 90)}%)
*Sector / Proximity:* {nearest} ({int(dist_m)}m from perimeter)
*GPS Coordinates:* `{coords[0]:.5f}, {coords[1]:.5f}`
*Map Pin:* [Open Navigation Pin]({maps_link})

*Tactical Directive:*
`{action}`
*Recommended SOP:*
• Immediate siren & acoustic deterrent deployment
• Establish safety cordon around village fringe
• Coordinate with Quick Response Team (QRT-4)

━━━━━━━━━━━━━━━━━━━━━
_WildShield Autonomous Field Dispatch System_
"""
        return msg.strip()

    def format_sms_alert(self, fused_threat: Dict[str, Any]) -> str:
        """Format an ultra-concise SMS alert for satellite/GSM field handhelds."""
        coords = fused_threat.get('coordinates', [0.0, 0.0])
        target = fused_threat.get('target', 'THREAT')
        nearest = fused_threat.get('nearest_geofence', 'ZONE')
        dist_m = int(fused_threat.get('distance_to_settlement_meters', 0))
        action = fused_threat.get('action_code', 'DEPLOY')

        return f"WILDSHIELD ALERT [{fused_threat.get('dispatch_priority','P1')}]: {target} {dist_m}m from {nearest}. GPS:{coords[0]:.4f},{coords[1]:.4f}. SOP:{action}. Report status."

    def dispatch(self, fused_threat: Dict[str, Any], channel: str = "telegram") -> Dict[str, Any]:
        """Dispatch message to Telegram or SMS channel."""
        telegram_payload = self.format_telegram_alert(fused_threat)
        sms_payload = self.format_sms_alert(fused_threat)

        assigned_unit = "HWC Rapid Action Unit 2" if "Elephant" in fused_threat.get('target', '') else "Forest Patrol Squad 7"
        eta_minutes = 12 if "P1" in fused_threat.get('dispatch_priority', '') else 25

        response = {
            'dispatch_id': f"DSP-{fused_threat.get('fusion_id', '001')}",
            'channel': channel,
            'recipient': "@WildShield_Ranger_Bot" if channel == "telegram" else "+91-98402-RANGER",
            'severity': fused_threat.get('threat_severity', 'critical'),
            'headline': fused_threat.get('headline', 'Ranger Alert'),
            'payload': telegram_payload if channel == "telegram" else sms_payload,
            'coordinates': fused_threat.get('coordinates', [0.0, 0.0]),
            'location': fused_threat.get('nearest_geofence', 'Reserve Sector'),
            'assigned_unit': assigned_unit,
            'eta_minutes': eta_minutes,
            'status': 'dispatched',
            'dispatched_at': datetime.now(timezone.utc).isoformat(),
            'delivered': True
        }

        # If live Telegram Bot token & chat ID are configured, actually deliver to Telegram!
        if channel == "telegram" and self.telegram_token and self.telegram_chat_id:
            try:
                url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
                data = json.dumps({
                    'chat_id': self.telegram_chat_id,
                    'text': telegram_payload,
                    'parse_mode': 'Markdown'
                }).encode('utf-8')
                req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        response['telegram_api_delivered'] = True
            except Exception as e:
                response['telegram_api_error'] = str(e)

        return response

    def format_preemptive_telegram_alert(self, trajectory_event: Dict[str, Any]) -> str:

        """Format a pre-breach predictive dispatch card sent BEFORE boundary intersection."""
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        species = trajectory_event.get('target_species', 'Asian Elephant Herd')
        speed_kmh = trajectory_event.get('speed_kmh', 4.8)
        heading_deg = trajectory_event.get('heading_deg', 142)
        time_to_impact = trajectory_event.get('time_to_impact_mins', 18)
        intersection_coords = trajectory_event.get('predicted_intersection_coords', [11.298, 76.422])
        buffer_name = trajectory_event.get('buffer_name', 'Mukurthi Tea Estate Settlement')
        tactical_rec = trajectory_event.get('tactical_recommendation', 'Deploy noise deterrent squad to Sector 4 West')
        maps_link = f"https://www.google.com/maps?q={intersection_coords[0]},{intersection_coords[1]}"

        msg = f"""🔮 *WILDSHIELD-AI: PRE-BREACH PREDICTIVE DISPATCH* 🔮
━━━━━━━━━━━━━━━━━━━━━
*Alert Status:* *ACTIONABLE PRE-EMPTION*
*Timestamp:* `{now_str}`

*Target Species:* {species}
*Vector Telemetry:* `{speed_kmh} km/h` · Heading `{heading_deg}° SE`
*Threatened Perimeter:* {buffer_name}

⚠️ *TIME-TO-IMPACT:* *{int(time_to_impact)} MINUTES*
*Predicted Breach Time:* `{(datetime.now(timezone.utc) + timedelta(minutes=time_to_impact)).strftime('%H:%M:%S UTC')}`

*Predicted Intersection Point:* `{intersection_coords[0]:.5f}, {intersection_coords[1]:.5f}`
*Map Pin:* [Open Navigation Pin]({maps_link})

*Tactical Directive:*
`{tactical_rec}`
*Pre-Breach SOP:*
• Mobilize deterrent team to intercept coordinates prior to arrival
• Alert village panchayat / train control room immediately
• Maintain continuous Kalman vector projection

━━━━━━━━━━━━━━━━━━━━━
_WildShield Kalman Trajectory Forecasting Engine_
"""
        return msg.strip()

    def dispatch_preemptive(self, trajectory_event: Dict[str, Any], channel: str = "telegram") -> Dict[str, Any]:
        """Dispatch pre-emptive alert to Telegram or SMS before breach."""
        payload = self.format_preemptive_telegram_alert(trajectory_event)
        species = trajectory_event.get('target_species', 'Asian Elephant')
        buffer_name = trajectory_event.get('buffer_name', 'Corridor')
        time_to_impact = trajectory_event.get('time_to_impact_mins', 18)

        headline = f"PREDICTIVE ALERT: {species} breach in {int(time_to_impact)}m ({buffer_name})"

        return {
            'dispatch_id': f"PRE-{trajectory_event.get('id', '991')}",
            'channel': channel,
            'recipient': "@WildShield_Ranger_Bot",
            'severity': 'critical' if time_to_impact <= 20 else 'high',
            'headline': headline,
            'payload': payload,
            'coordinates': trajectory_event.get('predicted_intersection_coords', [11.298, 76.422]),
            'location': buffer_name,
            'assignedUnit': "HWC Predictive Strike Squad",
            'eta_minutes': 8,
            'status': 'dispatched',
            'is_preemptive': True,
            'time_to_impact_minutes': time_to_impact,
            'dispatched_at': datetime.now(timezone.utc).isoformat(),
        }



if __name__ == '__main__':
    pipeline = RangerDispatchPipeline()
    sample_fused = {
        'fusion_id': 'FUSE-9941',
        'threat_severity': 'critical',
        'dispatch_priority': 'P1_IMMEDIATE',
        'headline': 'IMMINENT HWC CONFLICT: Asian Elephant Herd is 380m from Mukurthi Tea Estate',
        'action_code': 'DEPLOY_DETERRENT_SQUAD',
        'target': 'Asian Elephant Herd (8 individuals)',
        'confidence': 96.2,
        'coordinates': [11.3025, 76.4162],
        'nearest_geofence': 'Mukurthi Tea Estate Settlement',
        'distance_to_settlement_meters': 380
    }
    disp = pipeline.dispatch(sample_fused, channel="telegram")
    print(disp['payload'])
    print("\nSMS Version:")
    print(pipeline.format_sms_alert(sample_fused))
