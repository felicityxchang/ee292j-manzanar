// ─────────────────────────────────────────────────────────────
//  HotspotManager.js  (no physics / no Ammo required)
//  Attach to your Camera entity.
//
//  Setup in the Editor:
//    1. Create one empty Entity per hotspot, positioned in 3D world space.
//    2. In this script's Inspector, add entries to the `hotspots` array,
//       drag in each entity, and fill in the metadata fields.
//    3. Set `aaEndpoint` to your AA server (e.g. http://localhost:3001 via
//       SSH tunnel, or the class server's public address if CORS-enabled).
//
//  C2PA closed loop:
//    Set `c2paCid` on a hotspot to its IPFS CID. On click, the script
//    fetches AA attributes (title, author, date_taken, description, rights,
//    file_name, sha256, time_created) and populates the manifest panel
//    automatically. Static field values are used as fallback if the fetch
//    fails or no CID is set.
// ─────────────────────────────────────────────────────────────

var HotspotManager = pc.createScript('hotspotManager');

// ── Script-level attributes ──────────────────────────────────

HotspotManager.attributes.add('aaEndpoint', {
    type: 'string',
    default: 'http://localhost:3001',
    description: 'Base URL of the Authenticated Attributes service'
});

HotspotManager.attributes.add('hitRadius', {
    type: 'number',
    default: 24,
    description: 'Pixel radius around a projected hotspot that counts as a click'
});

// ── Per-hotspot attributes ───────────────────────────────────

HotspotManager.attributes.add('hotspots', {
    type: 'json',
    array: true,
    schema: [
        // 3D scene
        { name: 'entity',           type: 'entity' },
        { name: 'label',            type: 'string', default: 'Hotspot' },
        // Modal content
        { name: 'artifactType',     type: 'string', default: 'Photograph' },
        { name: 'artifactImage',    type: 'asset',  assetType: 'texture' },
        { name: 'artifactSource',   type: 'string', default: 'Courtesy Manzanar National Historic Site' },
        // C2PA closed loop — stamped file CID
        { name: 'c2paCid',         type: 'string', default: '' },
        // Parent CID that holds AA attributes (from `starling attr get --all <c2paCid>` → parents.derived)
        { name: 'c2paAttrCid',     type: 'string', default: '' },
        // Static fallbacks (used when no CID is set or fetch fails)
        { name: 'fallbackTitle',       type: 'string', default: '' },
        { name: 'fallbackAuthor',      type: 'string', default: '' },
        { name: 'fallbackDate',        type: 'string', default: '' },
        { name: 'fallbackDescription', type: 'string', default: '' },
        { name: 'fallbackFileName',    type: 'string', default: '' }
    ]
});

// ── Lifecycle ────────────────────────────────────────────────

HotspotManager.prototype.initialize = function () {
    this._active    = false;
    this._modalOpen = false;
    this._markers   = [];
    this._screenPos = new pc.Vec3();
    this._mouseX    = 0;
    this._mouseY    = 0;

    this._injectStyles();
    this._buildModal();

    for (var i = 0; i < this.hotspots.length; i++) {
        this._markers.push(this._buildMarker(this.hotspots[i]));
    }

    var self = this;
    this.app.on('titleScreen:dismissed', function () { self._active = true; });

    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this._onMouseDown, this);
    this.on('destroy', this._cleanup, this);
};

HotspotManager.prototype.update = function () {
    if (!this._active) return;

    var cam = this.entity.camera;
    if (!cam) return;

    var canvas = this.app.graphicsDevice.canvas;
    var rect   = canvas.getBoundingClientRect();
    var cw     = canvas.clientWidth;
    var ch     = canvas.clientHeight;

    for (var i = 0; i < this.hotspots.length; i++) {
        var hs     = this.hotspots[i];
        var marker = this._markers[i];
        if (!hs.entity || !marker) continue;

        cam.worldToScreen(hs.entity.getPosition(), this._screenPos);

        if (this._screenPos.z < 0) {
            marker.style.display = 'none';
            continue;
        }

        var px = rect.left + (this._screenPos.x / cw) * rect.width;
        var py = rect.top  + (this._screenPos.y / ch) * rect.height;

        marker.style.display = 'flex';
        marker.style.left = (px - 13) + 'px';
        marker.style.top  = (py - 13) + 'px';

        var dx   = this._mouseX - px;
        var dy   = this._mouseY - py;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var lbl  = marker.querySelector('.manz-hotspot-label');
        if (lbl) lbl.style.opacity = dist < this.hitRadius ? '1' : '0';
    }
};

