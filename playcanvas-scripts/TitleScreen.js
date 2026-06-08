// ─────────────────────────────────────────────────────────────
//  TitleScreen.js
//  Attach to any entity in your scene (e.g. "UI Manager").
//
//  Flow:
//    1. Original semi-transparent title overlay
//    2. START → fade to black → scene card → world reveals
//    3. 5-slide walkthrough lightbox
//    4. Done/Skip → fires 'titleScreen:dismissed' and enables cameraEntity
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
    this._root = null;
    this._step = 0;
    this._injectStyles();
    this._buildUI();
};

TitleScreen.prototype.destroy = function () {
    this._removeUI();
};

// ── Styles ───────────────────────────────────────────────────

TitleScreen.prototype._injectStyles = function () {
    if (document.getElementById('manz-ts-styles')) return;

    var s = document.createElement('style');
    s.id = 'manz-ts-styles';
    s.textContent = [
        '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap");',

        /* ── shared reset ── */
        '#manz-ts-root *, #manz-ts-root *::before, #manz-ts-root *::after { box-sizing: border-box; margin: 0; padding: 0; }',
        '#manz-ts-root { position: fixed; inset: 0; z-index: 9999; font-family: sans-serif; pointer-events: none; }',

        /* ── Title overlay (original style) ── */
        '#manz-ts-title {',
        '  position: fixed; inset: 0;',
        '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
        '  padding: 2.5rem 2rem;',
        '  pointer-events: all;',
        '}',
        '#manz-ts-title .manz-eyebrow {',
        '  font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;',
        '  color: #c9a96e; margin: 0 0 1.4rem; font-weight: 400; text-align: center;',
        '}',
        '#manz-ts-title .manz-h1 {',
        '  font-family: "Playfair Display", Georgia, serif;',
        '  font-size: 38px; font-weight: 400; color: #f5e6c0;',
        '  text-align: center; line-height: 1.2; margin: 0 0 0.5rem; letter-spacing: 0.01em;',
        '}',
        '#manz-ts-title .manz-incarceration {',
        '  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;',
        '  color: #b8924a; margin: 0 0 1rem; text-align: center;',
        '}',
        '#manz-ts-title .manz-divider {',
        '  width: 40px; height: 1px; background: rgba(184,146,74,0.5); margin: 0 auto 1rem;',
        '}',
        '#manz-ts-title .manz-subtitle {',
        '  font-size: 11px; font-style: italic; color: rgba(200,175,130,0.85);',
        '  text-align: center; margin: 0 0 2rem; max-width: 360px; line-height: 1.7;',
        '}',
        '#manz-ts-title .manz-subtitle a {',
        '  color: #c9a96e; text-decoration: underline; text-underline-offset: 3px;',
        '}',
        '#manz-ts-title .manz-start-btn {',
        '  background: transparent; border: 1px solid #b8924a; color: #f0ddb0;',
        '  padding: 0.65rem 2.8rem; font-size: 11px; letter-spacing: 0.22em;',
        '  text-transform: uppercase; border-radius: 2px; cursor: pointer;',
        '  font-family: sans-serif; transition: background 0.2s;',
        '}',
        '#manz-ts-title .manz-start-btn:hover { background: rgba(184,146,74,0.18); }',

        '@keyframes manzFadeOut { from { opacity: 1; } to { opacity: 0; } }',
        '#manz-ts-title.dismissing { animation: manzFadeOut 0.6s ease forwards; pointer-events: none; }',

        /* ── Veil ── */
        '#manz-ts-veil {',
        '  position: fixed; inset: 0; background: #0c0a08;',
        '  pointer-events: none; opacity: 0; transition: opacity 1s ease; z-index: 900;',
        '}',
        '#manz-ts-veil.in { opacity: 1; pointer-events: all; }',

        /* ── Scene card ── */
        '#manz-ts-scene {',
        '  position: fixed; inset: 0;',
        '  display: flex; align-items: center; justify-content: center; flex-direction: column;',
        '  pointer-events: none; z-index: 700;',
        '  opacity: 0; transition: opacity .7s ease;',
        '}',
        '#manz-ts-scene.on { opacity: 1; }',
        '.manz-scene-eye {',
        '  font-size: 10px; letter-spacing: .3em; text-transform: uppercase;',
        '  color: rgba(30,20,8,.6); margin-bottom: 1rem; font-family: "DM Sans", sans-serif;',
        '}',
        '.manz-scene-title {',
        '  font-family: "Cormorant Garamond", serif; font-weight: 300;',
        '  font-size: clamp(2.4rem, 6vw, 4rem); color: rgba(30,20,8,.88);',
        '  letter-spacing: .04em; text-align: center;',
        '}',
        '.manz-scene-rule { width: 40px; height: 1px; background: rgba(140,74,44,.45); margin: 1.4rem auto 0; }',
        '.manz-scene-sub {',
        '  margin-top: .9rem; font-size: 12px; letter-spacing: .2em; text-transform: uppercase;',
        '  color: rgba(30,20,8,.5); font-family: "DM Sans", sans-serif;',
        '}',

        /* ── Walkthrough ── */
        ':root {',
        '  --mz-sand:      #f2ede3;',
        '  --mz-sand-mid:  #e4ddd0;',
        '  --mz-sand-deep: #c9bfaf;',
        '  --mz-ink:       #1e1a16;',
        '  --mz-ink-mid:   #3d342b;',
        '  --mz-ink-soft:  #6b5f53;',
        '  --mz-ink-faint: #9e9086;',
        '  --mz-rust:      #8c4a2c;',
        '  --mz-gold:      #b08c3c;',
        '  --mz-white:     #fdfaf6;',
        '  --mz-slate:     #3b4f5c;',
        '}',

        '#manz-wt-scrim {',
        '  position: fixed; inset: 0; background: rgba(12,10,8,0);',
        '  z-index: 750; display: flex; align-items: center; justify-content: center;',
        '  pointer-events: none; transition: background .45s ease;',
        '}',
        '#manz-wt-scrim.on { background: rgba(12,10,8,.82); pointer-events: all; }',

        '#manz-wt-box {',
        '  width: 90vw; max-width: 640px;',
        '  background: var(--mz-white); border-radius: 24px; overflow: hidden;',
        '  opacity: 0; transform: scale(.94) translateY(14px);',
        '  transition: opacity .45s ease, transform .45s ease;',
        '  display: flex; flex-direction: column;',
        '}',
        '#manz-wt-scrim.on #manz-wt-box { opacity: 1; transform: scale(1) translateY(0); }',

        '#manz-wt-visual {',
        '  width: 100%; aspect-ratio: 16/9;',
        '  display: flex; align-items: center; justify-content: center;',
        '  position: relative; overflow: hidden; flex-shrink: 0;',
        '}',
        '.mz-slide { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .4s ease; }',
        '.mz-slide.active { opacity: 1; }',
        '.mz-slide.theme-slate { background: linear-gradient(135deg,#dde6ec 0%,#c8d8e2 100%); }',
        '.mz-slide.theme-gold  { background: linear-gradient(135deg,#f5edda 0%,#ecdfc4 100%); }',
        '.mz-slide.theme-rust  { background: linear-gradient(135deg,#f2e4db 0%,#e8d0c2 100%); }',
        '.mz-slide.theme-sage  { background: linear-gradient(135deg,#deeade 0%,#ccdece 100%); }',

        '.mz-illus { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 2rem; }',

        '.mz-key-group { display: flex; flex-direction: column; align-items: center; gap: 6px; }',
        '.mz-key-row { display: flex; gap: 6px; }',
        '.mz-key { width: 40px; height: 40px; border-radius: 8px; background: var(--mz-white); border: 1.5px solid var(--mz-sand-deep); box-shadow: 0 4px 0 var(--mz-sand-deep); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: var(--mz-ink-mid); font-family: monospace; }',
        '.mz-key-label { font-size: 12px; color: var(--mz-slate); letter-spacing: .05em; margin-top: 4px; font-family: "DM Sans", sans-serif; }',

        '.mz-mouse-fig { display: flex; flex-direction: column; align-items: center; gap: 12px; }',
        '.mz-mouse-body { width: 52px; height: 76px; border: 2px solid var(--mz-sand-deep); border-radius: 26px 26px 18px 18px; background: var(--mz-white); position: relative; overflow: hidden; }',
        '.mz-mouse-line { position: absolute; top: 28px; left: 50%; width: 1.5px; height: 24px; background: var(--mz-sand-deep); transform: translateX(-50%); }',
        '.mz-mouse-left { position: absolute; top: 0; left: 0; right: 50%; height: 28px; background: rgba(59,79,92,.15); border-radius: 26px 0 0 0; border-bottom: 1.5px solid var(--mz-sand-deep); }',
        '.mz-mouse-scroll { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 6px; height: 10px; border: 1.5px solid var(--mz-sand-deep); border-radius: 3px; }',
        '.mz-mouse-arrows { display: flex; gap: 16px; align-items: center; }',
        '.mz-arrow { font-size: 22px; color: var(--mz-slate); opacity: .7; }',
        '.mz-drag-label { font-size: 11px; color: var(--mz-slate); letter-spacing: .08em; text-transform: uppercase; font-family: "DM Sans", sans-serif; }',

        '.mz-dot { width: 28px; height: 28px; border-radius: 50%; }',
        '.mz-dot.red    { background: #b43c1e; box-shadow: 0 0 16px 4px rgba(180,60,30,.4); }',
        '.mz-dot.yellow { background: #c8a85a; box-shadow: 0 0 16px 4px rgba(200,168,90,.4); }',
        '.mz-dot-label { font-size: 13px; font-family: "DM Sans", sans-serif; }',

        '#manz-wt-content { padding: 28px 32px 24px; font-family: "DM Sans", sans-serif; }',
        '#manz-wt-pips { display: flex; align-items: center; gap: 6px; margin-bottom: 20px; }',
        '.mz-pip { height: 4px; flex: 1; border-radius: 100px; background: var(--mz-sand-deep); transition: background .35s; }',
        '.mz-pip.done   { background: var(--mz-gold); }',
        '.mz-pip.active { background: var(--mz-rust); }',

        '#manz-wt-title { font-family: "Cormorant Garamond", serif; font-weight: 300; font-size: 26px; color: var(--mz-ink); line-height: 1.15; margin-bottom: 10px; }',
        '#manz-wt-body { font-size: 14px; line-height: 1.75; color: var(--mz-ink-soft); margin-bottom: 24px; }',
        '#manz-wt-body strong { font-weight: 500; color: var(--mz-ink-mid); }',

        '#manz-wt-nav { display: flex; align-items: center; justify-content: space-between; }',
        '#manz-wt-skip { background: none; border: none; font-size: 12px; color: var(--mz-ink-faint); cursor: pointer; letter-spacing: .08em; text-transform: uppercase; text-decoration: underline; text-underline-offset: 3px; font-family: "DM Sans", sans-serif; }',
        '#manz-wt-skip:hover { color: var(--mz-ink-soft); }',
        '.mz-nav-btns { display: flex; align-items: center; gap: 10px; }',
        '#manz-wt-prev { padding: 9px 20px; border-radius: 100px; background: transparent; border: 1px solid var(--mz-sand-deep); font-family: "DM Sans", sans-serif; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--mz-ink-soft); cursor: pointer; transition: background .2s; }',
        '#manz-wt-prev:hover { background: var(--mz-sand); }',
        '#manz-wt-next { padding: 9px 24px; border-radius: 100px; background: var(--mz-ink); border: none; font-family: "DM Sans", sans-serif; font-size: 12px; font-weight: 400; letter-spacing: .1em; text-transform: uppercase; color: var(--mz-white); cursor: pointer; transition: background .2s, transform .15s; }',
        '#manz-wt-next:hover { background: var(--mz-ink-mid); transform: translateY(-1px); }',
        '#manz-wt-next.finish { background: var(--mz-rust); }',
        '#manz-wt-next.finish:hover { background: #6d3822; }',

        '#manz-skip-toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--mz-ink); color: var(--mz-white); padding: 12px 24px; border-radius: 100px; font-size: 13px; z-index: 780; pointer-events: none; white-space: nowrap; opacity: 1; transition: opacity .5s; font-family: "DM Sans", sans-serif; }',
    ].join('\n');

    document.head.appendChild(s);
};

