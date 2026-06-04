# Starling EE292J — Claude Code Context

## What this project is

Students are building an end-to-end media-provenance prototype using the [Starling Lab integrity-v2](https://github.com/starlinglab/integrity-v2) toolkit. The workflow is:

1. Capture ~23 Densho DR photos as a WACZ web archive
2. Extract the original images from the WACZ
3. Ingest everything into the class Starling instance (coordinated with instructor)
4. Use the `starling` CLI to explore, relate, register, and C2PA-stamp the assets
5. Export C2PA-stamped images for use in a webapp

## Class server

```
Host: 64.23.243.235
User: sysadmin
```

The `starling` binary and its config (`integrity-v2.toml`) are pre-installed at `/home/sysadmin/`. The Authenticated Attributes (AA) service is running on `localhost:3001`. File storage is at `/home/sysadmin/integrity-data/files/`.

To connect:
```bash
ssh sysadmin@64.23.243.235
# or with the alias:
ssh starling-class
```

## Key concepts

**CID** — Content Identifier (IPFS CIDv1). Every asset in the system is addressed by a CID derived from its content hash. CIDs look like `bafybei...`.

**Authenticated Attributes (AuthAttr / AA)** — Starling's signed metadata database. Each attribute is a key-value pair attached to a CID. Every write is cryptographically signed and OpenTimestamped.

**C2PA** — Coalition for Content Provenance and Authenticity. A standard for embedding signed manifests directly into image files. Starling can inject AA metadata into images as C2PA manifests.

**Registrations** — Cryptographic anchoring of an asset's CID + attributes to a public blockchain (Numbers Protocol / Cardano). Immutable proof of existence at a point in time.

## Starling CLI reference

The `starling` binary is a Go busybox-style binary. All commands:

```
starling attr get      -- read attributes from AA
starling attr set      -- write attributes to AA (requires JWT)
starling attr search   -- search CIDs, attribute keys, and index
starling attr export   -- export an attribute as a Verifiable Credential
starling attr relate   -- add a relationship between two CIDs
starling file cid      -- compute an IPFS CIDv1 for a local file
starling file c2pa     -- inject a file with C2PA metadata from AA
starling file register -- register a CID on a blockchain
starling file upload   -- upload a file to rclone remote or web3.storage
starling file encrypt  -- encrypt a file already in the system
starling file decrypt  -- decrypt an encrypted file
starling genkey        -- create a cryptographic key pair
starling sync          -- run rclone sync loop
```

Append `--help` to any command for flags.

### Common patterns

```bash
# List all CIDs in the database
starling attr search cids

# List all attributes on an asset
starling attr get --all <CID>

# Read a single attribute
starling attr get --attr media_type <CID>

# Find a CID by original filename
starling attr search index file_name "photo.jpg"

# Find all assets in a project/collection
starling attr search index project_id densho-ee292j

# Relate a photo to its parent WACZ
starling attr relate --rel children <wacz-CID> <photo-CID>

# Compute the CID of a local file (without uploading)
starling file cid ./photo.jpg

# Register on Numbers (testnet = no cost, not logged to AA)
starling file register --on numbers --testnet <CID>
starling file register --on numbers --include media_type,author <CID>

# C2PA-stamp an image using a manifest template
starling file c2pa --manifest densho <CID>
# Returns new CID of the stamped file

# Export AA attribute as a Verifiable Credential
starling attr export --attr time_created --format vc -o out.vc.json <CID>
```

## C2PA manifest templates

Templates are JSON files in `/home/sysadmin/c2pa-manifests/` on the server and mirrored in `c2pa_templates/` in this repo. Template variables in `{{double_braces}}` are substituted at injection time with values from AA attributes.

Example: `{{author}}` → pulls the `author` attribute of the asset being stamped.
`credentials` array entries are injected as full Verifiable Credentials.

## Asset data

After instructor ingest, `data/assets.csv` will contain the mapping:

| Asset CID | Asset original name | group_subcollection |
|-----------|---------------------|---------------------|

Use this file as your authoritative lookup when writing scripts or asking Claude Code to operate on specific assets.

## Source code layout (integrity-v2 submodule)

```
integrity-v2/
├── main.go               # CLI entrypoint, subcommand registration
├── aa/                   # AuthAttr client
├── get/, set/, search/   # attr subcommands
├── export/, relate/      # attr subcommands
├── c2pa/                 # C2PA injection
├── register/             # blockchain registration
├── cid/                  # CID computation
├── database/             # DB client
├── config/               # config.toml parsing
├── docs/                 # human-readable docs (start here)
└── example_config.toml   # annotated config reference
```

Read `integrity-v2/docs/quickstart.md` first, then `integrity-v2/docs/cli.md` for the full command reference.

## What Claude Code can help with

- Extracting images from a WACZ file (it's a ZIP; find WARC entries)
- Writing scripts to batch-process CIDs from `data/assets.csv`
- Designing and iterating on C2PA manifest templates
- Understanding what attributes are available on a given CID
- Drafting a Claude skill that reads C2PA manifests and surfaces trust signals