// ── Mouse handlers ───────────────────────────────────────────

HotspotManager.prototype._onMouseMove = function (e) {
    this._mouseX = e.event.clientX;
    this._mouseY = e.event.clientY;
};

HotspotManager.prototype._onMouseDown = function (e) {
    if (!this._active || this._modalOpen) return;

    var cam = this.entity.camera;
    if (!cam) return;

    var canvas = this.app.graphicsDevice.canvas;
    var rect   = canvas.getBoundingClientRect();
    var cw     = canvas.clientWidth;
    var ch     = canvas.clientHeight;
    var mx     = e.event.clientX;
    var my     = e.event.clientY;

    var closest     = -1;
    var closestDist = this.hitRadius;

    for (var i = 0; i < this.hotspots.length; i++) {
        var hs = this.hotspots[i];
        if (!hs.entity) continue;

        cam.worldToScreen(hs.entity.getPosition(), this._screenPos);
        if (this._screenPos.z < 0) continue;

        var px   = rect.left + (this._screenPos.x / cw) * rect.width;
        var py   = rect.top  + (this._screenPos.y / ch) * rect.height;
        var dx   = mx - px;
        var dy   = my - py;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < closestDist) {
            closestDist = dist;
            closest = i;
        }
    }

    if (closest >= 0) {
        this._openModal(this.hotspots[closest]);
    }
};

// ── DOM: marker ──────────────────────────────────────────────

HotspotManager.prototype._buildMarker = function (hs) {
    var marker = document.createElement('div');
    marker.className = 'manz-hotspot';
    marker.innerHTML =
        '<div class="manz-hotspot-inner"></div>' +
        '<span class="manz-hotspot-label">' + this._esc(hs.label) + '</span>';
    document.body.appendChild(marker);
    return marker;
};

// ── DOM: modal ───────────────────────────────────────────────

HotspotManager.prototype._buildModal = function () {
    var self = this;

    var wrap = document.createElement('div');
    wrap.id = 'manz-modal-wrap';
    wrap.innerHTML =
        '<div id="manz-modal">' +
        '  <div id="manz-modal-img-wrap">' +
        '    <img id="manz-modal-img" src="" alt=""' +
        '         style="width:100%;height:auto;max-height:320px;display:block;background:#c8b99a;" />' +
        '  </div>' +
        '  <div class="manz-modal-body">' +
        '    <p id="manz-modal-tag" class="manz-modal-tag"></p>' +
        '    <h3 id="manz-modal-title" class="manz-modal-title"></h3>' +
        '    <p id="manz-modal-caption" class="manz-modal-caption"></p>' +
        '  </div>' +
        '  <div id="manz-c2pa-bar">' +
        '    <div class="manz-c2pa-left">' +
        '      <span class="manz-c2pa-badge">C2PA</span>' +
        '      <span id="manz-c2pa-status" class="manz-c2pa-label">Content credentials</span>' +
        '    </div>' +
        '    <span id="manz-c2pa-chevron">&#8964;</span>' +
        '  </div>' +
        '  <div id="manz-manifest">' +
        '    <div class="manz-manifest-inner">' +

        // c2pa.actions assertion
        '      <div class="manz-manifest-section">' +
        '        <p class="manz-manifest-heading">c2pa.actions</p>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">Action</span><span class="manz-mv"><span class="manz-pill manz-pill-source">c2pa.published</span></span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">Description</span><span class="manz-mv" id="c2pa-action-desc">Archival photograph published with provenance metadata. Original held at Library of Congress or NARA.</span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">Claim generator</span><span class="manz-mv">Starling Lab / EE292J</span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">Timestamp authority</span><span class="manz-mv">timestamp.digicert.com</span></div>' +
        '      </div>' +

        // stds.schema-org.CreativeWork assertion
        '      <div class="manz-manifest-section">' +
        '        <p class="manz-manifest-heading">stds.schema-org.CreativeWork</p>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">@type</span><span class="manz-mv">Photograph</span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">name</span><span class="manz-mv" id="c2pa-title"></span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">description</span><span class="manz-mv" id="c2pa-description"></span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">author</span><span class="manz-mv" id="c2pa-author"></span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">dateCreated</span><span class="manz-mv" id="c2pa-date"></span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">license</span><span class="manz-mv" id="c2pa-rights"></span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">identifier</span><span class="manz-mv manz-mono" id="c2pa-filename"></span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">isPartOf</span><span class="manz-mv">Manzanar War Relocation Center</span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">locationCreated</span><span class="manz-mv">Independence, California</span></div>' +
        '      </div>' +

        // time_created credential
        '      <div class="manz-manifest-section">' +
        '        <p class="manz-manifest-heading">Credential · time_created</p>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">issuanceDate</span><span class="manz-mv" id="c2pa-vc-date"></span></div>' +
        '        <div class="manz-manifest-row"><span class="manz-mk">issuer</span><span class="manz-mv manz-mono" id="c2pa-vc-issuer"></span></div>' +
        '      </div>' +

        '    </div>' +
        '  </div>' +
        '  <div class="manz-modal-footer">' +
        '    <span id="manz-modal-source" class="manz-modal-source"></span>' +
        '    <button id="manz-modal-close">Close</button>' +
        '  </div>' +
        '</div>';

    document.body.appendChild(wrap);
    this._modalWrap = wrap;

    var c2paBar  = document.getElementById('manz-c2pa-bar');
    var manifest = document.getElementById('manz-manifest');
    var chevron  = document.getElementById('manz-c2pa-chevron');
    c2paBar.addEventListener('click', function () {
        var open = manifest.classList.toggle('open');
        chevron.style.transform = open ? 'rotate(180deg)' : '';
    });

    document.getElementById('manz-modal-close').addEventListener('click', function () {
        self._closeModal();
    });
    wrap.addEventListener('click', function (e) {
        if (e.target === wrap) self._closeModal();
    });
};

