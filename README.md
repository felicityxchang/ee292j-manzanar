# EE292J — Starling Starter Kit

This repository is the scaffold for the end-to-end prototype assignment. It bundles the [Starling Lab integrity-v2](https://github.com/starlinglab/integrity-v2) toolkit as a submodule and provides everything you need to work through the steps below.

---

## Prerequisites

- [Webrecorder browser extension](https://webrecorder.net/) installed
- Python 3.10+ (for WACZ extraction)
- SSH key registered with the class server (`sysadmin@64.23.243.235`)
- A running [Claude Code](https://claude.ai/code) instance in this directory

---

## Step 1 — Collect source material (WACZ)

Using the Webrecorder browser extension:

1. Go to the [Densho DR collection](https://ddr.densho.org/).
2. Start an **archiving session**.
3. Click through each of the ~23 individual photo pages you want to archive.
4. End the session and **download the WACZ file** (typically 10–100 MB).

Save the `.wacz` file inside this repo, e.g. `densho.wacz`.

---

## Step 2 — Extract the original photos from the WACZ

A WACZ file is a ZIP archive of web archive data. To pull out the original photos, ask Claude Code:

```
Extract the 23-24 original photos from densho.wacz and save them as individual image files next to the archive.
```

Claude Code will locate the images inside the WACZ and save them to disk.

---

## Step 3 — Ingest into the Starling database

Put the WACZ and the photos you extracted into a **Google Drive folder** and share that link with **Basile <basile@starlinglab.org>**. He will copy them to the Class Drive.

Once ingested, Basile will provide you with a spreadsheet (`data/assets.csv`) with one row per item:

| Asset CID | Asset original name | group_subcollection |
|-----------|---------------------|---------------------|

That spreadsheet is your reference for all subsequent CLI commands.

---

## Step 4 — Explore the Starling CLI

The `starling` binary is already installed on the class server. The `integrity-v2/` submodule in this repo contains the full source and docs — use it as reading material and to ask Claude Code questions about the codebase.

Key questions to answer (see `integrity-v2/docs/`):

**a. How do I compute an IPFS CID?**
```bash
starling file cid <path/to/file>
```

**b. How do I perform a cryptographic registration?**
```bash
# Dry run first
starling file register --on numbers --dry-run <CID>

# Real registration (Cardano / Numbers)
starling file register --include media_type,author --on numbers <CID>

# Check the result
starling attr get --attr registrations <CID>
```

**c. How do I represent relationships between assets?**
```bash
# E.g. mark a photo as a child of its parent WACZ
starling attr relate --rel children <parent-CID> <child-CID>
```

**d. How do I export a C2PA-stamped version of an asset?**
```bash
# Inject a photo with its AA metadata via C2PA
starling file c2pa --manifest <template-name> <CID>

# The resulting CID is the stamped file — download or upload it
starling file upload drive:/my_exports <stamped-CID>
```

---

## Step 5 — Design phase

### C2PA manifests

Edit the starter template in `c2pa_templates/densho.json`. Work backwards from what you want your webapp's trust-signal UI to show, then fill in the assertions.

### Relationships

Sketch out the asset graph (WACZ → individual photos → C2PA exports) and use `starling attr relate` to encode it. See `integrity-v2/docs/` for relationship semantics.

---

## Step 6 — Execute on the class server

SSH in and run your plan:

```bash
ssh sysadmin@64.23.243.235
```

See `ssh-config.snippet` for a shortcut alias. The `starling` binary and its config are already in place on the server.

At the end you will have C2PA-stamped photos exported back to your local machine, ready to embed in your webapp.

---

## Step 7 — Stretch goal: Claude interrogation skill

Design a Claude skill that reads the C2PA manifest of an exported photo and answers trust-signal questions about it (e.g. "Was this photo registered on-chain?", "What attributes are certified?"). Start from `integrity-v2/docs/` and the C2PA spec. Ask Claude Code to help you prototype.

---

## Repository layout

```
.
├── integrity-v2/          # Starling toolkit (submodule)
├── c2pa_templates/        # Your C2PA manifest templates
│   └── densho.json        # Starter template for this project
├── data/                  # Asset spreadsheet goes here after ingest
│   └── README.md
├── ssh-config.snippet     # SSH shortcut for the class server
└── README.md
```