// ── DOM construction ─────────────────────────────────────────

TitleScreen.prototype._buildUI = function () {
    var self = this;

    var root = document.createElement('div');
    root.id = 'manz-ts-root';
    root.innerHTML = [

        /* veil */
        '<div id="manz-ts-veil"></div>',

        /* title screen */
        '<div id="manz-ts-title">',
        '  <p class="manz-eyebrow">1944 &middot; Manzanar War Relocation Center</p>',
        '  <h1 class="manz-h1">A Snow Day<br>in Manzanar</h1>',
        '  <p class="manz-incarceration">Japanese-American Incarceration</p>',
        '  <div class="manz-divider"></div>',
        '  <p class="manz-subtitle">',
        '    Synthetic 3D world model inspired by Kango Takamura\'s artwork<br>',
        '    (<a href="https://ddr.densho.org/ddr-manz-2-41/" target="_blank" rel="noopener">',
        '      Courtesy of Manzanar National Historic Site<br>and the Kango Takamura Collection',
        '    </a>)',
        '  </p>',
        '  <button class="manz-start-btn" id="manz-play-btn">Start</button>',
        '</div>',

        /* scene card */
        '<div id="manz-ts-scene">',
        '  <div class="manz-scene-eye">Now entering</div>',
        '  <div class="manz-scene-title">Outdoors</div>',
        '  <div class="manz-scene-rule"></div>',
        '  <div class="manz-scene-sub">Manzanar War Relocation Center</div>',
        '</div>',

        /* walkthrough */
        '<div id="manz-wt-scrim">',
        '  <div id="manz-wt-box">',
        '    <div id="manz-wt-visual">',

        '      <div class="mz-slide theme-slate active" id="mz-vs-0">',
        '        <div class="mz-illus">',
        '          <div class="mz-key-group">',
        '            <div class="mz-key-row"><div class="mz-key">W</div></div>',
        '            <div class="mz-key-row"><div class="mz-key">A</div><div class="mz-key">S</div><div class="mz-key">D</div></div>',
        '          </div>',
        '          <div class="mz-key-label">or arrow keys</div>',
        '        </div>',
        '      </div>',

        '      <div class="mz-slide theme-slate" id="mz-vs-1">',
        '        <div class="mz-illus">',
        '          <div class="mz-mouse-fig">',
        '            <div class="mz-mouse-body">',
        '              <div class="mz-mouse-left"></div>',
        '              <div class="mz-mouse-line"></div>',
        '              <div class="mz-mouse-scroll"></div>',
        '            </div>',
        '            <div class="mz-mouse-arrows">',
        '              <span class="mz-arrow">&#8592;</span>',
        '              <span class="mz-drag-label">drag</span>',
        '              <span class="mz-arrow">&#8594;</span>',
        '            </div>',
        '          </div>',
        '        </div>',
        '      </div>',

        '      <div class="mz-slide theme-gold" id="mz-vs-2">',
        '        <div class="mz-illus">',
        '          <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">',
        '            <div class="mz-dot yellow"></div>',
        '            <div class="mz-dot-label" style="color:#b08c3c;">Glowing yellow &mdash; historical artifact</div>',
        '          </div>',
        '        </div>',
        '      </div>',

        '      <div class="mz-slide theme-rust" id="mz-vs-3">',
        '        <div class="mz-illus">',
        '          <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">',
        '            <div class="mz-dot red"></div>',
        '            <div class="mz-dot-label" style="color:#8c4a2c;">Glowing red &mdash; enter a new area</div>',
        '          </div>',
        '        </div>',
        '      </div>',

        '      <div class="mz-slide theme-sage" id="mz-vs-4">',
        '        <div class="mz-illus" style="gap:14px;">',
        '          <div style="display:flex;align-items:center;gap:2px;background:rgba(79,107,88,.18);border:1.5px solid rgba(79,107,88,.35);border-radius:100px;padding:2px;overflow:hidden;">',
        '            <div style="padding:8px 16px;border-radius:100px;background:rgba(79,107,88,.25);font-size:12px;font-weight:500;color:#4f6b58;letter-spacing:.04em;font-family:\'DM Sans\',sans-serif;">&#9776; Menu</div>',
        '            <div style="padding:8px 16px;font-size:12px;color:rgba(79,107,88,.7);letter-spacing:.04em;border-left:1px solid rgba(79,107,88,.2);font-family:\'DM Sans\',sans-serif;">&#9834; Sound</div>',
        '          </div>',
        '          <div style="width:180px;background:#fdfaf6;border:1.5px solid #e4ddd0;border-radius:10px;overflow:hidden;font-size:11px;">',
        '            <div style="padding:10px 12px 8px;border-bottom:1px solid #e4ddd0;font-family:\'Cormorant Garamond\',serif;font-style:italic;color:#1e1a16;font-size:13px;">A Snow Day in Manzanar</div>',
        '            <div style="padding:10px 12px;display:flex;flex-direction:column;gap:6px;font-family:\'DM Sans\',sans-serif;">',
        '              <div style="display:flex;align-items:center;gap:7px;color:#6b5f53;"><span style="width:7px;height:7px;border-radius:50%;background:#c8a85a;display:inline-block;"></span>Yellow glow — artifact</div>',
        '              <div style="display:flex;align-items:center;gap:7px;color:#6b5f53;"><span style="width:7px;height:7px;border-radius:50%;background:#b43c1e;display:inline-block;"></span>Red glow — new area</div>',
        '              <div style="color:#9e9086;padding-top:4px;border-top:1px solid #e4ddd0;">About · C2PA · Credits</div>',
        '            </div>',
        '          </div>',
        '        </div>',
        '      </div>',

        '    </div>',
        '    <div id="manz-wt-content">',
        '      <div id="manz-wt-pips"></div>',
        '      <div id="manz-wt-title"></div>',
        '      <div id="manz-wt-body"></div>',
        '      <div id="manz-wt-nav">',
        '        <button id="manz-wt-skip">Skip</button>',
        '        <div class="mz-nav-btns">',
        '          <button id="manz-wt-prev">Back</button>',
        '          <button id="manz-wt-next">Next</button>',
        '        </div>',
        '      </div>',
        '    </div>',
        '  </div>',
        '</div>',

    ].join('');

    document.body.appendChild(root);
    this._root = root;

    document.getElementById('manz-ts-title').style.background =
        'rgba(30,20,8,' + this.overlayOpacity + ')';

    this._wireEvents();
};

