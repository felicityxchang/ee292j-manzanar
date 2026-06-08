// ─────────────────────────────────────────────────────────────
//  ScenePortal.js
//  Attach to your Camera entity.
//
//  Setup in the Editor:
//    1. Create one empty Entity per portal, positioned in 3D world
//       space near a door/passage.
//    2. Add entries to the `portals` array in Inspector:
//       - entity      → drag the portal Entity here
//       - label       → hover tooltip (e.g. "Enter the Mess Hall")
//       - sceneTitle  → scene card heading (e.g. "The Mess Hall")
//       - sceneSub    → scene card subtitle (e.g. "Community Dining")
//       - sceneName   → exact name of the PlayCanvas scene to load
//                        (check via console.log(this.app.scenes.list()))
//
//  What happens on click:
//    1. Veil fades to black (0.9 s)
//    2. Scene card appears naming the destination
//    3. New scene loads (full replace — no manual hierarchy management needed)
//    4. Veil fades out — new world is visible
//    5. Scene card lingers then fades away
//
//  App events fired:
//    scene:willTransition  { sceneTitle, sceneSub }
//    scene:didTransition   { sceneTitle, sceneSub }
// ─────────────────────────────────────────────────────────────

var ScenePortal = pc.createScript('scenePortal');

ScenePortal.attributes.add('portals', {
    type: 'json',
    array: true,
    schema: [
        { name: 'entity',     type: 'entity' },
        { name: 'label',      type: 'string', default: 'Enter' },
        { name: 'sceneTitle', type: 'string', default: 'New Area' },
        { name: 'sceneSub',   type: 'string', default: 'Manzanar War Relocation Center' }
    ]
});

// Parallel array — one scene name per portal entry (same index).
// PlayCanvas JSON schemas can struggle with string fields; this is more reliable.
ScenePortal.attributes.add('sceneNames', {
    type: 'string',
    array: true,
    description: 'Scene name for each portal (same order as portals array)'
});

ScenePortal.attributes.add('hitRadius', {
    type: 'number',
    default: 28,
    description: 'Pixel radius around a projected portal that counts as a click'
});

ScenePortal.attributes.add('cardLingerMs', {
    type: 'number',
    default: 3000,
    description: 'How long (ms) the scene card stays visible after the world reappears'
});

// ── Lifecycle ────────────────────────────────────────────────

ScenePortal.prototype.initialize = function () {
    this._active        = false;
    this._transitioning = false;
    this._markers       = [];
    this._screenPos     = new pc.Vec3();
    this._mouseX        = 0;
    this._mouseY        = 0;

    this._injectStyles();
    this._buildOverlay();

    for (var i = 0; i < this.portals.length; i++) {
        this._markers.push(this._buildMarker(this.portals[i]));
    }

    var self = this;
    this.app.on('titleScreen:dismissed', function () { self._active = true; });

    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this._onMouseDown, this);
    this.on('destroy', this._cleanup, this);
};

ScenePortal.prototype.update = function () {
    if (!this._active || this._transitioning) return;

    var cam = this.entity.camera;
    if (!cam) return;

    var canvas = this.app.graphicsDevice.canvas;
    var rect   = canvas.getBoundingClientRect();
    var cw     = canvas.clientWidth;
    var ch     = canvas.clientHeight;

    for (var i = 0; i < this.portals.length; i++) {
        var p      = this.portals[i];
        var marker = this._markers[i];
        if (!p.entity || !marker) continue;

        cam.worldToScreen(p.entity.getPosition(), this._screenPos);

        if (this._screenPos.z < 0) {
            marker.style.display = 'none';
            continue;
        }

        var px = rect.left + (this._screenPos.x / cw) * rect.width;
        var py = rect.top  + (this._screenPos.y / ch) * rect.height;

        marker.style.display = 'flex';
        marker.style.left = (px - 14) + 'px';
        marker.style.top  = (py - 14) + 'px';

        var dx   = this._mouseX - px;
        var dy   = this._mouseY - py;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var lbl  = marker.querySelector('.manz-portal-label');
        if (lbl) lbl.style.opacity = dist < this.hitRadius ? '1' : '0';
    }
};

// ── Mouse handlers ───────────────────────────────────────────

ScenePortal.prototype._onMouseMove = function (e) {
    this._mouseX = e.event.clientX;
    this._mouseY = e.event.clientY;
};

