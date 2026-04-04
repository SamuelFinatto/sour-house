# Sour House

A self-hosted, file-based house planning tool. Design floor plans with multiple projects, multiple floors per project, and layer-based editing — all backed by JSON files on disk.

## Features

- Multiple projects and floors
- SVG-based 2D floor editor
- Draw walls, rooms, doors, windows, lights, outlets, furniture, annotations
- Layer visibility controls
- Grid and snap-to-grid
- Undo/redo
- Inspector panel for editing entity properties
- File-based storage (no database)
- PWA support
- Responsive design

## Getting Started

### Development

```bash
bun install
bun run dev
```

### Production

```bash
bun run build
bun run start
```

## Docker

### Build

```bash
docker build -t sour-house .
```

### Run

```bash
docker run -d \
  -p 3000:3000 \
  -v /path/to/your/data:/data \
  sour-house
```

### Docker Compose

```yaml
services:
  sour-house:
    image: ghcr.io/<your-username>/sour-house:main
    # or build locally:
    # build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    environment:
      - DATA_DIR=/data
    restart: unless-stopped
```

Start with:

```bash
docker compose up -d
```

Project data is stored in the mounted volume at `/data`. Each project gets its own directory with a `project.json` and per-floor JSON files under `floors/`.

## Data Structure

```
data/
  my-house/
    project.json
    floors/
      ground-floor.json
      first-floor.json
    assets/
    exports/
```

All data is plain JSON — back it up with `cp`, sync it with `rsync`, or version it with `git`.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Check with Biome |
| `bun run lint:fix` | Auto-fix with Biome |
| `bun run test` | Run tests |
| `bun run test:watch` | Run tests in watch mode |
