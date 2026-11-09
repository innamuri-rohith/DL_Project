"""
WildShield-AI: Real-Time Geofencing Engine
Computes virtual safety boundaries around human settlements, roads, and core forest sanctuaries.
Uses Shapely / GeoPandas geometry primitives for point-in-polygon containment, buffer creation,
and geodesic distance calculation.
"""

from typing import List, Dict, Tuple, Any, Optional
import math
import json

try:
    from shapely.geometry import Point, Polygon, LineString, MultiPolygon
    from shapely.ops import nearest_points
    SHAPELY_AVAILABLE = True
except ImportError:
    SHAPELY_AVAILABLE = False


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class GeofenceBoundary:
    def __init__(self, id_str: str, name: str, fence_type: str, coordinates: List[Tuple[float, float]], buffer_meters: float = 500.0, population: Optional[int] = None):
        self.id_str = id_str
        self.name = name
        self.fence_type = fence_type  # 'settlement', 'road', 'core_reserve', 'agriculture'
        self.coordinates = coordinates  # List of (lat, lon)
        self.buffer_meters = buffer_meters
        self.population = population

        # Center point
        avg_lat = sum(p[0] for p in coordinates) / len(coordinates)
        avg_lon = sum(p[1] for p in coordinates) / len(coordinates)
        self.center = (avg_lat, avg_lon)

        if SHAPELY_AVAILABLE:
            # Note: Shapely coordinates convention is typically (x, y) = (lon, lat)
            shapely_coords = [(p[1], p[0]) for p in coordinates]
            if fence_type == 'road':
                self.geometry = LineString(shapely_coords)
            else:
                self.geometry = Polygon(shapely_coords)
        else:
            self.geometry = None

    def distance_to_point(self, lat: float, lon: float) -> float:
        """Return distance in meters from given point to this geofence boundary."""
        if SHAPELY_AVAILABLE and self.geometry is not None:
            pt = Point(lon, lat)
            # Rough conversion: 1 degree latitude ~ 111,320 meters
            # For local distance, we project degrees to meters at reference latitude
            ref_lat = math.radians(self.center[0])
            deg_to_m_lat = 111320.0
            deg_to_m_lon = 111320.0 * math.cos(ref_lat)

            # Nearest point on polygon / linestring
            nearest_geom_pt = nearest_points(self.geometry, pt)[0]
            d_lat = (nearest_geom_pt.y - lat) * deg_to_m_lat
            d_lon = (nearest_geom_pt.x - lon) * deg_to_m_lon
            return math.sqrt(d_lat * d_lat + d_lon * d_lon)
        else:
            # Pure math fallback: distance to closest edge segment
            min_dist = float('inf')
            for i in range(len(self.coordinates)):
                p1 = self.coordinates[i]
                p2 = self.coordinates[(i + 1) % len(self.coordinates)] if self.fence_type != 'road' else self.coordinates[min(i + 1, len(self.coordinates) - 1)]
                dist = haversine_distance(lat, lon, p1[0], p1[1])
                if dist < min_dist:
                    min_dist = dist
            return min_dist

    def contains_point(self, lat: float, lon: float) -> bool:
        """Check if point is inside the boundary (only applicable for polygonal fences)."""
        if self.fence_type == 'road':
            return False
        if SHAPELY_AVAILABLE and self.geometry is not None:
            return self.geometry.contains(Point(lon, lat))

        # Ray-casting algorithm for point in polygon
        inside = False
        n = len(self.coordinates)
        for i in range(n):
            j = (i - 1 + n) % n
            xi, yi = self.coordinates[i][1], self.coordinates[i][0]
            xj, yj = self.coordinates[j][1], self.coordinates[j][0]
            intersect = ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi)
            if intersect:
                inside = not inside
        return inside

    def evaluate_threat_proximity(self, lat: float, lon: float) -> Dict[str, Any]:
        """Evaluate proximity status, buffer intrusion, and risk level."""
        is_inside = self.contains_point(lat, lon)
        dist = 0.0 if is_inside else self.distance_to_point(lat, lon)

        if is_inside:
            status = 'intrusion'
            threat_level = 'critical'
            msg = f"DIRECT INTRUSION inside {self.name} perimeter!"
        elif dist <= self.buffer_meters:
            status = 'buffer_breach'
            threat_level = 'critical' if self.fence_type == 'settlement' else 'high'
            msg = f"BUFFER BREACH: Within {int(dist)}m of {self.name} (buffer is {int(self.buffer_meters)}m)"
        elif dist <= self.buffer_meters * 2.0:
            status = 'advisory'
            threat_level = 'medium'
            msg = f"Advisory zone: {int(dist)}m from {self.name}"
        else:
            status = 'safe'
            threat_level = 'low'
            msg = f"Safe distance ({int(dist)}m from {self.name})"

        return {
            'geofence_id': self.id_str,
            'geofence_name': self.name,
            'fence_type': self.fence_type,
            'distance_meters': round(dist, 1),
            'status': status,
            'threat_level': threat_level,
            'message': msg,
            'population_at_risk': self.population if status in ['intrusion', 'buffer_breach'] else 0,
        }