ScenePortal.prototype._onMouseDown = function (e) {
    if (!this._active || this._transitioning) return;

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

    for (var i = 0; i < this.portals.length; i++) {
        var p = this.portals[i];
        if (!p.entity) continue;

        cam.worldToScreen(p.entity.getPosition(), this._screenPos);
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
        this._transition(this.portals[closest], this.sceneNames[closest] || '');
    }
};

// ── Transition ───────────────────────────────────────────────

ScenePortal.prototype._transition = function (portal, sceneName) {
    var self = this;
    this._transitioning = true;
    this._hideMarkers();

    this.app.fire('scene:willTransition', {
        sceneTitle: portal.sceneTitle,
        sceneSub:   portal.sceneSub
    });

    // 1. Fade to black
    this._veilIn(function () {
        // 2. Show scene card over black while load happens
        self._showSceneCard(portal.sceneTitle, portal.sceneSub);

        // 3. Load the new scene — veil stays up until load completes
        self._loadScene(sceneName, function () {
            // 4. Fade veil out to reveal new scene, keeping card visible
            self._veilOut(function () {
                // 5. Card lingers over the new scene so the viewer can read it
                setTimeout(function () {
                    self._hideSceneCard(function () {
                        self._transitioning = false;
                        self.app.fire('scene:didTransition', {
                            sceneTitle: portal.sceneTitle,
                            sceneSub:   portal.sceneSub
                        });
                    });
                }, self.cardLingerMs);
            });
        });
    });
};

ScenePortal.prototype._loadScene = function (sceneName, cb) {
    var sceneItem = this.app.scenes.find(sceneName);
    if (!sceneItem) {
        console.error('ScenePortal: scene not found — "' + sceneName + '". Run console.log(this.app.scenes.list()) to see available names.');
        if (cb) cb();
        return;
    }

    // Snapshot existing root children before load so we know what to remove.
    // Skip the entity this script lives on — it owns the veil/scene-card DOM.
    var self = this;
    var persistentEntity = this.entity.root !== this.app.root ? this.entity.root : this.entity;
    var oldChildren = this.app.root.children.filter(function (c) {
        return c !== persistentEntity;
    });

    this.app.scenes.loadSceneHierarchy(sceneItem, function (err, newRoot) {
        if (err) {
            console.error('ScenePortal: failed to load scene "' + sceneName + '"', err);
        } else {
            for (var i = 0; i < oldChildren.length; i++) {
                oldChildren[i].destroy();
            }
        }
        if (cb) cb();
    });
};

// ── Veil helpers ─────────────────────────────────────────────

ScenePortal.prototype._veilIn = function (cb) {
    var v = this._veil;
    v.style.transition    = 'opacity 0.9s ease';
    v.style.opacity       = '1';
    v.style.pointerEvents = 'all';
    setTimeout(cb, 950);
};

ScenePortal.prototype._veilOut = function (cb) {
    var v = this._veil;
    v.style.transition = 'opacity 0.9s ease';
    v.style.opacity    = '0';
    setTimeout(function () {
        v.style.pointerEvents = 'none';
        if (cb) cb();
    }, 950);
};

// ── Scene card helpers ───────────────────────────────────────

ScenePortal.prototype._showSceneCard = function (title, sub) {
    this._sceneTitle.textContent = title;
    this._sceneSub.textContent   = sub;
    this._sceneCard.style.transition = 'opacity 0.7s ease';
    this._sceneCard.style.opacity    = '1';
};

ScenePortal.prototype._hideSceneCard = function (cb) {
    var card = this._sceneCard;
    card.style.transition = 'opacity 0.7s ease';
    card.style.opacity    = '0';
    setTimeout(function () { if (cb) cb(); }, 700);
};

// ── Marker visibility ────────────────────────────────────────

ScenePortal.prototype._hideMarkers = function () {
    for (var i = 0; i < this._markers.length; i++) {
        if (this._markers[i]) this._markers[i].style.display = 'none';
    }
};

// ── DOM construction ─────────────────────────────────────────

ScenePortal.prototype._buildMarker = function (portal) {
    var marker = document.createElement('div');
    marker.className = 'manz-portal';
    marker.innerHTML =
        '<div class="manz-portal-inner"></div>' +
        '<span class="manz-portal-label">' + this._esc(portal.label) + '</span>';
    document.body.appendChild(marker);
    return marker;
};

