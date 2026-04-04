# Sour House — Project Plan

A self-hosted, file-based, multi-project, multi-floor house planning tool. Each home is a folder, each floor is a file-backed document, and the browser app is a local-first editor that reads/writes structured files rather than depending on a database.

## Core shape

Mental model: **workspace → projects (homes) → floors → layers/elements**.

- **Workspace**: the root directory on disk for all homes.
- **Project**: one house/home, with metadata, assets, and floor files.
- **Floor**: one level, such as basement, ground, first, roof.
- **Layer**: structure, furniture, electrical, plumbing, annotations, automation, measurements.
- **Object**: room, wall, door, window, outlet, light, furniture item, text note.

## Storage model

**JSON as the source of truth**, SVG generated/exported from it. JSON is better for versioning, schema evolution, validation, undo/redo snapshots, and metadata like room IDs, semantic tags, relationships, and future automation bindings. SVG is the view/export format.

### File layout

```text
homes/
  project-a/
    project.json
    assets/
    floors/
      ground-floor.json
      first-floor.json
      roof.json
    exports/
      ground-floor.svg
      ground-floor.png
```

## File format

`project.json` holds project-wide settings: units, address, default wall thickness, themes, floor ordering.

Each floor file includes:
- Floor name and elevation
- Canvas size / origin
- Walls as lines or polygons
- Rooms as closed polygons
- Openings (doors/windows)
- Placed objects and annotations
- Layer visibility state
- Snapping/grid settings
- Version number for migration

### Example floor file

```json
{
  "id": "ground-floor",
  "name": "Ground Floor",
  "elevationCm": 0,
  "units": "cm",
  "grid": { "enabled": true, "size": 10 },
  "layers": {
    "structure": true,
    "furniture": true,
    "electrical": true,
    "notes": true
  },
  "entities": [
    { "id": "wall-1", "type": "wall", "x1": 0, "y1": 0, "x2": 400, "y2": 0, "thickness": 20 },
    { "id": "room-1", "type": "room", "name": "Kitchen", "polygon": [[0,0],[400,0],[400,300],[0,300]] },
    { "id": "light-1", "type": "light", "x": 120, "y": 80, "roomId": "room-1" }
  ]
}
```

## Editor model

2D is the priority. Split the app into these modes:

- **Project dashboard**: list homes, create/import/duplicate/archive.
- **Floor editor**: draw and edit one floor at a time.
- **Whole-home navigator**: switch floors and compare stacked levels.
- **Inspector panel**: edit selected object properties.
- **Export/view mode**: SVG, PNG, PDF, maybe DXF later.

## Feature roadmap

### V1 — must-have
- Multiple projects
- Multiple floors per project
- Draw walls, rooms, doors, windows
- Snap to grid and guides
- Numeric dimensions and unit system
- Furniture/electrical symbols
- Save/load from disk-backed files
- Export to SVG and PNG
- Undo/redo
- Layer visibility

### V2 — good additions
- 3D preview
- Reusable symbol library
- Import blueprint image/PDF as tracing underlay
- Room area/perimeter calculations
- Floor duplication
- Diff/version history via Git-friendly JSON
- Collaboration later if wanted

### V3 — advanced
- Home Assistant entity mapping
- Electrical/plumbing/HVAC overlays
- Cost estimation/BOM
- Constraint checks (door swing collisions, etc.)
- Generated renovation scenarios

## Tech stack

- **Frontend**: React + TypeScript (Next.js 16 App Router)
- **Canvas/rendering**: SVG first, optionally Canvas for performance-heavy interactions
- **State**: Zustand or Redux Toolkit
- **Geometry**: dedicated geometry utility layer for snapping, intersections, polygon math
- **Backend**: Bun, with a simple file API
- **Hosting**: Docker container with bind-mounted project directory
- **Auth**: simple local auth or reverse-proxy auth (private use)

## Self-hosting architecture

Thin backend — no database. File-based APIs over a host-mounted volume.

- App container serves the frontend
- Backend exposes file-based APIs
- Host-mounted volume stores all homes
- Optional Git repo over the data folder for history
- Optional Caddy or Nginx in front for auth/TLS

### API surface

- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `PUT /projects/:id/project.json`
- `GET /projects/:id/floors/:floorId`
- `PUT /projects/:id/floors/:floorId`
- `POST /projects/:id/export/svg`

These endpoints are wrappers around filesystem reads/writes.

## Versioning and backups

- `schemaVersion` in every file
- Atomic writes (write temp then rename)
- Autosave snapshots
- Optional `history/` folder per project
- Git commit hooks for milestone saves

## UX decisions (settled)

| Decision | Choice |
|---|---|
| Source of truth | JSON |
| Geometry model | Orthogonal walls first, arbitrary angles later |
| Coordinate system | Centimeters internally |
| Object identity | Stable UUIDs everywhere |
| Selection model | Single, multi-select, grouped objects |
| Layers | Fixed core layers, custom annotation layers later |
| Import/export | Image underlay first, DXF later |

## MVP summary

| Area | Decision |
|---|---|
| Projects | One folder per home, file-backed metadata |
| Floors | One JSON file per floor, ordered in `project.json` |
| Rendering | SVG-based 2D editor first |
| Export | SVG and PNG first, PDF next |
| Layers | Structure, furniture, electrical, notes |
| Backend | Thin Bun filesystem API |
| Hosting | Docker + bind-mounted data directory |
| History | Git-friendly JSON + snapshots |

## Open question

Pick the app's **primary use case** — this changes the data model more than anything else:

1. **Architectural planning**: walls, rooms, dimensions, openings
2. **Interior planning**: furniture, layout, materials, decor
3. **Systems planning**: lighting, electrical, smart home, networking
