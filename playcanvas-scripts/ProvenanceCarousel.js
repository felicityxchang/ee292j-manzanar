// ─────────────────────────────────────────────────────────────
//  ProvenanceCarousel.js
//  Attach to any entity (e.g. "UI Manager").
//
//  Setup in the Editor:
//    1. In the Inspector, expand the `stepImages` array to 5 entries.
//       Drag a texture asset into each entry's `image` slot — one per
//       pipeline step (seed → init_pano → final_pano → init_world → final_world).
//       Entries left blank fall back to a styled gradient placeholder.
//    2. Set `openEvent` if you want a custom trigger (default: 'provenance:open').
//       Fire it from a hotspot or UI button with:
//           this.app.fire('provenance:open');
//       Optionally pass a start index:
//           this.app.fire('provenance:open', 2);
//    3. The carousel can also be opened programmatically:
//           this.entity.script.provenanceCarousel.open(0);
//
//  The provenance copy (titles, CIDs, descriptions, prompts, C2PA
//  manifest rows, ingredients) is baked into this script and mirrors
//  the marble_world.json C2PA manifest template exactly.
// ─────────────────────────────────────────────────────────────

var ProvenanceCarousel = pc.createScript('provenanceCarousel');

// ── Attributes ───────────────────────────────────────────────

ProvenanceCarousel.attributes.add('stepImages', {
    type: 'json',
    array: true,
    schema: [
        {
            name: 'image',
            type: 'asset',
            assetType: 'texture',
            description: 'Texture asset for this pipeline step'
        }
    ],
    description: '5 entries — one image asset per step: seed, initial pano, final pano, initial world, final world'
});

ProvenanceCarousel.attributes.add('openEvent', {
    type: 'string',
    default: 'provenance:open',
    description: 'App event name that opens the carousel. Optionally pass a start index as the first argument.'
});

ProvenanceCarousel.attributes.add('hotspotEntity', {
    type: 'entity',
    description: 'Optional 3D entity in the scene. When the player clicks within hitRadius pixels of its projected screen position the carousel opens.'
});

ProvenanceCarousel.attributes.add('hotspotLabel', {
    type: 'string',
    default: 'World Provenance',
    description: 'Tooltip label shown when hovering the hotspot marker'
});

ProvenanceCarousel.attributes.add('hitRadius', {
    type: 'number',
    default: 24,
    description: 'Pixel radius around the projected hotspot that counts as a click'
});

// ── Hardcoded pipeline data ───────────────────────────────────
//
// Mirrors marble_world.json template variables exactly.
// Edit CIDs and copy here to match your ingested assets.

