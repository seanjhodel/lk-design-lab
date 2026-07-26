/* Signet Apparel Designer - compact embed: upload or text, see it in 3D, pick print or embroidery */
/* global fabric */
(function () {
  'use strict';

  // ---------- Catalog ----------
  var PRODUCTS = {
    tee:        { name: 'T-Shirt',     ico: '👕', lbl: 'TEE' },
    longsleeve: { name: 'Long Sleeve', ico: '🥼', lbl: 'LONG' },
    crewneck:   { name: 'Sweatshirt',  ico: '🧥', lbl: 'CREW' },
    hoodie:     { name: 'Hoodie',      ico: '🧥', lbl: 'HOOD' }
  };

  var COLORS = [
    ['White', '#ffffff'], ['Ice Grey', '#d9dad5'], ['Sport Grey', '#9ea2a2'], ['Charcoal', '#4a4a48'], ['Black', '#212121'],
    ['Navy', '#1f2a44'], ['Royal', '#1f4fa3'], ['Light Blue', '#a5c8e4'], ['Red', '#c8102e'], ['Cardinal', '#8a1538'],
    ['Maroon', '#5e2129'], ['Orange', '#e86c29'], ['Gold', '#f2a900'], ['Kelly', '#007a33'], ['Forest', '#1d4230'],
    ['Military Green', '#5e5f45'], ['Purple', '#4b3b8f'], ['Pink', '#f8a3bc'], ['Sand', '#d6ccb1'], ['Brown', '#4e3629']
  ];

  var FONTS = ['Anton', 'Archivo Black', 'Bebas Neue', 'Oswald', 'Montserrat', 'Alfa Slab One', 'Pacifico', 'Lobster', 'Permanent Marker', 'Courier Prime'];
  var TEXT_COLORS = ['#ffffff', '#111111', '#005CB9', '#40B4E5', '#c8102e', '#f2a900', '#007a33', '#4b3b8f'];

  var DESIGN_W = 520, DESIGN_H = 620;
  var QUOTE_EMAIL = 'david.kent@signetmktg.com';

  var LOCATIONS = {
    ff: { label: 'Full Front', side: 'front', ppi: 13.33 },
    lc: { label: 'Left Chest', side: 'front', ppi: 15 },
    fb: { label: 'Full Back',  side: 'back',  ppi: 13.33 }
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

  // ---------- State (in-memory only, nothing is saved) ----------
  var state = {
    product: 'tee',
    color: '#ffffff',
    colorName: 'White',
    fabric: 'solid',
    loc: 'ff',
    deco: 'print',
    designs: { ff: null, lc: null, fb: null }
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

  // ---------- Garment SVG (loading fallback only) ----------
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
    var body = bodyPath(prod, side);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 620">' +
      '<path d="' + body + '" fill="' + hex + '" stroke="' + shade(hex, -0.4) + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '</svg>';
  }

  // ---------- DOM ----------
  function $(id) { return document.getElementById(id); }
  var els = {
    uploadBtn: $('uploadBtn'), textBtn: $('textBtn'), uploadInput: $('uploadInput'),
    textRow: $('textRow'), textInput: $('textInput'), fontSelect: $('fontSelect'),
    textColors: $('textColors'), addTextBtn: $('addTextBtn'),
    stageArea: $('stageArea'), stageWrap: $('stageWrap'), shirtSvg: $('shirtSvg'), printArea: $('printArea'),
    stage3d: $('stage3d'), stage3dLoading: $('stage3dLoading'),
    objToolbar: $('objToolbar'),
    productGrid: $('productGrid'), colorGrid: $('colorGrid'), heatherBtn: $('heatherBtn'),
    downloadBtn: $('downloadBtn'), quoteBtn: $('quoteBtn'), toast: $('toast')
  };

  // ---------- Fabric canvas ----------
  var canvas = new fabric.Canvas('c', {
    width: DESIGN_W, height: DESIGN_H,
    backgroundColor: null, preserveObjectStacking: true, selection: true
  });
  fabric.Object.prototype.set({
    transparentCorners: false, cornerColor: '#005CB9', cornerStrokeColor: '#ffffff',
    cornerStyle: 'circle', cornerSize: 12, borderColor: '#005CB9', padding: 4
  });
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

  // Realistic garment background from the 3D model; SVG only while a model loads
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
      }).catch(function () { /* fallback SVG stays */ });
    }
  }

  function boot3D() {
    if (window.Shirt3D && window.Shirt3D.preload) {
      window.Shirt3D.preload(state.product).then(function () { renderShirt(); }).catch(function () {});
    }
  }
  if (window.Shirt3D) boot3D();
  else window.addEventListener('shirt3d-api', boot3D, { once: true });

  // Size the stage to fit BOTH the width and height available (square embeds)
  function resize() {
    var availW = els.stageArea.clientWidth || DESIGN_W;
    var availH = els.stageArea.clientHeight || DESIGN_H;
    var w = Math.min(DESIGN_W, availW, Math.floor(availH * DESIGN_W / DESIGN_H));
    w = Math.max(200, w);
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

  function setView(v) {
    if (v === view) return;
    if (v === '3d' && !window.Shirt3D) { toast('3D is unavailable in this browser.'); return; }
    view = v;
    document.querySelectorAll('.view-toggle .pill').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === v);
    });
    var is3d = v === '3d';
    canvas.discardActiveObject(); canvas.requestRenderAll();
    els.objToolbar.classList.add('hidden');
    els.stageWrap.classList.toggle('hidden', is3d);
    els.stage3d.classList.toggle('hidden', !is3d);
    if (is3d) {
      var w = parseFloat(els.stage3d.style.width) || DESIGN_W;
      var h = parseFloat(els.stage3d.style.height) || DESIGN_H;
      if (!window.Shirt3D.isInit()) {
        try {
          window.Shirt3D.init(els.stage3d).then(function () {
            els.stage3dLoading.classList.add('hidden');
            update3D();
          }).catch(function () {
            els.stage3dLoading.textContent = '3D could not load.';
          });
          window.Shirt3D.resizeTo(w, h);
        } catch (e) {
          els.stage3dLoading.textContent = '3D is not supported here.';
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

  document.querySelectorAll('.view-toggle .pill').forEach(function (b) {
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
      renderShirt(); applyClip(); updateDots();
      if (done) done();
    };
    if (data) canvas.loadFromJSON(data, function () { canvas.renderAll(); finish(); });
    else finish();
  }

  function switchLoc(loc) {
    if (view === '3d') setView('2d');
    if (loc === state.loc) return;
    serializeLoc();
    document.querySelectorAll('#locToggle .pill').forEach(function (b) {
      b.classList.toggle('active', b.dataset.loc === loc);
    });
    loadLoc(loc);
  }

  document.querySelectorAll('#locToggle .pill').forEach(function (b) {
    b.addEventListener('click', function () { switchLoc(b.dataset.loc); });
  });

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

  function onCanvasChange() { updateDots(); }

  // ---------- Artwork analysis (for the quote email color count) ----------
  function analyzeImageData(imgEl) {
    var s = 160 / Math.max(imgEl.width, imgEl.height);
    var w = Math.max(1, Math.round(imgEl.width * s)), h = Math.max(1, Math.round(imgEl.height * s));
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imgEl, 0, 0, w, h);
    var d;
    try { d = ctx.getImageData(0, 0, w, h).data; } catch (e) { return null; }
    var bins = {}, opaque = 0;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 16) continue;
      opaque++;
      var key = (d[i] >> 4) + '-' + (d[i + 1] >> 4) + '-' + (d[i + 2] >> 4);
      bins[key] = (bins[key] || 0) + 1;
    }
    if (!opaque) return null;
    var significant = 0;
    Object.keys(bins).forEach(function (k) {
      if (bins[k] / opaque > 0.005) significant++;
    });
    return { colors: significant };
  }

  function collectDesignFacts() {
    var loc = LOCATIONS[state.loc];
    var objs = canvas.getObjects();
    var facts = { objects: objs.length, widthIn: 0, heightIn: 0, colors: 0 };
    if (!objs.length) return facts;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    var vectorFills = {};
    objs.forEach(function (o) {
      var b = o.getBoundingRect(true, true);
      minX = Math.min(minX, b.left); minY = Math.min(minY, b.top);
      maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height);
      if (o.type === 'image' && o.sigAnalysis) facts.colors += o.sigAnalysis.colors;
      else if (o.fill) vectorFills[o.fill] = 1;
    });
    facts.colors += Object.keys(vectorFills).length;
    facts.widthIn = (maxX - minX) / loc.ppi;
    facts.heightIn = (maxY - minY) / loc.ppi;
    return facts;
  }

  // ---------- Selection toolbar ----------
  function activeObj() { return canvas.getActiveObject(); }

  canvas.on('selection:created', function () { els.objToolbar.classList.remove('hidden'); });
  canvas.on('selection:cleared', function () { els.objToolbar.classList.add('hidden'); });
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
    if (act === 'center') { var a = currentArea(); obj.setPositionByOrigin(new fabric.Point(a.x + a.w / 2, obj.getCenterPoint().y), 'center', 'center'); }
    obj.setCoords(); canvas.requestRenderAll(); onCanvasChange();
  });

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && activeObj() && !activeObj().isEditing &&
        !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      canvas.remove(activeObj()); canvas.discardActiveObject(); canvas.requestRenderAll();
    }
  });

  // ---------- Upload (big button, straight to file picker) ----------
  els.uploadBtn.addEventListener('click', function () {
    if (view === '3d') setView('2d');
    els.textRow.classList.add('hidden');
    resize();
    els.uploadInput.click();
  });

  function placeImage(dataUrl) {
    fabric.Image.fromURL(dataUrl, function (img) {
      var a = currentArea();
      var scale = Math.min((a.w * 0.9) / img.width, (a.h * 0.9) / img.height, 1);
      img.set({ originX: 'center', originY: 'center', left: a.x + a.w / 2, top: a.y + a.h / 2, scaleX: scale, scaleY: scale });
      img.sigAnalysis = analyzeImageData(img.getElement());
      canvas.add(img); canvas.setActiveObject(img); canvas.requestRenderAll();
      toast('Drag and resize your logo inside the dashed area.');
    }, { crossOrigin: 'anonymous' });
  }
  els.uploadInput.addEventListener('change', function () {
    var file = els.uploadInput.files[0];
    els.uploadInput.value = '';
    if (!file || !/^image\//.test(file.type)) { toast('Please choose an image file.'); return; }
    var rd = new FileReader();
    rd.onload = function () { placeImage(rd.result); };
    rd.readAsDataURL(file);
  });

  // ---------- Text (big button toggles one simple row) ----------
  FONTS.forEach(function (f) {
    var o = document.createElement('option');
    o.value = f; o.textContent = f; o.style.fontFamily = f;
    els.fontSelect.appendChild(o);
  });

  var currentTextColor = '#111111';
  TEXT_COLORS.forEach(function (hex, i) {
    var s = document.createElement('button');
    s.className = 'swatch' + (i === 1 ? ' selected' : '');
    s.style.background = hex;
    s.addEventListener('click', function () {
      els.textColors.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('selected'); });
      s.classList.add('selected');
      currentTextColor = hex;
      var obj = activeObj();
      if (obj && obj.type === 'i-text') { obj.set('fill', hex); canvas.requestRenderAll(); }
    });
    els.textColors.appendChild(s);
  });

  els.textBtn.addEventListener('click', function () {
    if (view === '3d') setView('2d');
    els.textRow.classList.toggle('hidden');
    resize();
    if (!els.textRow.classList.contains('hidden')) els.textInput.focus();
  });

  els.addTextBtn.addEventListener('click', function () {
    var val = els.textInput.value.trim() || 'YOUR TEXT';
    var font = els.fontSelect.value;
    var a = currentArea();
    document.fonts.load('40px "' + font + '"').then(function () {
      var t = new fabric.IText(val, {
        fontFamily: font, fontSize: 42, fill: currentTextColor,
        textAlign: 'center', originX: 'center', originY: 'center',
        left: a.x + a.w / 2, top: a.y + a.h / 2
      });
      var maxW = a.w * 0.95;
      if (t.width > maxW) t.scaleToWidth(maxW);
      canvas.add(t); canvas.setActiveObject(t); canvas.requestRenderAll();
      els.textRow.classList.add('hidden');
      resize();
    });
  });

  els.textInput.addEventListener('input', function () {
    var obj = activeObj();
    if (obj && obj.type === 'i-text') { obj.set('text', els.textInput.value); canvas.requestRenderAll(); }
  });

  // ---------- Garment + color pickers ----------
  function markSelected(container, selector) {
    container.querySelectorAll('.selected').forEach(function (x) { x.classList.remove('selected'); });
    var el = container.querySelector(selector);
    if (el) el.classList.add('selected');
  }

  Object.keys(PRODUCTS).forEach(function (key, i) {
    var p = PRODUCTS[key];
    var b = document.createElement('button');
    b.className = 'prod-btn' + (i === 0 ? ' selected' : '');
    b.dataset.product = key;
    b.title = p.name;
    b.innerHTML = '<span class="p-ico">' + p.ico + '</span><span class="p-lbl">' + p.lbl + '</span>';
    b.addEventListener('click', function () {
      state.product = key;
      markSelected(els.productGrid, '[data-product="' + key + '"]');
      renderShirt(); applyClip();
      if (view === '3d') update3D();
    });
    els.productGrid.appendChild(b);
  });

  COLORS.forEach(function (c, i) {
    var s = document.createElement('button');
    s.className = 'swatch' + (i === 0 ? ' selected' : '');
    s.style.background = c[1];
    s.dataset.hex = c[1];
    s.title = c[0];
    s.addEventListener('click', function () {
      state.color = c[1]; state.colorName = c[0];
      markSelected(els.colorGrid, '[data-hex="' + c[1] + '"]');
      renderShirt();
      if (window.Shirt3D && window.Shirt3D.isInit()) window.Shirt3D.setColor(c[1]);
    });
    els.colorGrid.appendChild(s);
  });

  els.heatherBtn.addEventListener('click', function () {
    state.fabric = state.fabric === 'heather' ? 'solid' : 'heather';
    els.heatherBtn.classList.toggle('active', state.fabric === 'heather');
    if (window.Shirt3D && window.Shirt3D.isInit()) window.Shirt3D.setFabric(state.fabric);
    renderShirt();
  });

  // ---------- Decoration toggle ----------
  document.querySelectorAll('#decoToggle .pill').forEach(function (b) {
    b.addEventListener('click', function () {
      state.deco = b.dataset.deco;
      document.querySelectorAll('#decoToggle .pill').forEach(function (x) { x.classList.toggle('active', x === b); });
      if (view === '3d') update3D();
    });
  });

  // ---------- Download + quote ----------
  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }

  function drawCaption(ctx, W, y0, barH) {
    var facts = collectDesignFacts();
    var loc = LOCATIONS[state.loc];
    ctx.fillStyle = '#005CB9';
    ctx.fillRect(0, y0, W, barH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 30px "Open Sans", sans-serif';
    ctx.fillText('SIGNET', 28, y0 + 40);
    ctx.font = '600 22px "Open Sans", sans-serif';
    var parts = [PRODUCTS[state.product].name, state.colorName + (state.fabric === 'heather' ? ' Heather' : ''), loc.label,
      state.deco === 'embroidery' ? 'Embroidery' : 'Screen Print'];
    if (facts.objects) parts.push(facts.widthIn.toFixed(1) + '" x ' + facts.heightIn.toFixed(1) + '"');
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
            downloadBlob(blob, 'my-design-3d.png');
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
      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, 0, 0, out.width, DESIGN_H * scale);
        var designUrl = canvas.toDataURL({ format: 'png', multiplier: scale / zoom });
        var dImg = new Image();
        dImg.onload = function () {
          ctx.drawImage(dImg, 0, 0, out.width, DESIGN_H * scale);
          drawCaption(ctx, out.width, DESIGN_H * scale, barH);
          out.toBlob(function (blob) {
            downloadBlob(blob, 'my-design-' + state.loc + '.png');
            toast('Mockup downloaded.');
          });
        };
        dImg.src = designUrl;
      };
      img.src = bgUrl || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(shirtSVG(state.product, LOCATIONS[state.loc].side, state.color)));
    });
  });

  els.quoteBtn.addEventListener('click', function () {
    var facts = collectDesignFacts();
    var locsUsed = Object.keys(LOCATIONS).filter(locHasArt).map(function (k) { return LOCATIONS[k].label; });
    var lines = [
      'Hi Signet, I designed this in your apparel designer and would like a quote.',
      '',
      'Garment: ' + PRODUCTS[state.product].name + ' - ' + state.colorName + (state.fabric === 'heather' ? ' (Heather)' : ''),
      'Decoration: ' + (state.deco === 'embroidery' ? 'Embroidery' : 'Screen Print'),
      'Location(s): ' + (locsUsed.length ? locsUsed.join(', ') : 'None yet'),
      'Design size: ' + (facts.objects ? facts.widthIn.toFixed(1) + '" x ' + facts.heightIn.toFixed(1) + '"' : 'n/a'),
      'Colors: ' + (facts.objects ? Math.max(1, facts.colors) : 'n/a'),
      'Quantity and sizes: (fill in)',
      '',
      'I am attaching the mockup PNG I downloaded from the designer.'
    ];
    window.location.href = 'mailto:' + QUOTE_EMAIL +
      '?subject=' + encodeURIComponent('Apparel quote request') +
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

  // ---------- Init (fresh every load, nothing persists) ----------
  resize();
  renderShirt();
  window.addEventListener('resize', resize);
  FONTS.forEach(function (f) { document.fonts.load('40px "' + f + '"'); });
})();
