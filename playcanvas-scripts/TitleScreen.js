// ─────────────────────────────────────────────────────────────
//  TitleScreen.js
//  Attach to any entity in your scene (e.g. "UI Manager").
//
//  What it does:
//    - Injects a full-screen semi-transparent HTML overlay on launch
//    - START button removes the overlay and fires a 'titleScreen:dismissed'
//      app event so other scripts (e.g. camera controllers) can unlock
//
//  Editor attributes (configurable in Inspector):
//    • overlayOpacity   — background darkness  (default 0.62)
//    • cameraEntity     — drag your Camera entity here; its script
//                         component will be enabled on START
// ─────────────────────────────────────────────────────────────

var TitleScreen = pc.createScript('titleScreen');

TitleScreen.attributes.add('overlayOpacity', {
    type: 'number',
    default: 0.62,
    min: 0,
    max: 1,
    precision: 2,
    description: 'Darkness of the overlay background (0 = invisible, 1 = solid)'
});

TitleScreen.attributes.add('cameraEntity', {
    type: 'entity',
    description: 'Camera entity whose scripts will be enabled when START is clicked'
});

// ── Lifecycle ────────────────────────────────────────────────

TitleScreen.prototype.initialize = function () {
    this._overlay = null;
    this._injectStyles();
    this._buildOverlay();
};

TitleScreen.prototype.destroy = function () {
    this._removeOverlay();
};

// ── DOM construction ─────────────────────────────────────────

TitleScreen.prototype._injectStyles = function () {
    if (document.getElementById('manz-title-styles')) return;

    var style = document.createElement('style');
    style.id = 'manz-title-styles';
    style.textContent = [
        '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&display=swap");',

        '#manz-title-overlay {',
        '  position: fixed;',
        '  inset: 0;',
        '  display: flex;',
        '  flex-direction: column;',
        '  align-items: center;',
        '  justify-content: center;',
        '  padding: 2.5rem 2rem;',
        '  z-index: 9999;',
        '  font-family: sans-serif;',
        '  pointer-events: all;',
        '}',

        '#manz-title-overlay .manz-eyebrow {',
        '  font-size: 11px;',
        '  letter-spacing: 0.2em;',
        '  text-transform: uppercase;',
        '  color: #c9a96e;',
        '  margin: 0 0 1.4rem;',
        '  font-weight: 400;',
        '  text-align: center;',
        '}',

        '#manz-title-overlay .manz-title {',
        '  font-family: "Playfair Display", Georgia, serif;',
        '  font-size: 38px;',
        '  font-weight: 400;',
        '  color: #f5e6c0;',
        '  text-align: center;',
        '  line-height: 1.2;',
        '  margin: 0 0 0.5rem;',
        '  letter-spacing: 0.01em;',
        '}',

        '#manz-title-overlay .manz-incarceration {',
        '  font-size: 11px;',
        '  letter-spacing: 0.18em;',
        '  text-transform: uppercase;',
        '  color: #b8924a;',
        '  margin: 0 0 1rem;',
        '  text-align: center;',
        '}',

        '#manz-title-overlay .manz-divider {',
        '  width: 40px;',
        '  height: 1px;',
        '  background: rgba(184,146,74,0.5);',
        '  margin: 0 auto 1rem;',
        '}',

        '#manz-title-overlay .manz-subtitle {',
        '  font-size: 11px;',
        '  font-style: italic;',
        '  color: rgba(200,175,130,0.85);',
        '  text-align: center;',
        '  margin: 0 0 2rem;',
        '  max-width: 360px;',
        '  line-height: 1.7;',
        '}',

        '#manz-title-overlay .manz-subtitle a {',
        '  color: #c9a96e;',
        '  text-decoration: underline;',
        '  text-underline-offset: 3px;',
        '}',

        '#manz-title-overlay .manz-start-btn {',
        '  background: transparent;',
        '  border: 1px solid #b8924a;',
        '  color: #f0ddb0;',
        '  padding: 0.65rem 2.8rem;',
        '  font-size: 11px;',
        '  letter-spacing: 0.22em;',
        '  text-transform: uppercase;',
        '  border-radius: 2px;',
        '  cursor: pointer;',
        '  font-family: sans-serif;',
        '  transition: background 0.2s;',
        '}',

        '#manz-title-overlay .manz-start-btn:hover {',
        '  background: rgba(184,146,74,0.18);',
        '}',

        // Fade-out animation
        '@keyframes manzFadeOut {',
        '  from { opacity: 1; }',
        '  to   { opacity: 0; }',
        '}',

        '#manz-title-overlay.dismissing {',
        '  animation: manzFadeOut 0.6s ease forwards;',
        '  pointer-events: none;',
        '}'
    ].join('\n');

    document.head.appendChild(style);
};

TitleScreen.prototype._buildOverlay = function () {
    var self = this;
    var opacity = this.overlayOpacity;

    var overlay = document.createElement('div');
    overlay.id = 'manz-title-overlay';
    overlay.style.background = 'rgba(30,20,8,' + opacity + ')';

    overlay.innerHTML = [
        '<p class="manz-eyebrow">1944 &middot; Manzanar War Relocation Center</p>',

        '<h1 class="manz-title">A Snow Day<br>in Manzanar</h1>',

        '<p class="manz-incarceration">Japanese-American Incarceration</p>',

        '<div class="manz-divider"></div>',

        '<p class="manz-subtitle">',
        '  Synthetic 3D world model inspired by Kango Takamura\'s artwork<br>',
        '  (<a href="https://ddr.densho.org/ddr-manz-2-41/" target="_blank" rel="noopener">',
        '    Courtesy of Manzanar National Historic Site<br>',
        '    and the Kango Takamura Collection',
        '  </a>)',
        '</p>',

        '<button class="manz-start-btn">Start</button>'
    ].join('');

    var btn = overlay.querySelector('.manz-start-btn');
    btn.addEventListener('click', function () {
        self._dismiss();
    });

    document.body.appendChild(overlay);
    this._overlay = overlay;
};

// ── Dismissal ────────────────────────────────────────────────

TitleScreen.prototype._dismiss = function () {
    var self = this;
    var overlay = this._overlay;
    if (!overlay) return;

    // Fade out, then remove
    overlay.classList.add('dismissing');
    overlay.addEventListener('animationend', function () {
        self._removeOverlay();
        // Enable camera controller scripts if a camera entity was assigned
        if (self.cameraEntity && self.cameraEntity.script) {
            self.cameraEntity.script.enabled = true;
        }
        // Fire app-level event so any other script can react
        self.app.fire('titleScreen:dismissed');
    }, { once: true });
};

TitleScreen.prototype._removeOverlay = function () {
    if (this._overlay && this._overlay.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;

    var styleEl = document.getElementById('manz-title-styles');
    if (styleEl) styleEl.parentNode.removeChild(styleEl);
};