// ── Modal open / close ───────────────────────────────────────

HotspotManager.prototype._openModal = function (hs) {
    this._modalOpen = true;

    var img = document.getElementById('manz-modal-img');
    img.src = hs.artifactImage ? hs.artifactImage.getFileUrl() : '';
    img.alt = hs.fallbackTitle || '';

    document.getElementById('manz-modal-tag').textContent =
        (hs.artifactType || 'Photograph') +
        (hs.fallbackDate ? ' · ' + hs.fallbackDate : '');
    document.getElementById('manz-modal-title').textContent   = hs.fallbackTitle       || '';
    document.getElementById('manz-modal-caption').textContent = hs.fallbackDescription || '';
    document.getElementById('manz-modal-source').textContent  = hs.artifactSource      || '';

    // Populate manifest with fallback values
    this._setManifestFields({
        title:      hs.fallbackTitle,
        author:     hs.fallbackAuthor,
        date:       hs.fallbackDate,
        description:hs.fallbackDescription,
        fileName:   hs.fallbackFileName,
        sha256:     '',
        vcDate:     '',
        vcIssuer:   ''
    });

    document.getElementById('manz-manifest').classList.remove('open');
    document.getElementById('manz-c2pa-chevron').style.transform = '';
    this._modalWrap.style.display = 'flex';

    if (hs.c2paCid) {
        this._fetchC2PA(hs, hs.c2paCid);
    }
};

HotspotManager.prototype._setManifestFields = function (d) {
    document.getElementById('c2pa-title').textContent       = d.title       || '—';
    document.getElementById('c2pa-description').textContent = d.description || '—';
    document.getElementById('c2pa-author').textContent      = d.author      || '—';
    document.getElementById('c2pa-date').textContent        = d.date        || '—';
    document.getElementById('c2pa-rights').textContent      = d.rights      || '—';
    document.getElementById('c2pa-filename').textContent    = d.fileName    || '—';
    document.getElementById('c2pa-vc-date').textContent     = d.vcDate      || '—';
    document.getElementById('c2pa-vc-issuer').textContent   = d.vcIssuer    || '—';
};

// ── C2PA fetch loop ──────────────────────────────────────────

