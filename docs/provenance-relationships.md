# Provenance Relationship Graphs — Marble 3D World Pipeline

This document describes how to encode the provenance of a Marble (WorldLabs) 3D world model in the Starling AA database using `starling attr relate`. Two example pipelines are covered.

---

## Relationship model

Starling's AA system supports two directional relationship types: **`children`** (written on the upstream/parent CID) and **`parents`** (written on the downstream/child CID). In practice, `starling attr relate` always writes a `children` entry on the parent — the inverse `parents` edge is implied.

The `--type` label is a freeform string that carries the semantic meaning of the edge. The labels used in this pipeline are:

| Label | Meaning |
|---|---|
| `generated` | An AI model created this output using the parent as its primary input |
| `edited` | An AI model modified an intermediate asset into the next stage via a text prompt |
| `informed` | A reference source (map, testimonial, document) shaped a text prompt but was not itself the primary generative input |
| `style_source` | Image used as the style reference for DALL-E synthesis |
| `structure_source` | Image used as the structural/compositional reference for DALL-E synthesis |

---

## Example 1 — Full pipeline with edits

This is the complete pipeline: a seed painting generates a panorama, the panorama is edited using a reference map, the edited panorama generates a 3D world, and the world is further edited using an archival testimonial.

### Pipeline stages

```
Seed Painting
  └─[generated]──► Initial Panorama
                        │
Reference Map ──[informed]─┘
                        │
                    [edited]
                        │
                        ▼
                   Final Panorama
                        │
                    [generated]
                        │
                        ▼
                  Initial World
                        │
Testimonial ──[informed]─┘
                        │
                    [edited]
                        │
                        ▼
                   Final World
```

### `starling attr relate` commands

```bash
# Panorama generation
starling attr relate --parent <seed_image_cid>       --child <initial_panorama_cid> --type "generated"
starling attr relate --parent <panorama_ref_cid>     --child <final_panorama_cid>   --type "informed"
starling attr relate --parent <initial_panorama_cid> --child <final_panorama_cid>   --type "edited"

# World generation
starling attr relate --parent <final_panorama_cid>   --child <initial_world_cid>    --type "generated"
starling attr relate --parent <world_ref_cid>        --child <final_world_cid>      --type "informed"
starling attr relate --parent <initial_world_cid>    --child <final_world_cid>      --type "edited"
```

### Assets requiring CIDs

Every node in the graph must be ingested into Starling before the relate commands can be run. Text prompts are **not** separate assets — they are stored as AA attributes (e.g. `panorama_edit_prompt`, `world_edit_prompt`) on the output CID and referenced in the C2PA manifest as `{{variables}}`.

| Asset | How it enters the system |
|---|---|
| Seed painting | `starling file upload` |
| Reference map | `starling file upload` |
| Testimonial / archival source | `starling file upload` |
| Initial panorama | `starling file upload` (Marble export) |
| Final panorama | `starling file upload` (Marble export) |
| Initial world `.spz` | `starling file upload` (Marble export) |
| Final world `.spz` | `starling file upload` (Marble export) |

---

## Example 2 — DALL-E synthesis path, no edits

This is a simplified pipeline where two images are synthetically combined by DALL-E to produce the seed, and each subsequent stage (panorama, world) is generated in a single pass with no revision cycle.

### Pipeline stages

```
Style Reference ──[style_source]──►
                                   DALL-E Synthesis (Seed)
Structure Reference ──[structure_source]──►
                                   │
                               [generated]
                                   │
                                   ▼
                              Panorama
                                   │
Reference Map ──[informed]─────────┘
                                   │
                               [generated]
                                   │
                                   ▼
                             World (.spz)
                                   │
Testimonial ──[informed]───────────┘
```

### `starling attr relate` commands

```bash
# DALL-E synthesis
starling attr relate --parent <style_ref_cid>       --child <synthetic_seed_cid> --type "style_source"
starling attr relate --parent <structure_ref_cid>   --child <synthetic_seed_cid> --type "structure_source"

# Panorama generation (single pass)
starling attr relate --parent <synthetic_seed_cid>  --child <panorama_cid>       --type "generated"
starling attr relate --parent <panorama_ref_cid>    --child <panorama_cid>       --type "informed"

# World generation (single pass)
starling attr relate --parent <panorama_cid>        --child <world_cid>          --type "generated"
starling attr relate --parent <world_ref_cid>       --child <world_cid>          --type "informed"
```

### Assets requiring CIDs

| Asset | How it enters the system |
|---|---|
| Style reference image | `starling file upload` |
| Structure reference image | `starling file upload` |
| DALL-E synthesis (seed) | `starling file upload` |
| Reference map | `starling file upload` |
| Testimonial / archival source | `starling file upload` |
| Panorama | `starling file upload` (Marble export) |
| World `.spz` | `starling file upload` (Marble export) |

> If no reference map or testimonial was used for a given step, omit that `informed` edge.

---

## Notes on C2PA alignment

The AA relationship graph and the C2PA manifest encode the same provenance, at different layers:

- **AA `relate`** — queryable graph in the signed metadata database; traversable with `starling attr get --attr children <CID>`
- **C2PA manifest** — cryptographically bound provenance embedded directly in the exported file, readable by any C2PA validator

The `generated` / `edited` edges in AA correspond to `c2pa.created` / `c2pa.edited` actions in the manifest. The `informed` edges correspond to ingredient entries with `relationship: inputTo` inside those actions.