# Preconfigured Standard Geofences for Sierra Verde Reserve & Nilgiri Biosphere
STANDARD_GEOFENCES = [
    GeofenceBoundary(
        id_str="geo-01",
        name="Mukurthi Tea Estate Settlement",
        fence_type="settlement",
        coordinates=[
            (11.302, 76.410),
            (11.308, 76.415),
            (11.305, 76.425),
            (11.298, 76.422),
            (11.296, 76.414)
        ],
        buffer_meters=600.0,
        population=1420
    ),
    GeofenceBoundary(
        id_str="geo-02",
        name="Nilgiri Arterial Highway (KM 42-48)",
        fence_type="road",
        coordinates=[
            (11.285, 76.400),
            (11.292, 76.418),
            (11.299, 76.435),
            (11.310, 76.450)
        ],
        buffer_meters=350.0,
        population=0
    ),
    GeofenceBoundary(
        id_str="geo-03",
        name="Core Silent Valley Sanctuary Perimeter",
        fence_type="core_reserve",
        coordinates=[
            (11.270, 76.390),
            (11.320, 76.395),
            (11.325, 76.460),
            (11.265, 76.455)
        ],
        buffer_meters=1000.0,
        population=0
    ),
    GeofenceBoundary(
        id_str="geo-04",
        name="Attappady Tribal Hamlet",
        fence_type="settlement",
        coordinates=[
            (11.280, 76.435),
            (11.285, 76.442),
            (11.281, 76.448),
            (11.275, 76.440)
        ],
        buffer_meters=500.0,
        population=680
    )
]


def evaluate_all_geofences(lat: float, lon: float, geofences: Optional[List[GeofenceBoundary]] = None) -> Dict[str, Any]:
    fences = geofences or STANDARD_GEOFENCES
    results = [fence.evaluate_threat_proximity(lat, lon) for fence in fences]
    results.sort(key=lambda r: r['distance_meters'])
    nearest = results[0] if results else None
    has_critical = any(r['threat_level'] == 'critical' for r in results)

    return {
        'coordinates': [lat, lon],
        'nearest_geofence': nearest,
        'all_evaluations': results,
        'has_breach': any(r['status'] in ['intrusion', 'buffer_breach'] for r in results),
        'overall_risk': 'critical' if has_critical else ('high' if any(r['threat_level'] == 'high' for r in results) else 'safe')
    }


if __name__ == '__main__':
    # Test evaluation with a point near Mukurthi Settlement
    test_lat, test_lon = 11.301, 76.418
    res = evaluate_all_geofences(test_lat, test_lon)
    print(json.dumps(res, indent=2))