HotspotManager.prototype._fetchC2PA = function (hs, cid) {
    var status = document.getElementById('manz-c2pa-status');
    status.textContent = 'Fetching credentials…';
    this._fetchAttrs(hs, cid);
};

HotspotManager.prototype._fetchAttrs = function (hs, attrCid) {
    var self   = this;
    var base   = this.aaEndpoint.replace(/\/$/, '');
    var status = document.getElementById('manz-c2pa-status');
    var attrs  = ['title', 'author', 'date_taken', 'description', 'rights', 'file_name', 'time_created'];

    var fetches = attrs.map(function (attr) {
        return fetch(base + '/v1/c/' + encodeURIComponent(attrCid) + '/' + attr + '?format=vc', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
    });

    Promise.all(fetches).then(function (results) {
        if (!self._modalOpen) return;

        var byAttr = {};
        attrs.forEach(function (attr, i) {
            var vc = results[i];
            if (vc && vc.credentialSubject && vc.credentialSubject.value !== undefined) {
                byAttr[attr] = vc.credentialSubject.value;
            }
        });

        // Pull proof info from the time_created VC
        var vcDate   = '';
        var vcIssuer = '';
        var tcVc = results[attrs.indexOf('time_created')];
        if (tcVc) {
            vcDate   = tcVc.issuanceDate || '';
            vcIssuer = tcVc.issuer       || '';
        }

        var title = byAttr['title'] || hs.fallbackTitle || '';

        self._setManifestFields({
            title:       title,
            description: byAttr['description'] || hs.fallbackDescription || '',
            author:      byAttr['author']       || hs.fallbackAuthor      || '',
            date:        byAttr['date_taken']   || hs.fallbackDate        || '',
            rights:      byAttr['rights']       || '',
            fileName:    byAttr['file_name']    || hs.fallbackFileName    || '',
            vcDate:      vcDate,
            vcIssuer:    vcIssuer
        });

        document.getElementById('manz-modal-title').textContent = title;
        document.getElementById('manz-modal-caption').textContent =
            byAttr['description'] || hs.fallbackDescription || '';
        document.getElementById('manz-modal-tag').textContent =
            (hs.artifactType || 'Photograph') +
            (byAttr['date_taken'] ? ' · ' + byAttr['date_taken'] : '');

        status.textContent = 'Content credentials verified';
        status.style.color = '';
    }).catch(function () {
        if (!self._modalOpen) return;
        status.textContent = 'Credentials unavailable';
        status.style.color = '#a06030';
    });
};

HotspotManager.prototype._closeModal = function () {
    this._modalOpen = false;
    this._modalWrap.style.display = 'none';
};

// ── Styles ───────────────────────────────────────────────────

HotspotManager.prototype._injectStyles = function () {
    if (document.getElementById('manz-hotspot-styles')) return;

    var style = document.createElement('style');
    style.id = 'manz-hotspot-styles';
    style.textContent = [
        '.manz-hotspot {',
        '  position: fixed; width: 26px; height: 26px; border-radius: 50%;',
        '  background: rgba(184,146,74,0.25); border: 1.5px solid #b8924a;',
        '  display: flex; align-items: center; justify-content: center;',
        '  cursor: pointer; z-index: 1000;',
        '  transition: background 0.15s, transform 0.15s;',
        '  pointer-events: none;',
        '}',
        '.manz-hotspot-inner { width:8px; height:8px; border-radius:50%; background:#b8924a; }',
        '.manz-hotspot-label {',
        '  position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);',
        '  white-space: nowrap; background: rgba(26,32,48,0.92);',
        '  color: #f0ddb0; font-size: 11px; padding: 3px 9px; border-radius: 3px;',
        '  pointer-events: none; opacity: 0; transition: opacity 0.15s;',
        '  letter-spacing: 0.06em; border: 0.5px solid #5c3d1a; font-family: sans-serif;',
        '}',
        '#manz-modal-wrap {',
        '  display: none; position: fixed; inset: 0;',
        '  background: rgba(0,0,0,0.62); z-index: 9998;',
        '  align-items: center; justify-content: center; padding: 1rem;',
        '}',
        '#manz-modal {',
        '  background: #faf5ea; border-radius: 12px;',
        '  width: 420px; max-width: 96vw; max-height: 90vh; overflow-y: auto;',
        '  border: 1px solid #c9a96e; font-family: sans-serif;',
        '}',
        '#manz-modal-img { background: #c8b99a; }',
        '.manz-modal-body { padding: 1rem 1.2rem 0.8rem; }',
        '.manz-modal-tag { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:#9a6c30; margin:0 0 0.35rem; }',
        '.manz-modal-title { font-size:16px; font-weight:400; color:#2a1f0e; margin:0 0 0.5rem; line-height:1.35; }',
        '.manz-modal-caption { font-size:12px; color:#6b5030; line-height:1.65; margin:0; }',
        '#manz-c2pa-bar {',
        '  padding: 0.65rem 1.2rem; border-top: 0.5px solid #c9a96e;',
        '  display: flex; align-items: center; justify-content: space-between;',
        '  cursor: pointer; user-select: none; background: #f5edd8;',
        '}',
        '#manz-c2pa-bar:hover { background: #f0e5cc; }',
        '.manz-c2pa-left { display:flex; align-items:center; gap:8px; }',
        '.manz-c2pa-badge { background:#2a4a2a; color:#a8d8a8; font-size:9px; letter-spacing:0.12em; text-transform:uppercase; padding:2px 7px; border-radius:2px; font-weight:500; }',
        '.manz-c2pa-label { font-size:11px; color:#6b5030; }',
        '#manz-c2pa-chevron { font-size:18px; color:#9a7d52; transition:transform 0.2s; line-height:1; }',
        '#manz-manifest { background:#f0e5cc; overflow:hidden; max-height:0; transition:max-height 0.3s ease; border-top:0.5px solid #c9a96e; }',
        '#manz-manifest.open { max-height:800px; }',
        '.manz-manifest-inner { padding:1rem 1.2rem; }',
        '.manz-manifest-section { margin-bottom:1rem; }',
        '.manz-manifest-section:last-child { margin-bottom:0; }',
        '.manz-manifest-heading { font-size:9px; letter-spacing:0.16em; text-transform:uppercase; color:#9a7d52; margin:0 0 0.5rem; padding-bottom:4px; border-bottom:0.5px solid #c9a96e; }',
        '.manz-manifest-row { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:3px 0; }',
        '.manz-mk { font-size:11px; color:#9a7d52; flex-shrink:0; }',
        '.manz-mv { font-size:11px; color:#3a2a10; text-align:right; word-break:break-all; }',
        '.manz-mono { font-family:monospace; font-size:9px; color:#6b5030; }',
        '.manz-action-desc { font-size:10px; color:#6b5030; line-height:1.6; margin:6px 0 0; font-style:italic; }',
        '.manz-pill { display:inline-block; font-size:9px; padding:2px 7px; border-radius:2px; margin:2px 2px 0 0; letter-spacing:0.06em; text-transform:uppercase; }',
        '.manz-pill-source { background:#dce8f0; color:#1a4a6a; }',
        '.manz-modal-footer { padding:0.7rem 1.2rem; border-top:0.5px solid #c9a96e; display:flex; align-items:center; justify-content:space-between; }',
        '.manz-modal-source { font-size:10px; color:#9a8060; font-style:italic; }',
        '#manz-modal-close { background:transparent; border:0.5px solid #c9a96e; color:#6b5030; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; padding:4px 12px; border-radius:2px; cursor:pointer; font-family:sans-serif; }',
        '#manz-modal-close:hover { background:rgba(184,146,74,0.1); }'
    ].join('\n');

    document.head.appendChild(style);
};

// ── Cleanup ──────────────────────────────────────────────────

HotspotManager.prototype._cleanup = function () {
    this.app.mouse.off(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
    this.app.mouse.off(pc.EVENT_MOUSEDOWN, this._onMouseDown, this);
    for (var i = 0; i < this._markers.length; i++) {
        if (this._markers[i] && this._markers[i].parentNode) {
            this._markers[i].parentNode.removeChild(this._markers[i]);
        }
    }
    if (this._modalWrap && this._modalWrap.parentNode) {
        this._modalWrap.parentNode.removeChild(this._modalWrap);
    }
    var s = document.getElementById('manz-hotspot-styles');
    if (s) s.parentNode.removeChild(s);
};

// ── Utility ──────────────────────────────────────────────────

HotspotManager.prototype._esc = function (str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};