// ── Walkthrough data ─────────────────────────────────────────

var WT_SLIDES = [
    {
        visualIdx: 0,
        title: 'Walking through the camp',
        body:  'Use the <strong>W A S D keys</strong> or the <strong>arrow keys</strong> on your keyboard to move forward, backward, and side to side through the scene.',
    },
    {
        visualIdx: 1,
        title: 'Looking around',
        body:  '<strong>Click and drag the mouse</strong> left or right to turn your view and look around. You can explore every corner of the space.',
    },
    {
        visualIdx: 2,
        title: 'Viewing historical artifacts',
        body:  'Objects with a <strong>yellow glow</strong> are historical artifacts — watercolors, photographs, letters, and documents. Click one to open it full screen.',
    },
    {
        visualIdx: 3,
        title: 'Entering a new area',
        body:  'Doors and passages with a <strong>red glow</strong> are entrances to a new part of the camp. Click one to travel there. The screen will fade to black and carry you through.',
    },
    {
        visualIdx: 4,
        title: 'About this world — and how to trust it',
        body:  'The 3D environment was <strong>synthetically generated by Marble (WorldLabs)</strong> — an AI tool that builds navigable 3D spaces from images. The historical artifacts inside are real archival photographs and documents. When you open one, expand the <strong>C2PA credentials panel</strong> to see its chain of custody: a tamper-evident digital certificate tracing the file from its original archive to this exhibit, confirming it has not been altered. Use the <strong>Menu button</strong> (top-left) any time to revisit these details.',
    },
];

