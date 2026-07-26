/* Signet Apparel Designer - upload art, visualize on apparel, live embroidery/print checks */
/* global fabric */
(function () {
  'use strict';

  // ---------- Catalog ----------
  var PRODUCTS = {
    tee:        { name: 'T-Shirt',      ico: '👕' },
    longsleeve: { name: 'Long Sleeve',  ico: '🥼' },
    crewneck:   { name: 'Sweatshirt',   ico: '🧥' },
    hoodie:     { name: 'Hoodie',       ico: '🧥' }
  };

  var COLORS = [
    ['White', '#ffffff'], ['Ice Grey', '#d9dad5'], ['Sport Grey', '#9ea2a2'], ['Charcoal', '#4a4a48'], ['Black', '#212121'],
    ['Navy', '#1f2a44'], ['Royal', '#1f4fa3'], ['Light Blue', '#a5c8e4'], ['Red', '#c8102e'], ['Cardinal', '#8a1538'],
    ['Maroon', '#5e2129'], ['Orange', '#e86c29'], ['Gold', '#f2a900'], ['Kelly', '#007a33'], ['Forest', '#1d4230'],
    ['Military Green', '#5e5f45'], ['Purple', '#4b3b8f'], ['Pink', '#f8a3bc'], ['Sand', '#d6ccb1'], ['Brown', '#4e3629']
  ];

  var FONTS = ['Anton', 'Archivo Black', 'Bebas Neue', 'Oswald', 'Montserrat', 'Alfa Slab One', 'Pacifico', 'Lobster', 'Permanent Marker', 'Courier Prime'];
  var TEXT_COLORS = ['#ffffff', '#111111', '#005CB9', '#40B4E5', '#c8102e', '#f2a900', '#007a33', '#e86c29', '#4b3b8f', '#9ea2a2'];

  var CLIPART = [
    { name: 'Star',   path: 'M50 5 L61 38 L96 38 L68 59 L79 92 L50 71 L21 92 L32 59 L4 38 L39 38 Z' },
    { name: 'Heart',  path: 'M50 88 C20 64 5 45 5 28 C5 12 18 4 30 4 C40 4 47 10 50 16 C53 10 60 4 70 4 C82 4 95 12 95 28 C95 45 80 64 50 88 Z' },
    { name: 'Bolt',   path: 'M56 2 L20 55 L44 55 L36 98 L80 40 L54 40 Z' },
    { name: 'Shield', path: 'M50 3 L90 16 L90 48 C90 72 74 89 50 97 C26 89 10 72 10 48 L10 16 Z' },
    { name: 'Circle', path: 'M50 4 A46 46 0 1 0 50 96 A46 46 0 1 0 50 4 Z M50 18 A32 32 0 1 1 50 82 A32 32 0 1 1 50 18 Z' },
    { name: 'Banner', path: 'M4 30 L96 30 L96 70 L50 58 L4 70 Z' }
  ];

  var SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
  var DESIGN_W = 520, DESIGN_H = 620;
  var QUOTE_EMAIL = 'david.kent@signetmktg.com';

  // Print locations. ppi = canvas px per real inch at that location.
  // Embroidery norms from Signet: left chest 3.5" wide standard, 8k-12k stitches;
  // jacket/full back 20k-35k+; 15 thread colors max.
  var LOCATIONS = {
    ff: { label: 'Full Front', side: 'front', ppi: 13.33, maxStitches: 25000, normW: 12 },
    lc: { label: 'Left Chest', side: 'front', ppi: 15,    maxStitches: 12000, normW: 3.5 },
    fb: { label: 'Full Back',  side: 'back',  ppi: 13.33, maxStitches: 35000, normW: 12 }
  };

  function r(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }
  var FRONT_AREAS = { tee: r(180, 190, 160, 230), longsleeve: r(180, 190, 160, 230), crewneck: r(180, 195, 160, 220), hoodie: r(180, 195, 160, 165) };
  var BACK_AREAS  = { tee: r(180, 175, 160, 250), longsleeve: r(180, 175, 160, 250), crewneck: r(180, 180, 160, 240), hoodie: r(180, 185, 160, 235) };
  var LC_AREAS    = { tee: r(288, 205, 60, 62),   longsleeve: r(288, 205, 60, 62),   crewneck: r(288, 210, 60, 62),   hoodie: r(292, 218, 56, 56) };

  function areaFor(loc, prod) {
    if (loc === 'lc') return LC_AREAS[prod];
    if (loc === 'fb') return BACK_AREAS[prod];
    return FRONT_AREAS[prod];
  }

  // ---------- State ----------
  var state = {
    product: 'tee',
    color: '#ffffff',
    colorName: 'White',
    fabric: 'solid',
    loc: 'ff',
    deco: 'print',
    designs: { ff: null, lc: null, fb: null },
    sizes: { S: 0, M: 0, L: 0, XL: 0, '2XL': 0, '3XL': 0 },
    name: 'Untitled design'
  };

  // ---------- Color helpers ----------
  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function shade(hex, f) {
    var c = hexToRgb(hex).map(function (v) {
      return Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f);
    });
    return 'rgb(' + c.join(',') + ')';
  }

  // ---------- Garment SVG ----------
  function neckline(side, prod) {
    if (side === 'back' || prod === 'hoodie') return 'C235 116 285 116 305 104';
    if (prod === 'crewneck') return 'C232 124 288 124 305 104';
    return 'C230 132 290 132 305 104';
  }

  function bodyPath(prod, side) {
    var neck = 'M215 104 ' + neckline(side, prod);
    if (prod === 'tee') {
      return neck +
        ' L372 128 C400 142 430 170 452 214 L392 258 L366 232 L366 540 C366 556 352 564 336 564' +
        ' L184 564 C168 564 154 556 154 540 L154 232 L128 258 L68 214 C90 170 120 142 148 128 Z';
    }
    var wide = (prod === 'hoodie' || prod === 'crewneck') ? 6 : 0;
    var L = 154 - wide, R = 366 + wide;
    return neck +
      ' L372 128 C398 140 420 158 431 186 L448 398 C449 412 442 421 430 423 L394 428 C383 429 376 422 375 411 L364 260' +
      ' L' + R + ' 540 C' + R + ' 556 ' + (R - 14) + ' 564 ' + (R - 30) + ' 564' +
      ' L' + (L + 30) + ' 564 C' + (L + 14) + ' 564 ' + L + ' 556 ' + L + ' 540 L156 260' +
      ' L145 411 C144 422 137 429 126 428 L90 423 C78 421 71 412 72 398 L89 186 C100 158 122 140 148 128 Z';
  }

  function shirtSVG(prod, side, hex) {
    var dark = shade(hex, -0.28);
    var mid = shade(hex, -0.14);
    var body = bodyPath(prod, side);
    var extras = '';

    if (prod !== 'hoodie') {
      var nk = neckline(side, prod);
      var dip = (side === 'front' && prod !== 'crewneck') ? 122 : 110;
      extras += '<path d="M215 104 ' + nk + ' L299 98 C286 ' + dip + ' 234 ' + dip + ' 221 98 Z" fill="' + mid + '" opacity="0.9"/>';
    }

    if (prod === 'hoodie') {
      if (side === 'front') {
        extras += '<path d="M196 100 C202 150 318 150 324 100 C342 122 322 172 260 172 C198 172 178 122 196 100 Z" fill="' + dark + '"/>';
        extras += '<path d="M215 104 C235 116 285 116 305 104 C296 134 224 134 215 104 Z" fill="' + shade(hex, -0.45) + '"/>';
        extras += '<line x1="243" y1="160" x2="238" y2="212" stroke="' + shade(hex, 0.55) + '" stroke-width="4" stroke-linecap="round"/>';
        extras += '<line x1="277" y1="160" x2="282" y2="212" stroke="' + shade(hex, 0.55) + '" stroke-width="4" stroke-linecap="round"/>';
        extras += '<path d="M186 428 L334 428 L350 552 L170 552 Z" fill="' + mid + '" opacity="0.55"/>';
        extras += '<path d="M186 428 L214 444 L214 540" fill="none" stroke="' + dark + '" stroke-width="2" opacity="0.5"/>';
        extras += '<path d="M334 428 L306 444 L306 540" fill="none" stroke="' + dark + '" stroke-width="2" opacity="0.5"/>';
      } else {
        extras += '<path d="M198 106 C186 52 334 52 322 106 C310 146 210 146 198 106 Z" fill="' + dark + '"/>';
      }
    }

    if (prod === 'crewneck' || prod === 'hoodie') {
      extras += '<rect x="' + (prod === 'hoodie' ? 148 : 154) + '" y="546" width="' + (prod === 'hoodie' ? 224 : 212) + '" height="18" rx="4" fill="' + mid + '" opacity="0.5"/>';
      extras += '<rect x="374" y="408" width="58" height="18" rx="4" transform="rotate(5 403 417)" fill="' + mid + '" opacity="0.5"/>';
      extras += '<rect x="88" y="408" width="58" height="18" rx="4" transform="rotate(-5 117 417)" fill="' + mid + '" opacity="0.5"/>';
    }

    if (prod === 'tee') {
      extras += '<path d="M392 258 L366 232 M128 258 L154 232" stroke="rgba(0,0,0,.16)" stroke-width="2" fill="none"/>';
      extras += '<line x1="158" y1="548" x2="362" y2="548" stroke="rgba(0,0,0,.12)" stroke-width="2"/>';
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 620">' +
      '<defs><linearGradient id="gShade" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>' +
      '<stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000000" stop-opacity="0.14"/></linearGradient></defs>' +
      '<path d="' + body + '" fill="' + hex + '" stroke="' + shade(hex, -0.4) + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      extras +
      '<path d="' + body + '" fill="url(#gShade)"/>' +
      '</svg>';
  }

  // ---------- DOM ----------
  function $(id) { return document.getElementById(id); }
  var els = {
    welcome: $('welcome'), welcomeProducts: $('welcomeProducts'), startBtn: $('startBtn'), resumeBtn: $('resumeBtn'),
    designName: $('designName'), saveBtn: $('saveBtn'), loadInput: $('loadInput'), downloadBtn: $('downloadBtn'),
    productGrid: $('productGrid'), colorGrid: $('colorGrid'), colorName: $('colorName'),
    textInput: $('textInput'), fontSelect: $('fontSelect'), textColors: $('textColors'),
    outlineColor: $('outlineColor'), outlineWidth: $('outlineWidth'), outlineVal: $('outlineVal'), addTextBtn: $('addTextBtn'),
    clipartGrid: $('clipartGrid'), shapeColors: $('shapeColors'), uploadInput: $('uploadInput'),
    stageWrap: $('stageWrap'), shirtSvg: $('shirtSvg'), printArea: $('printArea'),
    stage3d: $('stage3d'), stage3dLoading: $('stage3dLoading'),
    objToolbar: $('objToolbar'),
    pcProduct: $('pcProduct'), pcMeta: $('pcMeta'), sizeGrid: $('sizeGrid'), sumQty: $('sumQty'),
    summaryList: $('summaryList'), checkList: $('checkList'),
    quoteBtn: $('quoteBtn'), toast: $('toast')
  };

  // ---------- Fabric canvas ----------
  var canvas = new fabric.Canvas('c', {
    width: DESIGN_W, height: DESIGN_H,
    backgroundColor: null, preserveObjectStacking: true, selection: true
  });
  fabric.Object.prototype.set({
    transparentCorners: false, cornerColor: '#005CB9', cornerStrokeColor: '#ffffff',
    cornerStyle: 'circle', cornerSize: 10, borderColor: '#005CB9', padding: 4
  });
  // keep custom analysis data through JSON save/load
  fabric.Object.prototype.stateProperties && fabric.Object.prototype.stateProperties.push('sigAnalysis');
  var origToObject = fabric.Object.prototype.toObject;
  fabric.Object.prototype.toObject = function (props) {
    return origToObject.call(this, (props || []).concat(['sigAnalysis']));
  };

  var zoom = 1;
  var view = '2d';

  function currentArea() { return areaFor(state.loc, state.product); }

  function applyClip() {
    var a = currentArea();
    canvas.clipPath = new fabric.Rect({ left: a.x, top: a.y, width: a.w, height: a.h, absolutePositioned: true });
    els.printArea.style.left = (a.x * zoom) + 'px';
    els.printArea.style.top = (a.y * zoom) + 'px';
    els.printArea.style.width = (a.w * zoom) + 'px';
    els.printArea.style.height = (a.h * zoom) + 'px';
    canvas.requestRenderAll();
  }

  // Realistic garment background: straight-on render of the selected garment's
  // 3D model. The illustrated SVG only shows while a model is still downloading.
  var bgToken = 0;
  var realisticShown = {};
  function renderShirt() {
    var side = LOCATIONS[state.loc].side;
    var t = ++bgToken;
    var canRealistic = window.Shirt3D && window.Shirt3D.renderFlat;
    if (!canRealistic || !realisticShown[state.product]) {
      els.shirtSvg.innerHTML = shirtSVG(state.product, side, state.color);
    }
    if (canRealistic) {
      window.Shirt3D.renderFlat(state.product, state.color, state.fabric, side === 'back', 2).then(function (url) {
        if (t !== bgToken) return;
        realisticShown[state.product] = true;
        els.shirtSvg.innerHTML = '<img src="' + url + '" alt="">';
      }).catch(function () { /* model unavailable: SVG fallback stays */ });
    }
  }

  function boot3D() {
    if (window.Shirt3D && window.Shirt3D.preload) {
      window.Shirt3D.preload(state.product).then(function () { renderShirt(); }).catch(function () {});
    }
  }
  if (window.Shirt3D) boot3D();
  else window.addEventListener('shirt3d-api', boot3D, { once: true });

  function resize() {
    var avail = els.stage3d.parentElement.clientWidth || DESIGN_W;
    var w = Math.min(DESIGN_W, Math.max(280, avail));
    zoom = w / DESIGN_W;
    canvas.setDimensions({ width: w, height: DESIGN_H * zoom });
    canvas.setZoom(zoom);
    els.stageWrap.style.width = w + 'px';
    els.stageWrap.style.height = (DESIGN_H * zoom) + 'px';
    els.stage3d.style.width = w + 'px';
    els.stage3d.style.height = (DESIGN_H * zoom) + 'px';
    if (window.Shirt3D && window.Shirt3D.isInit()) window.Shirt3D.resizeTo(w, DESIGN_H * zoom);
    applyClip();
  }

  // ---------- 3D preview ----------
  function exportLocPNG(loc) {
    return new Promise(function (resolve) {
      var d = state.designs[loc];
      if (!d) { resolve(null); return; }
      var sc = new fabric.StaticCanvas(null, { width: DESIGN_W, height: DESIGN_H });
      sc.loadFromJSON(d, function () {
        sc.renderAll();
        var a = areaFor(loc, state.product);
        var url = sc.toDataURL({ format: 'png', left: a.x, top: a.y, width: a.w, height: a.h, multiplier: 3 });
        sc.dispose();
        resolve({ img: url, area: a, back: loc === 'fb', stitch: state.deco === 'embroidery' });
      });
    });
  }

  function update3D() {
    if (!window.Shirt3D || !window.Shirt3D.isInit()) return;
    serializeLoc();
    window.Shirt3D.setProduct(state.product).then(function () {
      window.Shirt3D.setColor(state.color);
      window.Shirt3D.setFabric(state.fabric);
      return Promise.all(Object.keys(LOCATIONS).map(exportLocPNG));
    }).then(function (items) {
      window.Shirt3D.setDecals(items.filter(Boolean));
    }).catch(function () {});
  }

  var hintEl = null;
  function setView(v) {
    if (v === view) return;
    if (v === '3d' && !window.Shirt3D) { toast('3D preview is unavailable in this browser.'); return; }
    view = v;
    if (!hintEl) hintEl = document.querySelector('.hint');
    document.querySelectorAll('.view-toggle .side-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === v);
    });
    var is3d = v === '3d';
    canvas.discardActiveObject(); canvas.requestRenderAll();
    els.objToolbar.classList.add('hidden');
    els.stageWrap.classList.toggle('hidden', is3d);
    els.stage3d.classList.toggle('hidden', !is3d);
    hintEl.textContent = is3d
      ? 'Drag to rotate, scroll to zoom.'
      : "The dashed box is the print area for this location. Anything outside it won't be decorated.";
    if (is3d) {
      var w = parseFloat(els.stage3d.style.width) || DESIGN_W;
      var h = parseFloat(els.stage3d.style.height) || DESIGN_H;
      if (!window.Shirt3D.isInit()) {
        try {
          window.Shirt3D.init(els.stage3d).then(function () {
            els.stage3dLoading.classList.add('hidden');
            update3D();
          }).catch(function () {
            els.stage3dLoading.textContent = '3D model could not load. Check your connection.';
          });
          window.Shirt3D.resizeTo(w, h);
        } catch (e) {
          els.stage3dLoading.textContent = '3D preview is not supported in this browser.';
        }
      } else {
        window.Shirt3D.setRunning(true);
        window.Shirt3D.resizeTo(w, h);
        update3D();
      }
    } else if (window.Shirt3D && window.Shirt3D.isInit()) {
      window.Shirt3D.setRunning(false);
    }
  }

  document.querySelectorAll('.view-toggle .side-btn').forEach(function (b) {
    b.addEventListener('click', function () { setView(b.dataset.view); });
  });

  // ---------- Location switching ----------
  function serializeLoc() {
    state.designs[state.loc] = canvas.getObjects().length ? canvas.toJSON(['sigAnalysis']) : null;
  }

  function loadLoc(loc, done) {
    state.loc = loc;
    var data = state.designs[loc];
    canvas.off('object:added', onCanvasChange);
    canvas.clear();
    var finish = function () {
      canvas.on('object:added', onCanvasChange);
      renderShirt(); applyClip(); refreshPanels();
      if (done) done();
    };
    if (data) canvas.loadFromJSON(data, function () { canvas.renderAll(); finish(); });
    else finish();
  }

  function switchLoc(loc) {
    if (view === '3d') setView('2d');
    if (loc === state.loc) return;
    serializeLoc();
    document.querySelectorAll('#locToggle .side-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.loc === loc);
    });
    loadLoc(loc, autosave);
  }

  function locHasArt(loc) {
    if (loc === state.loc) return canvas.getObjects().length > 0;
    var d = state.designs[loc];
    return !!(d && d.objects && d.objects.length);
  }

  function updateDots() {
    Object.keys(LOCATIONS).forEach(function (k) {
      var dot = $('dot-' + k);
      if (dot) dot.classList.toggle('hidden', !locHasArt(k));
    });
  }

  // ---------- Artwork analysis (runs in-browser on the uploaded image) ----------
  function analyzeImageData(imgEl) {
    var s = 160 / Math.max(imgEl.width, imgEl.height);
    var w = Math.max(1, Math.round(imgEl.width * s)), h = Math.max(1, Math.round(imgEl.height * s));
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imgEl, 0, 0, w, h);
    var d;
    try { d = ctx.getImageData(0, 0, w, h).data; } catch (e) { return null; }
    var bins = {}, opaque = 0, semi = 0, total = w * h;
    for (var i = 0; i < d.length; i += 4) {
      var a = d[i + 3];
      if (a < 16) continue;
      if (a < 240) semi++;
      opaque++;
      var key = (d[i] >> 4) + '-' + (d[i + 1] >> 4) + '-' + (d[i + 2] >> 4);
      bins[key] = (bins[key] || 0) + 1;
    }
    if (!opaque) return null;
    var significant = 0, totalBins = 0;
    Object.keys(bins).forEach(function (k) {
      totalBins++;
      if (bins[k] / opaque > 0.005) significant++;
    });
    return {
      colors: significant,
      rawBins: totalBins,
      hasTransparency: (total - opaque) / total > 0.02,
      hasSemiTransparency: semi / opaque > 0.05,
      likelyGradient: totalBins > 400
    };
  }

  // ---------- Design summary + embroidery/print check ----------
  function collectDesignFacts() {
    var loc = LOCATIONS[state.loc];
    var objs = canvas.getObjects();
    var facts = {
      objects: objs.length, widthIn: 0, heightIn: 0,
      colors: 0, hasGradient: false, hasSemiTransparency: false,
      minTextIn: null, sqIn: 0
    };
    if (!objs.length) return facts;

    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    var vectorFills = {};
    objs.forEach(function (o) {
      var b = o.getBoundingRect(true, true);
      minX = Math.min(minX, b.left); minY = Math.min(minY, b.top);
      maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height);
      if (o.type === 'image' && o.sigAnalysis) {
        facts.colors += o.sigAnalysis.colors;
        if (o.sigAnalysis.likelyGradient) facts.hasGradient = true;
        if (o.sigAnalysis.hasSemiTransparency) facts.hasSemiTransparency = true;
      } else {
        if (o.fill) vectorFills[o.fill] = 1;
        if (o.stroke && o.strokeWidth) vectorFills[o.stroke] = 1;
      }
      if (o.type === 'i-text') {
        var hIn = o.getScaledHeight() / loc.ppi / (o.text.split('\n').length || 1);
        facts.minTextIn = facts.minTextIn === null ? hIn : Math.min(facts.minTextIn, hIn);
      }
    });
    facts.colors += Object.keys(vectorFills).length;
    facts.widthIn = (maxX - minX) / loc.ppi;
    facts.heightIn = (maxY - minY) / loc.ppi;
    // decorated square inches (sum of object footprints, capped at bounding box)
    var sq = 0;
    objs.forEach(function (o) {
      var b = o.getBoundingRect(true, true);
      sq += (b.width / loc.ppi) * (b.height / loc.ppi);
    });
    facts.sqIn = Math.min(sq, facts.widthIn * facts.heightIn);
    return facts;
  }

  function refreshPanels() {
    updateDots();
    var loc = LOCATIONS[state.loc];
    var facts = collectDesignFacts();
    var locsUsed = Object.keys(LOCATIONS).filter(locHasArt).map(function (k) { return LOCATIONS[k].label; });

    els.pcProduct.textContent = PRODUCTS[state.product].name;
    els.pcMeta.textContent = state.colorName + ' · ' + loc.label;

    // summary
    var rows = [
      ['Garment', PRODUCTS[state.product].name],
      ['Color', state.colorName + (state.fabric === 'heather' ? ' Heather' : '')],
      ['Decoration', state.deco === 'embroidery' ? 'Embroidery' : 'Screen Print'],
      ['Location' + (locsUsed.length > 1 ? 's' : ''), locsUsed.length ? locsUsed.join(', ') : loc.label]
    ];
    if (facts.objects) {
      rows.push(['Design size', facts.widthIn.toFixed(1) + '" × ' + facts.heightIn.toFixed(1) + '"']);
      rows.push(['Colors detected', String(Math.max(1, facts.colors))]);
      if (state.deco === 'embroidery') {
        var stitches = Math.round(facts.sqIn * 2000);
        rows.push(['Est. stitches', '~' + stitches.toLocaleString()]);
      }
    }
    els.summaryList.innerHTML = rows.map(function (rw) {
      return '<li><span>' + rw[0] + '</span><span>' + rw[1] + '</span></li>';
    }).join('');

    // checks
    var checks = [];
    if (!facts.objects) {
      checks.push(['ok', 'Nothing to check yet. Upload a logo or add text.']);
    } else {
      if (state.deco === 'embroidery') {
        if (facts.colors > 15) checks.push(['bad', 'More than 15 colors detected. Embroidery tops out at 15 thread colors.']);
        if (facts.hasGradient) checks.push(['bad', 'Gradients or fades detected. Embroidery needs solid colors; we can simplify the art for you.']);
        if (facts.hasSemiTransparency) checks.push(['warn', 'Semi-transparent areas detected. Transparency and shadows do not embroider.']);
        if (state.loc === 'lc' && facts.widthIn > 3.5) checks.push(['warn', 'Wider than the standard 3.5" left chest size.']);
        if (facts.minTextIn !== null && facts.minTextIn < 0.2) checks.push(['warn', 'Text may be too small to embroider. Keep letters at least 0.20"-0.25" tall.']);
        var est = Math.round(facts.sqIn * 2000);
        if (est > loc.maxStitches) checks.push(['warn', 'Estimated ~' + est.toLocaleString() + ' stitches, above the typical max for ' + loc.label + ' (' + loc.maxStitches.toLocaleString() + '). Expect higher cost or a size reduction.']);
        if (!checks.length) checks.push(['ok', 'Looks good for embroidery. Final check happens when we digitize your file.']);
      } else {
        if (facts.colors > 8) checks.push(['warn', String(facts.colors) + ' colors detected. More ink colors raises screen print cost; full-color DTF is an option.']);
        if (facts.hasSemiTransparency) checks.push(['warn', 'Semi-transparent areas may print differently than they look on screen.']);
        if (facts.widthIn > loc.normW) checks.push(['warn', 'Design is wider than the usual ' + loc.normW + '" max for ' + loc.label + '.']);
        if (!checks.length) checks.push(['ok', 'Looks good to print. We confirm sizing on your proof.']);
      }
    }
    els.checkList.innerHTML = checks.map(function (c) {
      return '<li class="' + c[0] + '">' + c[1] + '</li>';
    }).join('');

    // quantity
    var qty = 0;
    Object.keys(state.sizes).forEach(function (k) { qty += state.sizes[k]; });
    els.sumQty.textContent = qty;
  }

  // ---------- Autosave ----------
  var saveTimer = null;
  function autosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      serializeLoc();
      try { localStorage.setItem('signet-apparel-designer', JSON.stringify(snapshot())); }
      catch (e) { /* storage full on image-heavy designs; ignore */ }
    }, 800);
  }

  function snapshot() {
    serializeLoc();
    return { v: 2, name: state.name, product: state.product, color: state.color, colorName: state.colorName, fabric: state.fabric, deco: state.deco, sizes: state.sizes, designs: state.designs };
  }

  function restore(snap) {
    state.name = snap.name || 'Untitled design';
    state.product = PRODUCTS[snap.product] ? snap.product : 'tee';
    state.color = snap.color || '#ffffff';
    state.colorName = snap.colorName || 'White';
    state.deco = snap.deco === 'embroidery' ? 'embroidery' : 'print';
    state.fabric = snap.fabric === 'heather' ? 'heather' : 'solid';
    state.sizes = snap.sizes || state.sizes;
    state.designs = snap.designs || { ff: null, lc: null, fb: null };
    els.designName.value = state.name;
    markSelected(els.productGrid, '[data-product="' + state.product + '"]');
    markSelected(els.colorGrid, '[data-hex="' + state.color + '"]');
    els.colorName.textContent = state.colorName;
    document.querySelectorAll('#decoToggle .deco-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.deco === state.deco);
    });
    document.querySelectorAll('#fabricToggle .deco-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.fabric === state.fabric);
    });
    Object.keys(state.sizes).forEach(function (k) {
      var input = document.querySelector('.size-cell input[data-size="' + k + '"]');
      if (input) input.value = state.sizes[k] || '';
    });
    document.querySelectorAll('#locToggle .side-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.loc === 'ff');
    });
    loadLoc('ff');
  }

  function onCanvasChange() { refreshPanels(); autosave(); }

  // ---------- Selection / toolbar ----------
  function activeObj() { return canvas.getActiveObject(); }

  function syncTextPanel(obj) {
    if (!obj || obj.type !== 'i-text') return;
    els.textInput.value = obj.text;
    els.fontSelect.value = obj.fontFamily;
    els.outlineWidth.value = obj.strokeWidth || 0;
    els.outlineVal.textContent = obj.strokeWidth || 0;
    if (obj.stroke) els.outlineColor.value = obj.stroke;
  }

  canvas.on('selection:created', function (e) { els.objToolbar.classList.remove('hidden'); syncTextPanel(e.selected && e.selected[0]); });
  canvas.on('selection:updated', function (e) { syncTextPanel(e.selected && e.selected[0]); });
  canvas.on('selection:cleared', function () { els.objToolbar.classList.add('hidden'); });
  canvas.on('object:modified', onCanvasChange);
  canvas.on('object:added', onCanvasChange);
  canvas.on('object:removed', onCanvasChange);

  els.objToolbar.addEventListener('click', function (e) {
    var act = e.target.dataset.act;
    var obj = activeObj();
    if (!act || !obj) return;
    if (act === 'del') { canvas.remove(obj); canvas.discardActiveObject(); }
    if (act === 'dup') {
      obj.clone(function (c) {
        c.sigAnalysis = obj.sigAnalysis;
        c.set({ left: obj.left + 18, top: obj.top + 18 });
        canvas.add(c); canvas.setActiveObject(c);
      }, ['sigAnalysis']);
    }
    if (act === 'flip') { obj.set('flipX', !obj.flipX); }
    if (act === 'front') { canvas.bringForward(obj); }
    if (act === 'back') { canvas.sendBackwards(obj); }
    if (act === 'center') { var a = currentArea(); obj.setPositionByOrigin(new fabric.Point(a.x + a.w / 2, obj.getCenterPoint().y), 'center', 'center'); }
    obj.setCoords(); canvas.requestRenderAll(); onCanvasChange();
  });

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && activeObj() && !activeObj().isEditing &&
        !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      canvas.remove(activeObj()); canvas.discardActiveObject(); canvas.requestRenderAll();
    }
  });

  // ---------- Text ----------
  FONTS.forEach(function (f) {
    var o = document.createElement('option');
    o.value = f; o.textContent = f; o.style.fontFamily = f;
    els.fontSelect.appendChild(o);
  });

  var currentTextColor = '#111111';

  function addText() {
    var val = els.textInput.value.trim() || 'YOUR TEXT';
    var font = els.fontSelect.value;
    var a = currentArea();
    document.fonts.load('40px "' + font + '"').then(function () {
      var t = new fabric.IText(val, {
        fontFamily: font, fontSize: 42, fill: currentTextColor,
        stroke: parseFloat(els.outlineWidth.value) > 0 ? els.outlineColor.value : null,
        strokeWidth: parseFloat(els.outlineWidth.value) || 0,
        paintFirst: 'stroke', textAlign: 'center',
        originX: 'center', originY: 'center',
        left: a.x + a.w / 2, top: a.y + a.h / 2
      });
      var maxW = a.w * 0.95;
      if (t.width > maxW) t.scaleToWidth(maxW);
      canvas.add(t); canvas.setActiveObject(t); canvas.requestRenderAll();
    });
  }
  els.addTextBtn.addEventListener('click', addText);

  els.textInput.addEventListener('input', function () {
    var obj = activeObj();
    if (obj && obj.type === 'i-text') { obj.set('text', els.textInput.value); canvas.requestRenderAll(); autosave(); }
  });
  els.fontSelect.addEventListener('change', function () {
    var font = els.fontSelect.value;
    document.fonts.load('40px "' + font + '"').then(function () {
      var obj = activeObj();
      if (obj && obj.type === 'i-text') { obj.set('fontFamily', font); obj.initDimensions(); canvas.requestRenderAll(); autosave(); }
    });
  });
  function applyOutline() {
    var obj = activeObj();
    var w = parseFloat(els.outlineWidth.value) || 0;
    els.outlineVal.textContent = w;
    if (obj && obj.type === 'i-text') {
      obj.set({ stroke: w > 0 ? els.outlineColor.value : null, strokeWidth: w, paintFirst: 'stroke' });
      canvas.requestRenderAll(); autosave();
    }
  }
  els.outlineWidth.addEventListener('input', applyOutline);
  els.outlineColor.addEventListener('input', applyOutline);

  function buildSwatchRow(container, onPick) {
    TEXT_COLORS.forEach(function (hex, i) {
      var s = document.createElement('button');
      s.className = 'swatch' + (i === 1 ? ' selected' : '');
      s.style.background = hex;
      s.dataset.hex = hex;
      s.addEventListener('click', function () {
        container.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('selected'); });
        s.classList.add('selected');
        onPick(hex);
      });
      container.appendChild(s);
    });
  }
  buildSwatchRow(els.textColors, function (hex) {
    currentTextColor = hex;
    var obj = activeObj();
    if (obj && obj.type === 'i-text') { obj.set('fill', hex); canvas.requestRenderAll(); onCanvasChange(); }
  });
  buildSwatchRow(els.shapeColors, function (hex) {
    var obj = activeObj();
    if (obj && obj.type === 'path') { obj.set('fill', hex); canvas.requestRenderAll(); onCanvasChange(); }
  });

  // ---------- Clipart ----------
  CLIPART.forEach(function (c) {
    var b = document.createElement('button');
    b.title = c.name;
    b.innerHTML = '<svg viewBox="0 0 100 100"><path d="' + c.path + '" fill="#334155" fill-rule="evenodd"/></svg>';
    b.addEventListener('click', function () {
      var a = currentArea();
      var p = new fabric.Path(c.path, {
        fill: '#111111', fillRule: 'evenodd',
        originX: 'center', originY: 'center',
        left: a.x + a.w / 2, top: a.y + a.h / 2
      });
      p.scaleToWidth(a.w * 0.5);
      canvas.add(p); canvas.setActiveObject(p); canvas.requestRenderAll();
    });
    els.clipartGrid.appendChild(b);
  });

  // ---------- Upload ----------
  function placeImage(dataUrl) {
    fabric.Image.fromURL(dataUrl, function (img) {
      var a = currentArea();
      var scale = Math.min((a.w * 0.9) / img.width, (a.h * 0.9) / img.height, 1);
      img.set({ originX: 'center', originY: 'center', left: a.x + a.w / 2, top: a.y + a.h / 2, scaleX: scale, scaleY: scale });
      img.sigAnalysis = analyzeImageData(img.getElement());
      canvas.add(img); canvas.setActiveObject(img); canvas.requestRenderAll();
      toast('Artwork added. Drag and resize it inside the dashed print area.');
    }, { crossOrigin: 'anonymous' });
  }
  function readFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('Please choose an image file.'); return; }
    var rd = new FileReader();
    rd.onload = function () { placeImage(rd.result); };
    rd.readAsDataURL(file);
  }
  els.uploadInput.addEventListener('change', function () { readFile(els.uploadInput.files[0]); els.uploadInput.value = ''; });
  var dz = document.querySelector('.dropzone');
  ['dragover', 'dragenter'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); }); });
  dz.addEventListener('drop', function (e) { readFile(e.dataTransfer.files[0]); });

  // ---------- Products & colors UI ----------
  function markSelected(container, selector) {
    container.querySelectorAll('.selected').forEach(function (x) { x.classList.remove('selected'); });
    var el = container.querySelector(selector);
    if (el) el.classList.add('selected');
  }

  Object.keys(PRODUCTS).forEach(function (key, i) {
    var p = PRODUCTS[key];
    var b = document.createElement('button');
    b.className = 'product-card' + (i === 0 ? ' selected' : '');
    b.dataset.product = key;
    b.innerHTML = '<span class="p-ico">' + p.ico + '</span><span><span class="p-name">' + p.name + '</span><br><span class="p-price">Screen print or embroidery</span></span>';
    b.addEventListener('click', function () { setProduct(key); });
    els.productGrid.appendChild(b);

    var w = document.createElement('button');
    w.className = 'wp' + (i === 0 ? ' selected' : '');
    w.dataset.product = key;
    w.innerHTML = '<span class="wp-ico">' + p.ico + '</span>' + p.name;
    w.addEventListener('click', function () {
      els.welcomeProducts.querySelectorAll('.wp').forEach(function (x) { x.classList.remove('selected'); });
      w.classList.add('selected');
      setProduct(key);
    });
    els.welcomeProducts.appendChild(w);
  });

  function setProduct(key) {
    state.product = key;
    markSelected(els.productGrid, '[data-product="' + key + '"]');
    renderShirt(); applyClip(); refreshPanels(); autosave();
    if (view === '3d') update3D();
  }

  COLORS.forEach(function (c, i) {
    var s = document.createElement('button');
    s.className = 'swatch' + (i === 0 ? ' selected' : '');
    s.style.background = c[1];
    s.dataset.hex = c[1];
    s.title = c[0];
    s.addEventListener('click', function () {
      state.color = c[1]; state.colorName = c[0];
      els.colorName.textContent = c[0];
      markSelected(els.colorGrid, '[data-hex="' + c[1] + '"]');
      renderShirt(); refreshPanels(); autosave();
      if (window.Shirt3D && window.Shirt3D.isInit()) window.Shirt3D.setColor(c[1]);
    });
    els.colorGrid.appendChild(s);
  });

  // ---------- Decoration toggle ----------
  document.querySelectorAll('#decoToggle .deco-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      state.deco = b.dataset.deco;
      document.querySelectorAll('#decoToggle .deco-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
      refreshPanels(); autosave();
      if (view === '3d') update3D();
    });
  });

  // ---------- Fabric toggle (solid color vs heather texture) ----------
  document.querySelectorAll('#fabricToggle .deco-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      state.fabric = b.dataset.fabric === 'heather' ? 'heather' : 'solid';
      document.querySelectorAll('#fabricToggle .deco-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
      if (window.Shirt3D && window.Shirt3D.isInit()) window.Shirt3D.setFabric(state.fabric);
      renderShirt(); refreshPanels(); autosave();
    });
  });

  // ---------- Sizes ----------
  SIZES.forEach(function (sz) {
    var cell = document.createElement('div');
    cell.className = 'size-cell';
    cell.innerHTML = '<label>' + sz + '</label><input type="number" min="0" max="9999" inputmode="numeric" data-size="' + sz + '" placeholder="0">';
    var input = cell.querySelector('input');
    input.addEventListener('input', function () {
      state.sizes[sz] = Math.max(0, parseInt(input.value, 10) || 0);
      refreshPanels(); autosave();
    });
    els.sizeGrid.appendChild(cell);
  });

  // ---------- Tabs ----------
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      document.querySelectorAll('.panel-section').forEach(function (p) {
        p.classList.toggle('hidden', p.dataset.panel !== t.dataset.tab);
      });
    });
  });

  document.querySelectorAll('#locToggle .side-btn').forEach(function (b) {
    b.addEventListener('click', function () { switchLoc(b.dataset.loc); });
  });

  // ---------- Save / load / export ----------
  els.designName.addEventListener('input', function () { state.name = els.designName.value || 'Untitled design'; autosave(); });

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  els.saveBtn.addEventListener('click', function () {
    downloadBlob(new Blob([JSON.stringify(snapshot())], { type: 'application/json' }), slug(state.name) + '.json');
    toast('Design saved. Use Load to bring it back anytime.');
  });

  els.loadInput.addEventListener('change', function () {
    var f = els.loadInput.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try { restore(JSON.parse(rd.result)); toast('Design loaded.'); }
      catch (e) { toast('That file could not be read.'); }
    };
    rd.readAsText(f);
    els.loadInput.value = '';
  });

  function slug(s) { return (s || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design'; }

  // PNG mockup with the Signet caption bar burned in
  function drawCaption(ctx, W, y0, barH) {
    var facts = collectDesignFacts();
    var loc = LOCATIONS[state.loc];
    ctx.fillStyle = '#005CB9';
    ctx.fillRect(0, y0, W, barH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 30px "Open Sans", sans-serif';
    ctx.fillText('SIGNET', 28, y0 + 40);
    ctx.font = '600 22px "Open Sans", sans-serif';
    var parts = [PRODUCTS[state.product].name, state.colorName + (state.fabric === 'heather' ? ' Heather' : ''), loc.label];
    if (facts.objects) {
      parts.push(facts.widthIn.toFixed(1) + '" x ' + facts.heightIn.toFixed(1) + '"');
      parts.push(Math.max(1, facts.colors) + ' color' + (facts.colors > 1 ? 's' : ''));
    }
    ctx.fillText(parts.join('  ·  '), 28, y0 + 74);
    ctx.font = '700 22px "Open Sans", sans-serif';
    ctx.fillStyle = '#40B4E5';
    var site = 'signetmktg.com';
    ctx.fillText(site, W - ctx.measureText(site).width - 28, y0 + 40);
  }

  els.downloadBtn.addEventListener('click', function () {
    canvas.discardActiveObject(); canvas.requestRenderAll();
    var scale = 2, barH = 96;

    if (view === '3d' && window.Shirt3D && window.Shirt3D.isInit()) {
      var shot = window.Shirt3D.snapshot();
      if (shot) {
        var sImg = new Image();
        sImg.onload = function () {
          var W = 1040, H = Math.round(W * sImg.height / sImg.width);
          var out3 = document.createElement('canvas');
          out3.width = W; out3.height = H + barH;
          var c3 = out3.getContext('2d');
          c3.fillStyle = '#eef2f6';
          c3.fillRect(0, 0, W, H + barH);
          c3.drawImage(sImg, 0, 0, W, H);
          drawCaption(c3, W, H, barH);
          out3.toBlob(function (blob) {
            downloadBlob(blob, slug(state.name) + '-3d.png');
            toast('3D mockup downloaded.');
          });
        };
        sImg.src = shot;
        return;
      }
    }
    var out = document.createElement('canvas');
    out.width = DESIGN_W * scale;
    out.height = DESIGN_H * scale + barH;
    var ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);

    var isBack = LOCATIONS[state.loc].side === 'back';
    var bgPromise = (window.Shirt3D && window.Shirt3D.renderFlat)
      ? window.Shirt3D.renderFlat(state.product, state.color, state.fabric, isBack, scale).catch(function () { return null; })
      : Promise.resolve(null);
    bgPromise.then(function (bgUrl) {
    var svgStr = shirtSVG(state.product, LOCATIONS[state.loc].side, state.color);
    var img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0, out.width, DESIGN_H * scale);
      var designUrl = canvas.toDataURL({ format: 'png', multiplier: scale / zoom });
      var dImg = new Image();
      dImg.onload = function () {
        ctx.drawImage(dImg, 0, 0, out.width, DESIGN_H * scale);
        drawCaption(ctx, out.width, DESIGN_H * scale, barH);
        out.toBlob(function (blob) {
          downloadBlob(blob, slug(state.name) + '-' + state.loc + '.png');
          toast('Mockup downloaded with your design specs on it.');
        });
      };
      dImg.src = designUrl;
    };
    img.src = bgUrl || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr));
    });
  });

  els.quoteBtn.addEventListener('click', function () {
    var qty = 0;
    Object.keys(state.sizes).forEach(function (k) { qty += state.sizes[k]; });
    var facts = collectDesignFacts();
    var locsUsed = Object.keys(LOCATIONS).filter(locHasArt).map(function (k) { return LOCATIONS[k].label; });
    var lines = [
      'Hi Signet, I designed this in your apparel designer and would like a quote.',
      '',
      'Design: ' + state.name,
      'Garment: ' + PRODUCTS[state.product].name + ' - ' + state.colorName + (state.fabric === 'heather' ? ' (Heather)' : ''),
      'Decoration: ' + (state.deco === 'embroidery' ? 'Embroidery' : 'Screen Print'),
      'Location(s): ' + (locsUsed.length ? locsUsed.join(', ') : 'None yet'),
      'Design size: ' + (facts.objects ? facts.widthIn.toFixed(1) + '" x ' + facts.heightIn.toFixed(1) + '"' : 'n/a'),
      'Colors: ' + (facts.objects ? Math.max(1, facts.colors) : 'n/a'),
      'Quantity: ' + qty + (qty ? ' (' + SIZES.filter(function (k) { return state.sizes[k]; }).map(function (k) { return k + ':' + state.sizes[k]; }).join(', ') + ')' : ''),
      '',
      'I am attaching the mockup PNG I downloaded from the designer.'
    ];
    window.location.href = 'mailto:' + QUOTE_EMAIL +
      '?subject=' + encodeURIComponent('Apparel quote request: ' + state.name) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  });

  // ---------- Toast ----------
  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.add('hidden'); }, 3200);
  }

  // ---------- Welcome ----------
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('signet-apparel-designer')); } catch (e) { /* ignore */ }
  if (saved && saved.v === 2) els.resumeBtn.classList.remove('hidden');

  els.startBtn.addEventListener('click', function () { els.welcome.remove(); });
  els.resumeBtn.addEventListener('click', function () {
    restore(saved);
    els.welcome.remove();
    toast('Welcome back. Your last design was restored.');
  });

  // ---------- Init ----------
  renderShirt();
  resize();
  refreshPanels();
  window.addEventListener('resize', resize);
  FONTS.forEach(function (f) { document.fonts.load('40px "' + f + '"'); });
})();
