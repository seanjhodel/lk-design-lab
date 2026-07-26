/* Signet Apparel Designer - 3D engine
   Per-garment 3D models (interactive preview + flat 2D renders), solid color or heather fabric. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

// Garment models. tee is the pmndrs CC0 baked shirt; the others were generated
// in-house (image -> 3D). rotY calibrates each model so its front faces +Z.
var MODEL_BASE = 'https://cdn.jsdelivr.net/gh/seanjhodel/lk-design-lab@main/models/';
var MODELS = {
  tee:        { url: MODEL_BASE + 'tee.glb',        rotY: 0 },
  longsleeve: { url: MODEL_BASE + 'longsleeve.glb', rotY: 0 },
  crewneck:   { url: MODEL_BASE + 'crewneck.glb',   rotY: 0 },
  hoodie:     { url: MODEL_BASE + 'hoodie.glb',     rotY: 0 }
};

// 2D design-space constants (must match app.js): garment spans y 104..564 in a
// 520x620 viewBox, centered on x=260. Decal placement and flat-camera framing
// both derive from this mapping so print areas line up with the rendered garment.
var PX_TOP = 104, PX_LEN = 460, PX_CX = 260, VIEW_W = 520, VIEW_H = 620;

var scene, shadowMesh, sceneReady = false;
var current = null; // active model entry
var currentColor = '#ffffff';
var currentFabric = 'solid';
var decals = [];

var renderer, camera, controls, container, running = false; // interactive viewer
var flatRenderer, flatCamera; // offscreen straight-on renders for the 2D editor
var heatherTex = null;

function ensureScene() {
  if (scene) return;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa3b8, 1.0));
  var key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2.5, 3.5, 4);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xdfeaff, 0.5);
  rim.position.set(-2.5, 2, -4);
  scene.add(rim);
  var back = new THREE.DirectionalLight(0xffffff, 0.7);
  back.position.set(0, 2.5, -4);
  scene.add(back);
  sceneReady = true;
}

function getHeatherTex() {
  if (heatherTex) return heatherTex;
  var cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  var g = cv.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  // speckled marl: many short random gray flecks
  for (var i = 0; i < 5200; i++) {
    var x = Math.random() * 256, y = Math.random() * 256;
    var shadeV = 150 + Math.floor(Math.random() * 85);
    g.strokeStyle = 'rgba(' + shadeV + ',' + shadeV + ',' + (shadeV + 4) + ',' + (0.25 + Math.random() * 0.45) + ')';
    g.lineWidth = 0.6 + Math.random() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() * 4 - 2), y + (Math.random() * 2 - 1));
    g.stroke();
  }
  heatherTex = new THREE.CanvasTexture(cv);
  heatherTex.wrapS = heatherTex.wrapT = THREE.RepeatWrapping;
  heatherTex.colorSpace = THREE.SRGBColorSpace;
  return heatherTex;
}

// Box-project UVs so the heather pattern works even on meshes without UVs.
// Seams don't matter for a noise pattern. Density normalized by model size.
function boxProjectUVs(geometry, size) {
  var pos = geometry.attributes.position;
  var nor = geometry.attributes.normal;
  var s = 6 / Math.max(size.x, size.y, size.z);
  var uv = new Float32Array(pos.count * 2);
  for (var i = 0; i < pos.count; i++) {
    var nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    var u, v;
    if (nz >= nx && nz >= ny) { u = pos.getX(i); v = pos.getY(i); }
    else if (nx >= ny) { u = pos.getZ(i); v = pos.getY(i); }
    else { u = pos.getX(i); v = pos.getZ(i); }
    uv[i * 2] = u * s;
    uv[i * 2 + 1] = v * s;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function applyLook(entry) {
  if (!entry || !entry.mesh) return;
  var mat = entry.mesh.material;
  mat.color.set(currentColor);
  mat.map = currentFabric === 'heather' ? getHeatherTex() : null;
  mat.needsUpdate = true;
}

function loadModel(key) {
  var entry = MODELS[key] || MODELS.tee;
  if (entry.promise) return entry.promise;
  ensureScene();
  entry.promise = new Promise(function (resolve, reject) {
    new GLTFLoader().load(entry.url, function (gltf) {
      var group = gltf.scene;
      var mesh = null;
      group.traverse(function (o) { if (o.isMesh && !mesh) mesh = o; });
      if (!mesh) { entry.promise = null; reject(new Error('no mesh in ' + key)); return; }
      group.rotation.y = entry.rotY || 0;
      group.updateMatrixWorld(true);

      // uniform clean-render style for every garment: geometry shading, no baked map
      mesh.material = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.9, metalness: 0, side: THREE.DoubleSide
      });

      var bbox = new THREE.Box3().setFromObject(group);
      var size = bbox.getSize(new THREE.Vector3());
      var center = bbox.getCenter(new THREE.Vector3());
      boxProjectUVs(mesh.geometry, size);

      entry.group = group;
      entry.mesh = mesh;
      entry.bbox = bbox;
      entry.size = size;
      entry.center = center;
      group.visible = false;
      scene.add(group);
      resolve(entry);
    }, undefined, function (err) { entry.promise = null; reject(err); });
  });
  return entry.promise;
}

function updateShadow() {
  if (!current) return;
  if (!shadowMesh) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    var g = cv.getContext('2d');
    var grad = g.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(20,35,55,0.32)');
    grad.addColorStop(1, 'rgba(20,35,55,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    scene.add(shadowMesh);
  }
  shadowMesh.scale.set(current.size.x * 1.7, current.size.z * 3, 1);
  shadowMesh.position.set(current.center.x, current.bbox.min.y - current.size.y * 0.02, current.center.z);
}

function frameCamera() {
  if (!camera || !current) return;
  var dist = current.size.y * 2.7;
  camera.position.set(current.center.x, current.center.y + current.size.y * 0.05, current.center.z + dist);
  controls.target.copy(current.center);
  controls.minDistance = dist * 0.55;
  controls.maxDistance = dist * 2.2;
  controls.maxPolarAngle = Math.PI * 0.72;
  controls.update();
}

function setProduct(key) {
  return loadModel(key).then(function (entry) {
    if (current === entry) { applyLook(entry); return entry; }
    if (current && current.group) current.group.visible = false;
    current = entry;
    entry.group.visible = true;
    applyLook(entry);
    clearDecals();
    updateShadow();
    frameCamera();
    return entry;
  });
}

function preload(key) { return setProduct(key || 'tee'); }

function init(el) {
  container = el;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(26, 1, 0.01, 50);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;

  ensureScene();
  var p = (current ? Promise.resolve(current) : loadModel('tee').then(function (e) { current = e; e.group.visible = true; applyLook(e); updateShadow(); return e; }))
    .then(function () { frameCamera(); });

  running = true;
  renderer.setAnimationLoop(function () {
    if (!running) return;
    controls.update();
    renderer.render(scene, camera);
  });
  resizeTo(container.clientWidth, container.clientHeight);
  return p;
}

function resizeTo(w, h) {
  if (!renderer) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function setColor(hex) {
  currentColor = hex;
  applyLook(current);
}

function setFabric(style) {
  currentFabric = style === 'heather' ? 'heather' : 'solid';
  applyLook(current);
}

// Straight-on orthographic render of the blank garment, framed exactly like the
// 2D design space (520x620, garment spanning y 104..564) so print areas line up.
function renderFlat(product, hex, fabric, isBack, mult) {
  return setProduct(product).then(function (entry) {
    currentColor = hex;
    currentFabric = fabric === 'heather' ? 'heather' : 'solid';
    applyLook(entry);
    if (!flatRenderer) {
      flatRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      flatRenderer.setPixelRatio(1);
      flatRenderer.outputColorSpace = THREE.SRGBColorSpace;
      flatCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, 50);
    }
    var m = mult || 1;
    flatRenderer.setSize(VIEW_W * m, VIEW_H * m);

    var k = entry.size.y / PX_LEN;
    flatCamera.left = -(VIEW_W / 2) * k;
    flatCamera.right = (VIEW_W / 2) * k;
    flatCamera.top = (VIEW_H / 2) * k;
    flatCamera.bottom = -(VIEW_H / 2) * k;
    var cy = entry.bbox.max.y + PX_TOP * k - (VIEW_H / 2) * k;
    var dist = Math.max(entry.size.z * 6, entry.size.y);
    flatCamera.position.set(entry.center.x, cy, entry.center.z + (isBack ? -dist : dist));
    flatCamera.up.set(0, 1, 0);
    flatCamera.lookAt(entry.center.x, cy, entry.center.z);
    flatCamera.updateProjectionMatrix();

    var hidden = decals.concat(shadowMesh ? [shadowMesh] : []);
    hidden.forEach(function (d) { d.visible = false; });
    flatRenderer.render(scene, flatCamera);
    var url = flatRenderer.domElement.toDataURL('image/png');
    hidden.forEach(function (d) { d.visible = true; });
    return url;
  });
}

function clearDecals() {
  decals.forEach(function (d) {
    scene.remove(d);
    d.geometry.dispose();
    if (d.material.map) d.material.map.dispose();
    d.material.dispose();
  });
  decals = [];
}

// items: [{img: dataURL, area: {x,y,w,h}, back: bool}] applied to the ACTIVE garment
function setDecals(items) {
  if (!current) return Promise.resolve();
  var entry = current;
  clearDecals();
  var k = entry.size.y / PX_LEN; // world units per 2D design px
  return Promise.all(items.map(function (it) {
    return new Promise(function (resolve) {
      var image = new Image();
      image.onload = function () {
        if (current !== entry) { resolve(); return; }
        var tex = new THREE.Texture(image);
        tex.colorSpace = THREE.SRGBColorSpace;
        if (renderer) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tex.needsUpdate = true;
        var a = it.area;
        var w = a.w * k, h = a.h * k;
        var cx = entry.center.x + (a.x + a.w / 2 - PX_CX) * k * (it.back ? -1 : 1);
        var cy = entry.bbox.max.y - (a.y + a.h / 2 - PX_TOP) * k;
        var cz = entry.center.z + (it.back ? -1 : 1) * entry.size.z * 0.35;
        var pos = new THREE.Vector3(cx, cy, cz);
        var rot = new THREE.Euler(0, it.back ? Math.PI : 0, 0);
        var size = new THREE.Vector3(w, h, entry.size.z * 0.6);
        var geo = new DecalGeometry(entry.mesh, pos, rot, size);
        var mat = new THREE.MeshStandardMaterial({
          map: tex, transparent: true, roughness: 0.85, metalness: 0,
          depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4
        });
        var mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        decals.push(mesh);
        resolve();
      };
      image.onerror = function () { resolve(); };
      image.src = it.img;
    });
  }));
}

function snapshot() {
  if (!renderer) return null;
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
}

function setRunning(on) {
  running = on;
  if (on && renderer) {
    renderer.setAnimationLoop(function () {
      if (!running) return;
      controls.update();
      renderer.render(scene, camera);
    });
  } else if (renderer) {
    renderer.setAnimationLoop(null);
  }
}

window.Shirt3D = {
  init: init,
  preload: preload,
  setProduct: setProduct,
  setColor: setColor,
  setFabric: setFabric,
  setDecals: setDecals,
  renderFlat: renderFlat,
  resizeTo: resizeTo,
  snapshot: snapshot,
  setRunning: setRunning,
  isInit: function () { return !!renderer; }
};
window.dispatchEvent(new Event('shirt3d-api'));