ScenePortal.prototype._buildOverlay = function () {
    var veil = document.createElement('div');
    veil.id = 'manz-portal-veil';
    veil.style.cssText = [
        'position:fixed', 'inset:0', 'background:#0c0a08',
        'opacity:0', 'pointer-events:none',
        'z-index:9000', 'transition:opacity 0.9s ease'
    ].join(';');
    document.body.appendChild(veil);
    this._veil = veil;

    var card = document.createElement('div');
    card.id = 'manz-portal-card';
    card.style.cssText = [
        'position:fixed', 'inset:0',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'z-index:9001', 'pointer-events:none',
        'opacity:0', 'transition:opacity 0.7s ease'
    ].join(';');
    card.innerHTML = [
        '<div class="manz-portal-eye">Now entering</div>',
        '<div class="manz-portal-scene-title" id="manz-portal-scene-title"></div>',
        '<div class="manz-portal-rule"></div>',
        '<div class="manz-portal-scene-sub" id="manz-portal-scene-sub"></div>'
    ].join('');
    document.body.appendChild(card);

    this._sceneCard  = card;
    this._sceneTitle = card.querySelector('#manz-portal-scene-title');
    this._sceneSub   = card.querySelector('#manz-portal-scene-sub');
};

// ── Styles ───────────────────────────────────────────────────

ScenePortal.prototype._injectStyles = function () {
    if (document.getElementById('manz-portal-styles')) return;

    var style = document.createElement('style');
    style.id = 'manz-portal-styles';
    style.textContent = [
        '@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&display=swap");',

        '.manz-portal {',
        '  position: fixed; width: 28px; height: 28px; border-radius: 50%;',
        '  background: rgba(200,168,90,0.22); border: 1.5px solid #c8a85a;',
        '  box-shadow: 0 0 10px 3px rgba(200,168,90,0.35);',
        '  display: flex; align-items: center; justify-content: center;',
        '  cursor: pointer; z-index: 1001; pointer-events: none;',
        '  animation: manzPortalPulse 2.4s ease-in-out infinite;',
        '}',
        '.manz-portal-inner {',
        '  width: 9px; height: 9px; border-radius: 50%; background: #c8a85a;',
        '}',
        '.manz-portal-label {',
        '  position: absolute; bottom: 34px; left: 50%; transform: translateX(-50%);',
        '  white-space: nowrap; background: rgba(26,32,48,0.92);',
        '  color: #f5edda; font-size: 11px; padding: 3px 9px; border-radius: 3px;',
        '  pointer-events: none; opacity: 0; transition: opacity 0.15s;',
        '  letter-spacing: 0.08em; border: 0.5px solid #c8a85a; font-family: sans-serif;',
        '}',
        '@keyframes manzPortalPulse {',
        '  0%, 100% { box-shadow: 0 0 10px 3px rgba(200,168,90,0.35); }',
        '  50%       { box-shadow: 0 0 18px 7px rgba(200,168,90,0.55); }',
        '}',
        '.manz-portal-eye {',
        '  font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase;',
        '  color: rgba(210,200,185,0.45); margin-bottom: 1rem; font-family: sans-serif;',
        '}',
        '.manz-portal-scene-title {',
        '  font-family: "Cormorant Garamond", Georgia, serif; font-weight: 300;',
        '  font-size: clamp(2.4rem, 6vw, 4rem); color: rgba(245,240,230,0.95);',
        '  letter-spacing: 0.04em; text-align: center;',
        '}',
        '.manz-portal-rule {',
        '  width: 40px; height: 1px; background: rgba(176,140,60,0.5); margin: 1.4rem auto 0;',
        '}',
        '.manz-portal-scene-sub {',
        '  margin-top: 0.9rem; font-size: 12px; letter-spacing: 0.2em;',
        '  text-transform: uppercase; color: rgba(210,200,185,0.4); font-family: sans-serif;',
        '}'
    ].join('\n');

    document.head.appendChild(style);
};

// ── Cleanup ──────────────────────────────────────────────────

ScenePortal.prototype._cleanup = function () {
    this.app.mouse.off(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
    this.app.mouse.off(pc.EVENT_MOUSEDOWN, this._onMouseDown, this);

    for (var i = 0; i < this._markers.length; i++) {
        if (this._markers[i] && this._markers[i].parentNode) {
            this._markers[i].parentNode.removeChild(this._markers[i]);
        }
    }
    if (this._veil      && this._veil.parentNode)     this._veil.parentNode.removeChild(this._veil);
    if (this._sceneCard && this._sceneCard.parentNode) this._sceneCard.parentNode.removeChild(this._sceneCard);

    var s = document.getElementById('manz-portal-styles');
    if (s) s.parentNode.removeChild(s);
};

// ── Utility ──────────────────────────────────────────────────

ScenePortal.prototype._esc = function (str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};
