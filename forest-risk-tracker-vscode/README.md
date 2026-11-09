# Forest Risk & Wildlife Tracker

Software-only forest monitoring dashboard for wildfire risk, deforestation signals, wildlife observations, vegetation changes, and forest department response alerts.

## What is included

- React + Vite dashboard
- Express API server
- PostgreSQL database with Drizzle ORM
- Risk zones for wildfire, deforestation, and ecological change
- Wildlife and vegetation observation log
- Forest department alert queue
- Persistent alert status updates
- Seed data for a working first run

## Dataset details

This project does not include a large raw geospatial dataset committed in a dedicated `data/` folder. Instead, it uses a combination of:

- Simulated seed data stored in the backend and database schema for risk zones, wildlife observations, vegetation signals, and alert records.
- Remote-sensing-inspired inputs modeled after Google Earth Engine products:
  - Sentinel-2 Harmonized MSI for NDVI and NDWI
  - Sentinel-1 C-band SAR backscatter for canopy disturbance and structural degradation
  - JRC Global Surface Water for water retention and drought stress estimation
- Operational features such as habitat stress index, wildlife movement alerts, geofencing, and disturbance risk are computed from these satellite-style indicators rather than from a single static CSV or image dataset.

The core satellite logic is implemented in `lib/wildshield-engine/gee_habitat_stress.py` and uses a 10-meter spatial resolution assumption, with metrics such as forage availability, canopy delta, and waterbody retention used to estimate habitat stress.

## Technologies used

- Frontend: React, Vite, TypeScript, Tailwind-style UI components
- API layer: Express 5 and TypeScript
- Database: PostgreSQL with Drizzle ORM, with embedded PGlite available for zero-config local runs
- Validation: Zod and generated API schemas
- API client generation: Orval from the OpenAPI spec
- Python analytics engine: Google Earth Engine-style habitat stress modeling, Kalman trajectory forecasting, and multimodal detection logic
- Geo processing: Shapely-style polygon and line intersection logic for hazard buffering

## Methodologies and modeling approach

1. Habitat stress modeling
   - A Habitat Stress Index (HSI) is computed from three main drivers:
     - NDVI-based forage depletion
     - Sentinel-1 SAR canopy loss signal
     - Waterbody retention and drought scarcity
   - The formula increases stress when forage is weak, SAR canopy loss is stronger, and water availability drops.

2. Predictive wildlife trajectory forecasting
   - A 2D constant-velocity Kalman filter estimates future animal positions for 15, 20, and 30 minute horizons.
   - The model projects movement vectors and calculates uncertainty radii around the forecast path.

3. Dynamic geofencing and risk intersection
   - The project defines settlement, railway, and farmland buffer zones.
   - Trajectory paths are compared against those polygons to detect probable crossings before impact.

4. Multimodal threat fusion
   - U-Net-style canopy loss modeling is used to detect likely deforestation and illegal logging patterns.
   - Random Forest wildfire risk scoring incorporates temperature, humidity, wind, and drought index.
   - YOLOv8-inspired object detection identifies animals, poachers, vehicles, or logging activity in camera or drone imagery.
   - These signals are fused with geofence proximity to trigger field dispatch recommendations.

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- (Optional) PostgreSQL 14 or newer (if not provided, an embedded PGlite database is used automatically with zero configuration required)

## Quick Start (Zero Setup)

Both the API server and Web Dashboard can be started together with a single command:

```bash
pnpm run dev
```

- Web Dashboard: [http://localhost:3000](http://localhost:3000)
- API Server: [http://localhost:5000](http://localhost:5000)

---

## Running in Separate Terminals

If you prefer running the backend and frontend separately:

### 1. Start the API server
```bash
pnpm run dev:api
```
*(Runs on port 5000. Uses embedded PGlite in `.data/pglite/` or connects to `DATABASE_URL` if defined).*

### 2. Start the web dashboard
```bash
pnpm run dev:web
```
*(Runs on port 3000 and automatically proxies `/api` to `http://127.0.0.1:5000`).*

---

## (Optional) Using an External PostgreSQL Database

If you want to use a standalone PostgreSQL database instead of embedded PGlite:

1. Set `DATABASE_URL`:
   - Windows PowerShell:
     ```powershell
     $env:DATABASE_URL="postgresql://postgres:password@localhost:5432/forest_tracker"
     ```
   - macOS / Linux:
     ```bash
     export DATABASE_URL="postgresql://postgres:password@localhost:5432/forest_tracker"
     ```
2. Push the schema:
   ```bash
   pnpm --filter @workspace/db run push
   ```
3. Start the application as usual with `pnpm run dev`.

## Useful commands

```bash
# Check all TypeScript packages
pnpm run typecheck

# Build the web app
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/forest-risk-tracker run build

# Regenerate typed API clients after changing the OpenAPI contract
pnpm --filter @workspace/api-spec run codegen
```

## Project structure

```text
artifacts/forest-risk-tracker/   React dashboard
artifacts/api-server/            Express API
lib/api-spec/                    OpenAPI source contract
lib/api-client-react/            Generated React Query client
lib/api-zod/                     Generated request/response validators
lib/db/                          Drizzle schema and database package
```