var STEPS = [
    {
        type: 'source',
        typeLabel: 'Archival Photograph',
        title: 'Seed Image',
        filename: 'ddr-manz-2-65_front.jpg',
        cid: 'bafkreiafetlwkvjuxj24xkjiwob6ec53v7e7ija4xhlikk64kc7k2vfzqi',
        placeholderTheme: 'mzpc-ph-source',
        desc: 'Densho Digital Repository photograph of a front-facing portrait from Block 2, used as the primary visual reference for Marble world generation.',
        edge: null,
        prompt: null,
        ingredients: null,
        c2pa: {
            action: 'c2pa.placed',
            actionCls: 'mzpc-pill-placed',
            desc: 'Archival photograph ingested as primary visual reference for Marble panorama generation.',
            generator: 'Starling Lab / EE292J',
            tsAuthority: 'timestamp.digicert.com',
            rows: [
                { k: 'file_name',   v: 'ddr-manz-2-65_front.jpg', mono: true },
                { k: 'project_id',  v: 'densho-ee292j' },
                { k: 'collection',  v: 'Densho Digital Repository · ddr-manz-2' },
                { k: 'source_type', v: 'digitalCapture' }
            ]
        }
    },
    {
        type: 'pano',
        typeLabel: 'AI-Generated Panorama',
        title: 'Initial Panorama',
        filename: 'initial_pano.png',
        cid: 'bafkreidbbopjk74uqdtooqyg6tgfmz3ylbefx32w2namo2qyl2r7ilkp3y',
        placeholderTheme: 'mzpc-ph-pano',
        desc: 'Equirectangular panorama generated from the seed photograph by WorldLabs Marble.',
        edge: { label: 'generated', from: 'Seed Image', cls: 'mzpc-rel-generated' },
        prompt: null,
        ingredients: [
            { title: 'ddr-manz-2-65_front.jpg', rel: 'inputTo', relCls: 'mzpc-ing-input',
              cid: 'bafkreiafetlwkvjuxj24xkjiwob6ec53v7e7ija4xhlikk64kc7k2vfzqi' }
        ],
        c2pa: {
            action: 'c2pa.created',
            actionCls: 'mzpc-pill-created',
            desc: 'Initial equirectangular panorama generated from seed image by Marble.',
            generator: 'WorldLabs Marble',
            tsAuthority: 'timestamp.digicert.com',
            rows: [
                { k: 'model',       v: 'WorldLabs Marble' },
                { k: 'source_type', v: 'trainedAlgorithmicMedia' },
                { k: 'seed_cid',    v: 'bafkreiafetlwkvjuxj24xkjiwob6ec53v7e7ija4xhlikk64kc7k2vfzqi', mono: true }
            ]
        }
    },
    {
        type: 'pano',
        typeLabel: 'Edited Panorama',
        title: 'Final Panorama',
        filename: 'final_pano.png',
        cid: 'bafkreieka2otbizmwduczyszyzmv3epdev4xfdn7whss6c3wyl5upo22ki',
        placeholderTheme: 'mzpc-ph-pano',
        desc: 'Panorama edited via text prompt informed by the 1944 Manzanar camp layout map.',
        edge: { label: 'edited', from: 'Initial Panorama', cls: 'mzpc-rel-edited' },
        prompt: 'Remove the fences between the barracks and place barbed wire on the outer perimeter of the camp, far in the distance. Add a guard tower on the left back corner. Remove leaves from trees and cover branches with snow.',
        ingredients: [
            { title: 'initial_pano.png', rel: 'inputTo', relCls: 'mzpc-ing-input',
              cid: 'bafkreidbbopjk74uqdtooqyg6tgfmz3ylbefx32w2namo2qyl2r7ilkp3y' },
            { title: '03_npmaps_historical_1944.gif', rel: 'informed by', relCls: 'mzpc-ing-informed',
              cid: 'bafkreigf2swd5xlplrvvspdz65pk6nsqqii7rib45tonlfbre6midejj6a' }
        ],
        c2pa: {
            action: 'c2pa.edited',
            actionCls: 'mzpc-pill-edited',
            desc: 'Panorama edited using a text prompt informed by a reference document (1944 Manzanar camp layout map).',
            generator: 'WorldLabs Marble',
            tsAuthority: 'timestamp.digicert.com',
            rows: [
                { k: 'model',       v: 'WorldLabs Marble' },
                { k: 'source_type', v: 'trainedAlgorithmicMedia' },
                { k: 'ref_source',  v: '03_npmaps_historical_1944.gif · manzanar' },
                { k: 'ref_cid',     v: 'bafkreigf2swd5xlplrvvspdz65pk6nsqqii7rib45tonlfbre6midejj6a', mono: true }
            ]
        }
    },
    {
        type: 'world',
        typeLabel: '3-D World · Gaussian Splats',
        title: 'Initial 3-D World',
        filename: 'initial_splats.sog',
        cid: 'bafkreiagiqwrcg57mnkh65lulgvtt4na2ice3l3nm5nebnqxkz25p5tphi',
        placeholderTheme: 'mzpc-ph-world',
        desc: 'Initial 3-D world model generated from the final edited panorama using Marble. Stored as a Gaussian splat scene (.sog).',
        edge: { label: 'generated', from: 'Final Panorama', cls: 'mzpc-rel-generated' },
        prompt: null,
        ingredients: [
            { title: 'final_pano.png', rel: 'inputTo', relCls: 'mzpc-ing-input',
              cid: 'bafkreieka2otbizmwduczyszyzmv3epdev4xfdn7whss6c3wyl5upo22ki' }
        ],
        c2pa: {
            action: 'c2pa.created',
            actionCls: 'mzpc-pill-created',
            desc: 'Initial 3-D world model generated from the final edited panorama by Marble.',
            generator: 'WorldLabs Marble',
            tsAuthority: 'timestamp.digicert.com',
            rows: [
                { k: 'model',       v: 'WorldLabs Marble' },
                { k: 'format',      v: '.sog (Gaussian splat scene)' },
                { k: 'source_type', v: 'trainedAlgorithmicMedia' },
                { k: 'seed_cid',    v: 'bafkreieka2otbizmwduczyszyzmv3epdev4xfdn7whss6c3wyl5upo22ki', mono: true }
            ]
        }
    },
    {
        type: 'world',
        typeLabel: '3-D World · Expanded',
        title: 'Final 3-D World',
        filename: 'final-outdoors.sog',
        cid: 'bafkreiebpiza4uxyzwhxvwnd3ccgdoyapvcemzwmtgkgjqizyhjo2zlmb4',
        placeholderTheme: 'mzpc-ph-world',
        desc: 'World expanded via text prompt to allow free first-person exploration down a full row of barracks.',
        edge: { label: 'edited', from: 'Initial 3-D World', cls: 'mzpc-rel-edited' },
        prompt: 'Extend the scene to allow for free exploration down a row of barracks.',
        ingredients: [
            { title: 'initial_splats.sog', rel: 'inputTo', relCls: 'mzpc-ing-input',
              cid: 'bafkreiagiqwrcg57mnkh65lulgvtt4na2ice3l3nm5nebnqxkz25p5tphi' }
        ],
        c2pa: {
            action: 'c2pa.edited',
            actionCls: 'mzpc-pill-edited',
            desc: '3-D world expanded using a text prompt to allow free first-person exploration.',
            generator: 'WorldLabs Marble',
            tsAuthority: 'timestamp.digicert.com',
            rows: [
                { k: 'model',       v: 'WorldLabs Marble' },
                { k: 'format',      v: '.sog (Gaussian splat scene)' },
                { k: 'source_type', v: 'trainedAlgorithmicMedia' },
                { k: 'parent_cid',  v: 'bafkreiagiqwrcg57mnkh65lulgvtt4na2ice3l3nm5nebnqxkz25p5tphi', mono: true }
            ]
        }
    }
];

var EDGE_LABELS = ['', 'generated', 'edited', 'generated', 'edited'];

// ── Lifecycle ────────────────────────────────────────────────

