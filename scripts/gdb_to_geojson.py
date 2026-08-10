#!/usr/bin/env python
"""Convert an ESRI File Geodatabase into WGS84 GeoJSON overlays for the WebGIS map.

Reads every feature class, reprojects to EPSG:4326 (Leaflet), drops Z/M, and
writes public/gis/<slug>.geojson plus a public/gis/manifest.json consumed by
components/map-component.tsx.

Temporary sample data — replace the .gdb and re-run to swap in real data.

Usage: .venv-gis/bin/python scripts/gdb_to_geojson.py "data/Bach Thao.gdb"
"""
import json
import re
import sys
from pathlib import Path

import geopandas as gpd
import pyogrio
from shapely import force_2d

GDB = sys.argv[1] if len(sys.argv) > 1 else "data/Bach Thao.gdb"
OUT = Path("public/gis")
OUT.mkdir(parents=True, exist_ok=True)

PALETTE = ["#2563eb", "#16a34a", "#0891b2", "#d97706", "#7c3aed",
           "#dc2626", "#db2777", "#65a30d", "#ea580c", "#0d9488"]


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9_]", "", name.lower().replace(" ", "_"))


manifest = []
layers = pyogrio.list_layers(GDB)
for i, (name, _geom) in enumerate(layers):
    gdf = gpd.read_file(GDB, layer=name)
    if gdf.crs is not None and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
    # Flatten 3D/measured geometries so Leaflet renders them cleanly.
    gdf["geometry"] = force_2d(gdf.geometry.values)

    slug = slugify(name)
    path = OUT / f"{slug}.geojson"
    gdf.to_file(path, driver="GeoJSON")

    geom_type = gdf.geom_type.dropna().mode()
    manifest.append({
        "name": name,
        "slug": slug,
        "file": f"/gis/{slug}.geojson",
        "geometry": str(geom_type.iloc[0]) if len(geom_type) else "Unknown",
        "count": int(len(gdf)),
        "color": PALETTE[i % len(PALETTE)],
    })
    print(f"  {name}: {len(gdf)} features -> {path}")

(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
print("\nmanifest.json:")
print(json.dumps(manifest, ensure_ascii=False, indent=2))