// ── Event wiring ─────────────────────────────────────────────

TitleScreen.prototype._wireEvents = function () {
    var self = this;

    document.getElementById('manz-play-btn').addEventListener('click', function () {
        self._dismiss();
    });

    document.getElementById('manz-wt-next').addEventListener('click', function () {
        if (self._step < WT_SLIDES.length - 1) self._goToSlide(self._step + 1);
        else self._closeWT();
    });
    document.getElementById('manz-wt-prev').addEventListener('click', function () {
        if (self._step > 0) self._goToSlide(self._step - 1);
    });
    document.getElementById('manz-wt-skip').addEventListener('click', function () {
        self._closeWT();
        self._showSkipToast();
    });
};

// ── Title dismiss → entry sequence ───────────────────────────

TitleScreen.prototype._dismiss = function () {
    var self = this;
    var title = document.getElementById('manz-ts-title');
    title.classList.add('dismissing');
    title.addEventListener('animationend', function () {
        title.style.display = 'none';
        self._enterWorld();
    }, { once: true });
};

TitleScreen.prototype._enterWorld = function () {
    var self = this;
    this._fadeIn(function () {
        document.getElementById('manz-ts-scene').classList.add('on');
        setTimeout(function () {
            self._fadeOut(function () {
                setTimeout(function () {
                    document.getElementById('manz-ts-scene').classList.remove('on');
                    setTimeout(function () { self._openWT(); }, 600);
                }, 3000);
            });
        }, 800);
    });
};