ProvenanceCarousel.prototype.initialize = function () {
    this._current      = 0;
    this._manifestOpen = false;
    this._open         = false;
    this._wrap         = null;
    this._marker       = null;
    this._screenPos    = new pc.Vec3();
    this._mouseX       = 0;
    this._mouseY       = 0;

    this._injectStyles();
    this._buildUI();

    if (this.hotspotEntity) {
        this._buildMarker();
        this.app.mouse.on(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
        this.app.mouse.on(pc.EVENT_MOUSEDOWN, this._onMouseDown, this);
    }

    var self = this;
    this.app.on(this.openEvent, function (startIdx) {
        self.open(typeof startIdx === 'number' ? startIdx : 0);
    });

    this.on('destroy', this._cleanup, this);
};

ProvenanceCarousel.prototype.update = function () {
    if (!this.hotspotEntity || !this._marker) return;

    var cam = this.entity.camera;
    if (!cam) return;

    var canvas = this.app.graphicsDevice.canvas;
    var rect   = canvas.getBoundingClientRect();
    var cw     = canvas.clientWidth;
    var ch     = canvas.clientHeight;

    cam.worldToScreen(this.hotspotEntity.getPosition(), this._screenPos);

    if (this._screenPos.z < 0) {
        this._marker.style.display = 'none';
        return;
    }

    var px = rect.left + (this._screenPos.x / cw) * rect.width;
    var py = rect.top  + (this._screenPos.y / ch) * rect.height;

    this._marker.style.display = 'flex';
    this._marker.style.left    = (px - 13) + 'px';
    this._marker.style.top     = (py - 13) + 'px';

    var dx   = this._mouseX - px;
    var dy   = this._mouseY - py;
    var lbl  = this._marker.querySelector('.mzpc-hotspot-label');
    if (lbl) lbl.style.opacity = Math.sqrt(dx * dx + dy * dy) < this.hitRadius ? '1' : '0';
};

// ── Hotspot marker ────────────────────────────────────────────

ProvenanceCarousel.prototype._buildMarker = function () {
    var marker = document.createElement('div');
    marker.className = 'mzpc-hotspot';
    marker.innerHTML =
        '<div class="mzpc-hotspot-inner"></div>' +
        '<span class="mzpc-hotspot-label">' + _esc(this.hotspotLabel) + '</span>';
    document.body.appendChild(marker);
    this._marker = marker;
};

ProvenanceCarousel.prototype._onMouseMove = function (e) {
    this._mouseX = e.event.clientX;
    this._mouseY = e.event.clientY;
};

ProvenanceCarousel.prototype._onMouseDown = function (e) {
    if (this._open || !this.hotspotEntity) return;

    var cam = this.entity.camera;
    if (!cam) return;

    var canvas = this.app.graphicsDevice.canvas;
    var rect   = canvas.getBoundingClientRect();
    var cw     = canvas.clientWidth;
    var ch     = canvas.clientHeight;

    cam.worldToScreen(this.hotspotEntity.getPosition(), this._screenPos);
    if (this._screenPos.z < 0) return;

    var px   = rect.left + (this._screenPos.x / cw) * rect.width;
    var py   = rect.top  + (this._screenPos.y / ch) * rect.height;
    var dx   = e.event.clientX - px;
    var dy   = e.event.clientY - py;

    if (Math.sqrt(dx * dx + dy * dy) < this.hitRadius) {
        this.open(0);
    }
};

// ── Public API ───────────────────────────────────────────────

ProvenanceCarousel.prototype.open = function (startIdx) {
    if (this._open) return;
    this._open = true;
    this._wrap.style.display = 'flex';
    // Trigger enter animation on next tick
    var scrim = document.getElementById('mzpc-scrim');
    setTimeout(function () { scrim.classList.add('on'); }, 16);
    this._goTo(typeof startIdx === 'number' ? startIdx : 0);
};

ProvenanceCarousel.prototype.close = function () {
    if (!this._open) return;
    var self = this;
    var scrim = document.getElementById('mzpc-scrim');
    scrim.classList.remove('on');
    setTimeout(function () {
        self._wrap.style.display = 'none';
        self._open = false;
    }, 480);
};

// ── Build UI ─────────────────────────────────────────────────

ProvenanceCarousel.prototype._buildUI = function () {
    var self = this;

    var wrap = document.createElement('div');
    wrap.id = 'mzpc-wrap';
    wrap.style.display = 'none';

    wrap.innerHTML =
        '<div id="mzpc-scrim">' +
        '  <div id="mzpc-close-btn">&#10005;&nbsp; Close</div>' +
        '  <div id="mzpc-inner">' +

        // Header
        '    <div id="mzpc-header">' +
        '      <div id="mzpc-eyebrow">' +
        '        <span class="mzpc-dot"></span>' +
        '        Manzanar War Relocation Center · Marble Pipeline' +
        '        <span class="mzpc-dot"></span>' +
        '      </div>' +
        '      <div id="mzpc-title">Synthetic World Model <em>Provenance</em></div>' +
        '    </div>' +

        // Pipeline track
        '    <div id="mzpc-track"></div>' +

        // Card
        '    <div id="mzpc-card">' +
        '      <div id="mzpc-pips"></div>' +
        '      <div id="mzpc-card-image"></div>' +
        '      <div id="mzpc-card-body"></div>' +
        '      <div class="mzpc-divider"></div>' +
        '      <div id="mzpc-c2pa-bar">' +
        '        <div class="mzpc-c2pa-left">' +
        '          <span class="mzpc-c2pa-badge">C2PA</span>' +
        '          <span id="mzpc-c2pa-status">Content credentials</span>' +
        '        </div>' +
        '        <span id="mzpc-c2pa-chevron">&#8964;</span>' +
        '      </div>' +
        '      <div id="mzpc-manifest"></div>' +
        '      <div id="mzpc-card-footer">' +
        '        <span id="mzpc-counter"></span>' +
        '        <div class="mzpc-nav-btns">' +
        '          <button id="mzpc-prev">&#8592; Back</button>' +
        '          <button id="mzpc-next">Next &#8594;</button>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +

        '  </div>' +
        '</div>';

    document.body.appendChild(wrap);
    this._wrap = wrap;

    // Build pipeline track
    this._buildTrack();

    // Wire events
    document.getElementById('mzpc-prev').addEventListener('click', function () {
        self._goTo(self._current - 1);
    });
    document.getElementById('mzpc-next').addEventListener('click', function () {
        if (self._current < STEPS.length - 1) self._goTo(self._current + 1);
    });
    document.getElementById('mzpc-c2pa-bar').addEventListener('click', function () {
        self._toggleManifest();
    });
    document.getElementById('mzpc-close-btn').addEventListener('click', function () {
        self.close();
    });
    document.getElementById('mzpc-scrim').addEventListener('click', function (e) {
        if (e.target === document.getElementById('mzpc-scrim')) self.close();
    });

    // Keyboard nav — only when open
    document.addEventListener('keydown', function (e) {
        if (!self._open) return;
        if (e.key === 'ArrowLeft')  self._goTo(self._current - 1);
        if (e.key === 'ArrowRight') self._goTo(self._current + 1);
        if (e.key === 'Escape')     self.close();
    });
};

// ── Pipeline track ────────────────────────────────────────────

ProvenanceCarousel.prototype._buildTrack = function () {
    var self  = this;
    var track = document.getElementById('mzpc-track');
    track.innerHTML = '';

    STEPS.forEach(function (s, i) {
        if (i > 0) {
            var edge = document.createElement('div');
            edge.className = 'mzpc-pt-edge';
            edge.innerHTML =
                '<div class="mzpc-pt-line"></div>' +
                '<div class="mzpc-pt-edge-label">' + _esc(EDGE_LABELS[i]) + '</div>';
            track.appendChild(edge);
        }
        var node = document.createElement('div');
        node.className = 'mzpc-pt-node';
        node.id = 'mzpc-pt-' + i;
        node.innerHTML =
            '<div class="mzpc-pt-dot"><div class="mzpc-pt-dot-inner"></div></div>' +
            '<div class="mzpc-pt-label">' + _esc(s.title) + '</div>';
        node.addEventListener('click', (function (idx) {
            return function () { self._goTo(idx); };
        })(i));
        track.appendChild(node);
    });
};

ProvenanceCarousel.prototype._updateTrack = function () {
    var current = this._current;
    STEPS.forEach(function (_, i) {
        var n = document.getElementById('mzpc-pt-' + i);
        if (!n) return;
        n.classList.remove('mzpc-pt-active', 'mzpc-pt-done');
        if (i < current)       n.classList.add('mzpc-pt-done');
        else if (i === current) n.classList.add('mzpc-pt-active');
    });
};

// ── Navigation ────────────────────────────────────────────────

ProvenanceCarousel.prototype._goTo = function (idx) {
    if (idx < 0 || idx >= STEPS.length) return;
    this._current      = idx;
    this._manifestOpen = false;
    this._renderCard();
    this._updateTrack();
    this._updatePips();
};

// ── Pips ──────────────────────────────────────────────────────

ProvenanceCarousel.prototype._updatePips = function () {
    var current = this._current;
    document.getElementById('mzpc-pips').innerHTML = STEPS.map(function (_, i) {
        var cls = i < current ? 'mzpc-pip-done' : i === current ? 'mzpc-pip-active' : '';
        return '<div class="mzpc-pip ' + cls + '"></div>';
    }).join('');
};

// ── Card render ───────────────────────────────────────────────

ProvenanceCarousel.prototype._renderCard = function () {
    var idx = this._current;
    var s   = STEPS[idx];

    // ── Image
    var imgEl = document.getElementById('mzpc-card-image');
    var imgSrc = this._getImageUrl(idx);
    if (imgSrc) {
        imgEl.innerHTML =
            '<img src="' + _esc(imgSrc) + '" alt="' + _esc(s.title) + '"' +
            ' onerror="this.parentNode.innerHTML=\'<div class=\\\"mzpc-ph ' + s.placeholderTheme + '\\\"><div class=\\\"mzpc-ph-title\\\">' + _esc(s.title) + '</div><div class=\\\"mzpc-ph-sub\\\">' + _esc(s.typeLabel) + '</div></div>\'">';
    } else {
        imgEl.innerHTML =
            '<div class="mzpc-ph ' + s.placeholderTheme + '">' +
            '<div class="mzpc-ph-title">' + _esc(s.title) + '</div>' +
            '<div class="mzpc-ph-sub">' + _esc(s.typeLabel) + '</div>' +
            '</div>';
    }

    // Edge badge over image
    if (s.edge) {
        imgEl.innerHTML +=
            '<div class="mzpc-edge-badge">' +
            '<span class="mzpc-edge-arrow">&#8592;</span>' +
            '<span class="mzpc-edge-from">' + _esc(s.edge.from) + '</span>' +
            '<span class="mzpc-edge-rel ' + s.edge.cls + '">' + _esc(s.edge.label) + '</span>' +
            '</div>';
    }

    // ── Body
    var body =
        '<div class="mzpc-card-type">' + _esc(s.typeLabel) + '</div>' +
        '<h2 class="mzpc-card-title">' + _esc(s.title) + '</h2>' +
        '<div class="mzpc-card-filename">' + _esc(s.filename) + '</div>' +
        '<div class="mzpc-card-cid">' + _esc(s.cid) + '</div>' +
        '<p class="mzpc-card-desc">' + _esc(s.desc) + '</p>';

    if (s.prompt) {
        body +=
            '<div class="mzpc-prompt">' +
            '<div class="mzpc-prompt-label">Text prompt</div>' +
            '<div class="mzpc-prompt-text">' + _esc(s.prompt) + '</div>' +
            '</div>';
    }

    if (s.ingredients && s.ingredients.length) {
        body += '<div class="mzpc-ingredients"><div class="mzpc-ing-label">Ingredients</div>';
        s.ingredients.forEach(function (ing) {
            body +=
                '<div class="mzpc-ing-row">' +
                '<span class="mzpc-ing-rel ' + ing.relCls + '">' + _esc(ing.rel) + '</span>' +
                '<div class="mzpc-ing-info">' +
                '<div class="mzpc-ing-name">' + _esc(ing.title) + '</div>' +
                '<div class="mzpc-ing-cid">' + _esc(ing.cid) + '</div>' +
                '</div></div>';
        });
        body += '</div>';
    }

    document.getElementById('mzpc-card-body').innerHTML = body;

    // ── Manifest
    var c = s.c2pa;
    var rows = (c.rows || []).map(function (r) {
        return '<div class="mzpc-mrow"><span class="mzpc-mk">' + _esc(r.k) + '</span>' +
            '<span class="mzpc-mv' + (r.mono ? ' mzpc-mono' : '') + '">' + _esc(r.v) + '</span></div>';
    }).join('');

    document.getElementById('mzpc-manifest').innerHTML =
        '<div class="mzpc-manifest-inner">' +
        '<div class="mzpc-msec">' +
        '<p class="mzpc-mheading">c2pa.actions</p>' +
        '<div class="mzpc-mrow"><span class="mzpc-mk">action</span>' +
        '<span class="mzpc-mv"><span class="mzpc-pill ' + c.actionCls + '">' + _esc(c.action) + '</span></span></div>' +
        '<div class="mzpc-mrow"><span class="mzpc-mk">description</span><span class="mzpc-mv">' + _esc(c.desc) + '</span></div>' +
        '<div class="mzpc-mrow"><span class="mzpc-mk">softwareAgent</span><span class="mzpc-mv">' + _esc(c.generator) + '</span></div>' +
        '<div class="mzpc-mrow"><span class="mzpc-mk">timestamp authority</span><span class="mzpc-mv">' + _esc(c.tsAuthority) + '</span></div>' +
        '</div>' +
        '<div class="mzpc-msec">' +
        '<p class="mzpc-mheading">stds.schema-org.CreativeWork</p>' +
        rows +
        '</div>' +
        '</div>';

    // Reset manifest
    document.getElementById('mzpc-manifest').classList.remove('mzpc-manifest-open');
    document.getElementById('mzpc-c2pa-chevron').style.transform = '';

    // Counter + buttons
    document.getElementById('mzpc-counter').textContent = (idx + 1) + ' / ' + STEPS.length;
    document.getElementById('mzpc-prev').disabled = idx === 0;
    var nextBtn = document.getElementById('mzpc-next');
    nextBtn.disabled   = idx === STEPS.length - 1;
    nextBtn.textContent = idx === STEPS.length - 1 ? 'Done' : 'Next →';
};

// ── Manifest toggle ───────────────────────────────────────────

ProvenanceCarousel.prototype._toggleManifest = function () {
    this._manifestOpen = !this._manifestOpen;
    document.getElementById('mzpc-manifest').classList.toggle('mzpc-manifest-open', this._manifestOpen);
    document.getElementById('mzpc-c2pa-chevron').style.transform = this._manifestOpen ? 'rotate(180deg)' : '';
};

// ── Image URL helper ──────────────────────────────────────────

ProvenanceCarousel.prototype._getImageUrl = function (idx) {
    if (!this.stepImages || !this.stepImages[idx]) return null;
    var entry = this.stepImages[idx];
    if (!entry.image) return null;
    // entry.image is a pc.Asset — resolve to URL
    var asset = entry.image;
    if (asset.getFileUrl) return asset.getFileUrl();
    if (asset.resource && asset.resource.src) return asset.resource.src;
    return null;
};

// ── Styles ────────────────────────────────────────────────────

ProvenanceCarousel.prototype._injectStyles = function () {
    if (document.getElementById('mzpc-styles')) return;

    var css = [
        '@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap");',
        ':root {',
        '  --mzpc-sand:      #f2ede3;',
        '  --mzpc-sand-mid:  #e4ddd0;',
        '  --mzpc-sand-deep: #c9bfaf;',
        '  --mzpc-ink:       #1e1a16;',
        '  --mzpc-ink-mid:   #3d342b;',
        '  --mzpc-ink-soft:  #6b5f53;',
        '  --mzpc-ink-faint: #9e9086;',
        '  --mzpc-rust:      #8c4a2c;',
        '  --mzpc-rust-lt:   #f2e4db;',
        '  --mzpc-gold:      #b08c3c;',
        '  --mzpc-gold-lt:   #f5edda;',
        '  --mzpc-sage:      #4f6b58;',
        '  --mzpc-sage-lt:   #deeade;',
        '  --mzpc-slate:     #3b4f5c;',
        '  --mzpc-slate-lt:  #dde6ec;',
        '  --mzpc-white:     #fdfaf6;',
        '}',

        // Outer wrap + scrim
        '#mzpc-wrap {',
        '  position: fixed; inset: 0; z-index: 10500;',
        '  pointer-events: none;',
        '}',
        '#mzpc-scrim {',
        '  position: fixed; inset: 0;',
        '  background: rgba(12,10,8,0);',
        '  display: flex; align-items: center; justify-content: center;',
        '  transition: background .45s ease;',
        '  pointer-events: none;',
        '  padding: 32px 16px 48px;',
        '  flex-direction: column;',
        '  gap: 0;',
        '  overflow-y: auto;',
        '}',
        '#mzpc-scrim.on { background: rgba(12,10,8,.88); pointer-events: all; }',

        // Close button
        '#mzpc-close-btn {',
        '  position: fixed; top: 16px; right: 20px;',
        '  display: flex; align-items: center; gap: 7px; padding: 7px 14px 7px 10px;',
        '  border-radius: 100px; background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.15);',
        '  color: rgba(255,255,255,.8); font-family: "DM Sans",sans-serif; font-size: 11px;',
        '  letter-spacing: .08em; text-transform: uppercase; cursor: pointer; backdrop-filter: blur(8px);',
        '  transition: background .2s; z-index: 1;',
        '}',
        '#mzpc-close-btn:hover { background: rgba(0,0,0,.65); color: white; }',

        // Inner column
        '#mzpc-inner {',
        '  width: 100%; max-width: 680px;',
        '  display: flex; flex-direction: column; align-items: center;',
        '  gap: 0;',
        '}',

        // Header
        '#mzpc-header { text-align: center; margin-bottom: 24px; }',
        '#mzpc-eyebrow {',
        '  display: flex; align-items: center; justify-content: center; gap: 10px;',
        '  font-size: 10px; letter-spacing: .22em; text-transform: uppercase;',
        '  color: rgba(210,200,185,.35); margin-bottom: 10px;',
        '  font-family: "DM Sans",sans-serif;',
        '}',
        '.mzpc-dot { width:3px; height:3px; border-radius:50%; background:#8c4a2c; opacity:.4; flex-shrink:0; }',
        '#mzpc-title {',
        '  font-family: "Cormorant Garamond",serif; font-weight:300;',
        '  font-size: clamp(1.6rem,4vw,2.4rem); color: rgba(245,240,230,.9);',
        '  letter-spacing: .01em; line-height: 1.15;',
        '}',
        '#mzpc-title em { font-style:italic; color:rgba(176,140,60,.85); }',

        // Pipeline track
        '#mzpc-track {',
        '  display: flex; align-items: center; gap: 0;',
        '  margin-bottom: 24px; width: 100%; padding: 0 4px;',
        '}',
        '.mzpc-pt-node {',
        '  display: flex; flex-direction: column; align-items: center; gap: 6px;',
        '  cursor: pointer; flex-shrink: 0;',
        '}',
        '.mzpc-pt-dot {',
        '  width:28px; height:28px; border-radius:50%;',
        '  border:1.5px solid rgba(200,190,170,.2);',
        '  display:flex; align-items:center; justify-content:center;',
        '  transition: border-color .2s, background .2s;',
        '  background: rgba(20,18,16,.6);',
        '}',
        '.mzpc-pt-dot-inner { width:8px; height:8px; border-radius:50%; background:rgba(200,190,170,.2); transition:background .2s; }',
        '.mzpc-pt-active .mzpc-pt-dot  { border-color:#b08c3c; background:rgba(176,140,60,.12); }',
        '.mzpc-pt-active .mzpc-pt-dot-inner { background:#b08c3c; }',
        '.mzpc-pt-done .mzpc-pt-dot    { border-color:rgba(79,107,88,.5); }',
        '.mzpc-pt-done .mzpc-pt-dot-inner { background:#4f6b58; }',
        '.mzpc-pt-node:hover .mzpc-pt-dot { border-color:rgba(200,190,170,.5); }',
        '.mzpc-pt-label {',
        '  font-size:9px; letter-spacing:.12em; text-transform:uppercase;',
        '  color:rgba(200,190,170,.3); text-align:center; line-height:1.3;',
        '  max-width:60px; transition:color .2s; font-family:"DM Sans",sans-serif;',
        '}',
        '.mzpc-pt-active .mzpc-pt-label { color:rgba(176,140,60,.7); }',
        '.mzpc-pt-done .mzpc-pt-label   { color:rgba(79,107,88,.6); }',
        '.mzpc-pt-edge {',
        '  flex:1; display:flex; flex-direction:column; align-items:center;',
        '  gap:3px; padding:0 2px; padding-bottom:20px;',
        '}',
        '.mzpc-pt-line { width:100%; height:1px; background:rgba(200,190,170,.12); }',
        '.mzpc-pt-edge-label {',
        '  font-size:8px; letter-spacing:.1em; text-transform:uppercase;',
        '  color:rgba(200,190,170,.2); white-space:nowrap; font-family:"DM Sans",sans-serif;',
        '}',

        // Card
        '#mzpc-card {',
        '  background: var(--mzpc-white); border-radius: 24px; overflow: hidden;',
        '  box-shadow: 0 24px 64px rgba(0,0,0,.5), 0 4px 16px rgba(0,0,0,.3);',
        '  width: 100%; display:flex; flex-direction:column;',
        '}',

        // Pips
        '#mzpc-pips { display:flex; gap:5px; align-items:center; padding: 10px 24px 0; flex-shrink:0; }',
        '.mzpc-pip {',
        '  height:3px; flex:1; border-radius:100px;',
        '  background:rgba(200,190,170,.15); transition:background .3s;',
        '}',
        '.mzpc-pip-done   { background:#4f6b58 !important; }',
        '.mzpc-pip-active { background:#8c4a2c !important; }',

        // Image panel
        '#mzpc-card-image {',
        '  width:100%; aspect-ratio:16/9;',
        '  position:relative; overflow:hidden;',
        '  background:#1c1712; display:flex; align-items:center; justify-content:center;',
        '}',
        '#mzpc-card-image img { width:100%; height:100%; object-fit:cover; display:block; }',

        // Placeholders
        '.mzpc-ph {',
        '  width:100%; height:100%;',
        '  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;',
        '}',
        '.mzpc-ph-source { background: linear-gradient(140deg,#c4b99a 0%,#a89278 35%,#8a7258 100%); }',
        '.mzpc-ph-pano   { background: linear-gradient(140deg,#8aa8bc 0%,#6a8898 35%,#4a6878 100%); }',
        '.mzpc-ph-world  { background: linear-gradient(140deg,#8a9870 0%,#6a7850 35%,#4a5830 100%); }',
        '.mzpc-ph-title  { font-family:"Cormorant Garamond",serif; font-style:italic; font-size:17px; color:rgba(30,26,22,.55); text-align:center; padding:0 2rem; line-height:1.35; }',
        '.mzpc-ph-sub    { font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:rgba(30,26,22,.3); font-family:"DM Sans",sans-serif; }',

        // Edge badge
        '.mzpc-edge-badge {',
        '  position:absolute; bottom:12px; left:16px;',
        '  display:flex; align-items:center; gap:8px;',
        '  background:rgba(12,10,8,.7); border-radius:100px;',
        '  padding:5px 12px 5px 8px; backdrop-filter:blur(8px);',
        '  border:0.5px solid rgba(255,255,255,.1);',
        '}',
        '.mzpc-edge-arrow { font-size:13px; color:rgba(255,255,255,.5); line-height:1; }',
        '.mzpc-edge-from  { font-size:10px; color:rgba(210,200,185,.55); letter-spacing:.08em; font-family:"DM Sans",sans-serif; }',
        '.mzpc-edge-rel   { font-size:10px; letter-spacing:.12em; text-transform:uppercase; padding:2px 7px; border-radius:2px; font-weight:500; font-family:"DM Sans",sans-serif; }',
        '.mzpc-rel-generated { background:rgba(79,107,88,.3); color:#a8d8a8; }',
        '.mzpc-rel-edited    { background:rgba(140,74,44,.3);  color:#e8b898; }',

        // Card body
        '#mzpc-card-body { padding: 20px 24px 0; font-family:"DM Sans",sans-serif; }',
        '.mzpc-card-type { font-size:9px; letter-spacing:.22em; text-transform:uppercase; color:var(--mzpc-ink-faint); margin-bottom:6px; }',
        '.mzpc-card-title { font-family:"Cormorant Garamond",serif; font-weight:300; font-size:24px; color:var(--mzpc-ink); line-height:1.15; margin-bottom:8px; }',
        '.mzpc-card-filename { font-family:monospace; font-size:11px; color:var(--mzpc-ink-faint); margin-bottom:10px; letter-spacing:.02em; }',
        '.mzpc-card-cid { font-family:monospace; font-size:10px; color:var(--mzpc-ink-faint); background:var(--mzpc-sand); border-radius:4px; padding:4px 8px; word-break:break-all; line-height:1.6; margin-bottom:12px; border:0.5px solid var(--mzpc-sand-deep); }',
        '.mzpc-card-desc { font-size:13px; line-height:1.75; color:var(--mzpc-ink-soft); margin-bottom:14px; }',

        // Prompt
        '.mzpc-prompt { background:var(--mzpc-gold-lt); border-radius:8px; padding:10px 14px; margin-bottom:14px; border-left:2px solid rgba(176,140,60,.4); }',
        '.mzpc-prompt-label { font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:var(--mzpc-gold); margin-bottom:5px; font-weight:500; }',
        '.mzpc-prompt-text  { font-size:12px; color:var(--mzpc-ink-mid); line-height:1.65; font-style:italic; }',

        // Ingredients
        '.mzpc-ingredients { margin-bottom:14px; }',
        '.mzpc-ing-label { font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:var(--mzpc-ink-faint); margin-bottom:8px; font-weight:500; }',
        '.mzpc-ing-row { display:flex; align-items:flex-start; gap:10px; padding:7px 10px; background:var(--mzpc-sand); border-radius:8px; margin-bottom:6px; border:0.5px solid var(--mzpc-sand-deep); }',
        '.mzpc-ing-rel { font-size:9px; letter-spacing:.1em; text-transform:uppercase; padding:2px 6px; border-radius:2px; flex-shrink:0; margin-top:1px; }',
        '.mzpc-ing-input   { background:var(--mzpc-slate-lt); color:var(--mzpc-slate); }',
        '.mzpc-ing-informed{ background:var(--mzpc-gold-lt); color:#7a6020; }',
        '.mzpc-ing-info { flex:1; min-width:0; }',
        '.mzpc-ing-name { font-size:11px; color:var(--mzpc-ink-mid); font-weight:400; margin-bottom:2px; }',
        '.mzpc-ing-cid  { font-family:monospace; font-size:9px; color:var(--mzpc-ink-faint); word-break:break-all; }',

        // Divider
        '.mzpc-divider { height:0.5px; background:var(--mzpc-sand-mid); margin:0 24px 0; }',

        // C2PA bar
        '#mzpc-c2pa-bar {',
        '  margin:0 24px; border-top:0.5px solid var(--mzpc-sand-mid);',
        '  display:flex; align-items:center; justify-content:space-between;',
        '  padding:10px 0; cursor:pointer; user-select:none; font-family:"DM Sans",sans-serif;',
        '  transition:opacity .15s;',
        '}',
        '#mzpc-c2pa-bar:hover { opacity:.8; }',
        '.mzpc-c2pa-left { display:flex; align-items:center; gap:8px; }',
        '.mzpc-c2pa-badge { background:#2a4a2a; color:#a8d8a8; font-size:9px; letter-spacing:.12em; text-transform:uppercase; padding:2px 7px; border-radius:2px; font-weight:500; }',
        '#mzpc-c2pa-status { font-size:11px; color:var(--mzpc-ink-soft); }',
        '#mzpc-c2pa-chevron { font-size:18px; color:var(--mzpc-ink-faint); transition:transform .2s; line-height:1; }',

        // Manifest
        '#mzpc-manifest { margin:0 24px; background:var(--mzpc-gold-lt); border-radius:8px; overflow:hidden; max-height:0; transition:max-height .35s ease; border:0.5px solid rgba(176,140,60,.2); }',
        '#mzpc-manifest.mzpc-manifest-open { max-height:600px; }',
        '.mzpc-manifest-inner { padding:14px 16px; font-family:"DM Sans",sans-serif; }',
        '.mzpc-msec { margin-bottom:12px; }',
        '.mzpc-msec:last-child { margin-bottom:0; }',
        '.mzpc-mheading { font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:#9a7d52; margin-bottom:6px; padding-bottom:4px; border-bottom:0.5px solid rgba(176,140,60,.3); }',
        '.mzpc-mrow { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:3px 0; }',
        '.mzpc-mk { font-size:11px; color:#9a7d52; flex-shrink:0; }',
        '.mzpc-mv { font-size:11px; color:#3a2a10; text-align:right; word-break:break-all; }',
        '.mzpc-mono { font-family:monospace; font-size:9px; color:#6b5030; }',
        '.mzpc-pill { display:inline-block; font-size:9px; padding:2px 7px; border-radius:2px; letter-spacing:.06em; text-transform:uppercase; }',
        '.mzpc-pill-created  { background:#dce8f0; color:#1a4a6a; }',
        '.mzpc-pill-edited   { background:var(--mzpc-rust-lt); color:var(--mzpc-rust); }',
        '.mzpc-pill-placed   { background:var(--mzpc-sage-lt); color:var(--mzpc-sage); }',
        '.mzpc-pill-published{ background:var(--mzpc-sand-mid); color:var(--mzpc-ink-soft); }',

        // Card footer
        '#mzpc-card-footer { padding:14px 24px 18px; display:flex; align-items:center; justify-content:space-between; font-family:"DM Sans",sans-serif; }',
        '#mzpc-counter { font-size:11px; color:var(--mzpc-ink-faint); letter-spacing:.08em; }',
        '.mzpc-nav-btns { display:flex; align-items:center; gap:8px; }',
        '#mzpc-prev, #mzpc-next {',
        '  padding:9px 22px; border-radius:100px;',
        '  font-family:"DM Sans",sans-serif; font-size:12px;',
        '  letter-spacing:.1em; text-transform:uppercase; cursor:pointer;',
        '  transition:background .2s, transform .15s; border:none;',
        '}',
        '#mzpc-prev { background:transparent; border:1px solid var(--mzpc-sand-deep); color:var(--mzpc-ink-soft); }',
        '#mzpc-prev:hover:not(:disabled) { background:var(--mzpc-sand); }',
        '#mzpc-prev:disabled { opacity:.35; cursor:default; }',
        '#mzpc-next { background:var(--mzpc-ink); color:var(--mzpc-sand); }',
        '#mzpc-next:hover:not(:disabled) { background:var(--mzpc-ink-mid); transform:translateY(-1px); }',
        '#mzpc-next:disabled { opacity:.35; cursor:default; transform:none; }',

        // Hotspot marker (same style as HotspotManager)
        '.mzpc-hotspot {',
        '  position:fixed; width:26px; height:26px; border-radius:50%;',
        '  background:rgba(176,140,60,0.25); border:1.5px solid #b08c3c;',
        '  display:flex; align-items:center; justify-content:center;',
        '  cursor:pointer; z-index:10400; pointer-events:none;',
        '  transition:background 0.15s, transform 0.15s;',
        '}',
        '.mzpc-hotspot-inner { width:8px; height:8px; border-radius:50%; background:#b08c3c; }',
        '.mzpc-hotspot-label {',
        '  position:absolute; bottom:32px; left:50%; transform:translateX(-50%);',
        '  white-space:nowrap; background:rgba(26,32,48,0.92);',
        '  color:#f0ddb0; font-size:11px; padding:3px 9px; border-radius:3px;',
        '  pointer-events:none; opacity:0; transition:opacity 0.15s;',
        '  letter-spacing:0.06em; border:0.5px solid #5c3d1a;',
        '  font-family:"DM Sans",sans-serif;',
        '}',
    ].join('\n');

    var style = document.createElement('style');
    style.id = 'mzpc-styles';
    style.textContent = css;
    document.head.appendChild(style);
};

// ── Cleanup ───────────────────────────────────────────────────

ProvenanceCarousel.prototype._cleanup = function () {
    if (this._marker && this._marker.parentNode) {
        this._marker.parentNode.removeChild(this._marker);
    }
    if (this.hotspotEntity) {
        this.app.mouse.off(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
        this.app.mouse.off(pc.EVENT_MOUSEDOWN, this._onMouseDown, this);
    }
    if (this._wrap && this._wrap.parentNode) {
        this._wrap.parentNode.removeChild(this._wrap);
    }
    var styleEl = document.getElementById('mzpc-styles');
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
};

// ── Utility ───────────────────────────────────────────────────

function _esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