// ── Veil helpers ─────────────────────────────────────────────

TitleScreen.prototype._fadeIn = function (cb) {
    document.getElementById('manz-ts-veil').classList.add('in');
    setTimeout(cb, 950);
};

TitleScreen.prototype._fadeOut = function (cb) {
    document.getElementById('manz-ts-veil').classList.remove('in');
    setTimeout(cb, 950);
};

// ── Walkthrough ──────────────────────────────────────────────

TitleScreen.prototype._openWT = function () {
    document.getElementById('manz-wt-scrim').classList.add('on');
    this._goToSlide(0);
};

TitleScreen.prototype._closeWT = function () {
    document.getElementById('manz-wt-scrim').classList.remove('on');
    this._onDone();
};

TitleScreen.prototype._goToSlide = function (idx) {
    if (idx < 0 || idx >= WT_SLIDES.length) return;
    this._step = idx;
    var s = WT_SLIDES[idx];

    document.querySelectorAll('.mz-slide').forEach(function (el, i) {
        el.classList.toggle('active', i === s.visualIdx);
    });

    var pipsEl = document.getElementById('manz-wt-pips');
    pipsEl.innerHTML = WT_SLIDES.map(function (_, i) {
        var cls = i < idx ? 'done' : i === idx ? 'active' : '';
        return '<div class="mz-pip ' + cls + '"></div>';
    }).join('');

    var titleEl = document.getElementById('manz-wt-title');
    var bodyEl  = document.getElementById('manz-wt-body');
    titleEl.style.opacity = '0';
    bodyEl.style.opacity  = '0';
    setTimeout(function () {
        titleEl.textContent = s.title;
        bodyEl.innerHTML    = s.body;
        titleEl.style.transition = 'opacity .3s';
        bodyEl.style.transition  = 'opacity .3s';
        titleEl.style.opacity = '1';
        bodyEl.style.opacity  = '1';
    }, 160);

    document.getElementById('manz-wt-prev').style.visibility = idx === 0 ? 'hidden' : 'visible';
    var next = document.getElementById('manz-wt-next');
    var isLast = idx === WT_SLIDES.length - 1;
    next.textContent = isLast ? 'Done' : 'Next';
    next.className   = isLast ? 'finish' : '';
};

TitleScreen.prototype._showSkipToast = function () {
    var t = document.createElement('div');
    t.id = 'manz-skip-toast';
    t.innerHTML = 'Walkthrough skipped &nbsp;&middot;&nbsp; Replay from the <strong>Menu</strong>';
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; }, 3200);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3800);
};

// ── Completion ───────────────────────────────────────────────

TitleScreen.prototype._onDone = function () {
    if (this.cameraEntity && this.cameraEntity.script) {
        this.cameraEntity.script.enabled = true;
    }
    this.app.fire('titleScreen:dismissed');
    this._removeUI();
};

TitleScreen.prototype._removeUI = function () {
    if (this._root && this._root.parentNode) {
        this._root.parentNode.removeChild(this._root);
    }
    this._root = null;
    var s = document.getElementById('manz-ts-styles');
    if (s && s.parentNode) s.parentNode.removeChild(s);
};
