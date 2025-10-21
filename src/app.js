import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/TransformControls.js';
import { GLTFExporter } from 'https://unpkg.com/three@0.158.0/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'https://unpkg.com/three@0.158.0/examples/jsm/exporters/OBJExporter.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth - 320, window.innerHeight - 96);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(60, (window.innerWidth-320)/(window.innerHeight-96), 0.1, 1000);
camera.position.set(3,3,6);

const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
hemi.position.set(0,20,0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5,10,2);
scene.add(dir);

const grid = new THREE.GridHelper(20, 40, 0x333333, 0x222222);
scene.add(grid);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;

const transform = new TransformControls(camera, renderer.domElement);
transform.addEventListener('dragging-changed', function (event) { orbit.enabled = !event.value; });
scene.add(transform);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let objects = []; // track scene models (meshes/groups)
let selected = null;
let idCount = 0;

function uniqueName(base){
  idCount++;
  return `${base}_${idCount}`;
}

function addMesh(mesh){
  mesh.userData.metaId = uniqueName(mesh.type || mesh.geometry?.type || 'obj');
  objects.push(mesh);
  scene.add(mesh);
  refreshObjectList();
  selectObject(mesh);
}

function createBox(){
  const geo = new THREE.BoxGeometry(1,1,1);
  const mat = new THREE.MeshStandardMaterial({color:0xffffff});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Cube';
  mesh.position.set(0.5,0.5,0);
  addMesh(mesh);
}

function createSphere(){
  const geo = new THREE.SphereGeometry(0.6, 32, 24);
  const mat = new THREE.MeshStandardMaterial({color:0xffffff});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Sphere';
  mesh.position.set(0,0.6,0);
  addMesh(mesh);
}

function createPlane(){
  const geo = new THREE.PlaneGeometry(2,2);
  const mat = new THREE.MeshStandardMaterial({color:0xffffff, side: THREE.DoubleSide});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Plane';
  mesh.rotation.x = -Math.PI/2 * 0.1;
  mesh.position.set(0,0.01,0);
  addMesh(mesh);
}

// AI placeholder: simple text parser -> generate primitive/group
function aiGenerateFromText(text){
  text = (text || '').toLowerCase();
  if(!text.trim()) return;
  if(text.includes('house')){
    // simple house: box + roof (pyramid)
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2,1.2,1.4), new THREE.MeshStandardMaterial({color:0xffcc99}));
    body.position.y = 0.6;
    const roofGeo = new THREE.ConeGeometry(1.4,0.8,4);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({color:0x993333}));
    roof.position.y = 1.4;
    roof.rotation.y = Math.PI/4;
    group.add(body, roof);
    group.name = 'House';
    addMesh(group);
    return;
  }
  if(text.includes('tree')){
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.8), new THREE.MeshStandardMaterial({color:0x8b5a2b}));
    trunk.position.y = 0.4;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.8,1.0,16), new THREE.MeshStandardMaterial({color:0x228b22}));
    leaves.position.y = 1.1;
    group.add(trunk, leaves);
    group.name = 'Tree';
    addMesh(group);
    return;
  }
  if(text.includes('lamp')){
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.5), new THREE.MeshStandardMaterial({color:0xaaaaaa}));
    base.position.y = 0.25;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15,16,12), new THREE.MeshStandardMaterial({color:0xffffcc, emissive:0xffff99, emissiveIntensity:0.6}));
    bulb.position.y = 0.6;
    const g = new THREE.Group();
    g.add(base, bulb);
    g.name = 'Lamp';
    addMesh(g);
    return;
  }
  // fallback: generate a stack of primitives based on words count
  const words = text.split(/\s+/).filter(Boolean).length;
  const group = new THREE.Group();
  for(let i=0;i<Math.min(5, words+1); i++){
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.4,0.6), new THREE.MeshStandardMaterial({color: new THREE.Color().setHSL(i/6, 0.6, 0.6)}));
    m.position.set((i-1)*0.7, 0.2 + i*0.25, 0);
    group.add(m);
  }
  group.name = 'AI_Fallback';
  addMesh(group);
}

// AI placeholder: image input -> create textured plane and use average color to influence primitive type
async function aiGenerateFromImage(file){
  if(!file) return;
  const img = await fileToImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = 128, h = 128;
  canvas.width = w; canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0,0,w,h).data;
  let r=0,g=0,b=0,count=0;
  for(let i=0;i<data.length;i+=4){
    r+=data[i]; g+=data[i+1]; b+=data[i+2]; count++;
  }
  r=Math.round(r/count); g=Math.round(g/count); b=Math.round(b/count);
  const avg = (r+g+b)/3;
  // if bright -> sphere, if dark -> cube, else plane textured
  const tex = new THREE.CanvasTexture(canvas);
  if(avg > 200){
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.8,32,24), new THREE.MeshStandardMaterial({map:tex}));
    s.name = 'AI_Image_Sphere';
    addMesh(s);
  } else if(avg < 80){
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2), new THREE.MeshStandardMaterial({map:tex}));
    m.name = 'AI_Image_Box';
    addMesh(m);
  } else {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshStandardMaterial({map:tex, side:THREE.DoubleSide}));
    p.name = 'AI_Image_Plane';
    addMesh(p);
  }
}

function fileToImage(file){
  return new Promise((res,rej)=>{
    const fr = new FileReader();
    fr.onload = ()=> {
      const img = new Image();
      img.onload = ()=> res(img);
      img.src = fr.result;
    };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

// selection handling
function selectObject(obj){
  if(selected === obj) return;
  if(selected){
    // remove highlight
    const li = document.querySelector(`#object-list li[data-id="${selected.userData.metaId}"]`);
    if(li) li.classList.remove('selected');
  }
  selected = obj;
  if(obj){
    transform.attach(obj);
    document.getElementById('selection-info').textContent = obj.name || obj.userData.metaId;
    const li = document.querySelector(`#object-list li[data-id="${obj.userData.metaId}"]`);
    if(li) li.classList.add('selected');
    const colorInput = document.getElementById('color-picker');
    const mat = getMaterial(obj);
    if(mat) colorInput.value = '#'+mat.color.getHexString();
  } else {
    transform.detach();
    document.getElementById('selection-info').textContent = 'None';
  }
}

function getMaterial(obj){
  if(obj.material) return obj.material;
  if(obj.children && obj.children.length){
    for(const c of obj.children){
      if(c.material) return c.material;
    }
  }
  return null;
}

function refreshObjectList(){
  const list = document.getElementById('object-list');
  list.innerHTML = '';
  for(const o of objects){
    const li = document.createElement('li');
    li.textContent = `${o.name || o.type} — ${o.userData.metaId}`;
    li.dataset.id = o.userData.metaId;
    li.onclick = ()=> selectObject(o);
    list.appendChild(li);
  }
}

// pointer picking
function onPointerDown(event){
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(objects, true);
  if(intersects.length){
    // pick the top-most parent that is in objects array
    let picked = intersects[0].object;
    while(picked && !objects.includes(picked)) picked = picked.parent;
    if(picked) selectObject(picked);
  } else {
    selectObject(null);
  }
}

window.addEventListener('pointerdown', onPointerDown);

// UI wiring
document.getElementById('add-box').onclick = createBox;
document.getElementById('add-sphere').onclick = createSphere;
document.getElementById('add-plane').onclick = createPlane;

document.getElementById('ai-generate-text').onclick = ()=>{
  const t = document.getElementById('ai-text').value;
  aiGenerateFromText(t);
};

document.getElementById('ai-image').addEventListener('change', (e)=>{
  const f = e.target.files?.[0];
  if(f) aiGenerateFromImage(f);
});

// color change
document.getElementById('color-picker').addEventListener('input', (e)=>{
  if(!selected) return;
  const mat = getMaterial(selected);
  if(mat) mat.color = new THREE.Color(e.target.value);
});

// transform mode
document.getElementById('transform-mode').addEventListener('change', (e)=>{
  transform.setMode(e.target.value);
});

// delete
document.getElementById('delete-object').onclick = ()=>{
  if(!selected) return;
  scene.remove(selected);
  const idx = objects.indexOf(selected);
  if(idx>=0) objects.splice(idx,1);
  selected = null;
  refreshObjectList();
};

// export GLB
document.getElementById('btn-export-glb').onclick = ()=>{
  const exporter = new GLTFExporter();
  exporter.parse( scene, function(result){
    let output;
    if(result instanceof ArrayBuffer){
      output = new Blob([result], {type: 'application/octet-stream'});
      saveBlob(output, 'scene.glb');
    } else {
      const text = JSON.stringify(result, null, 2);
      saveString(text, 'scene.gltf');
    }
  }, {binary:true});
};

// export OBJ
document.getElementById('btn-export-obj').onclick = ()=>{
  const exporter = new OBJExporter();
  const result = exporter.parse(scene);
  saveString(result, 'scene.obj');
};

function saveString(text, filename){
  const blob = new Blob([text], {type:'text/plain'});
  saveBlob(blob, filename);
}
function saveBlob(blob, filename){
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(()=> URL.revokeObjectURL(link.href), 1000);
}

// Save/Load scene to localStorage (simple JSON representation)
function exportSceneJSON(){
  const data = [];
  for(const o of objects){
    // Skip helpers/lights if any slipped in
    if(!o.userData.metaId) continue;
    const item = {
      metaId: o.userData.metaId,
      name: o.name,
      type: o.type,
      position: o.position.toArray(),
      rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
      scale: o.scale.toArray(),
      userData: {}
    };
    // store material color if any
    const mat = getMaterial(o);
    if(mat && mat.color) item.userData.color = mat.color.getHex();
    // textures: try to capture canvas dataURL for Texture (only for simple canvases)
    if(mat && mat.map && mat.map.image){
      try{
        const c = document.createElement('canvas');
        c.width = mat.map.image.width || 128;
        c.height = mat.map.image.height || 128;
        const ctx = c.getContext('2d');
        ctx.drawImage(mat.map.image, 0, 0, c.width, c.height);
        item.userData.textureDataUrl = c.toDataURL();
      }catch(e){}
    }
    data.push(item);
  }
  return JSON.stringify({objects: data}, null, 2);
}

document.getElementById('btn-save-local').onclick = ()=>{
  const json = exportSceneJSON();
  localStorage.setItem('ai3d_scene', json);
  alert('Scene saved to localStorage.');
};

document.getElementById('btn-load-local').onclick = ()=>{
  const json = localStorage.getItem('ai3d_scene');
  if(!json){ alert('No scene in localStorage'); return; }
  importSceneJSON(json);
};

document.getElementById('btn-export-json').onclick = ()=>{
  const json = exportSceneJSON();
  saveString(json, 'scene.json');
};

document.getElementById('file-import-json').addEventListener('change', (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  const fr = new FileReader();
  fr.onload = ()=> importSceneJSON(fr.result);
  fr.readAsText(f);
});

function importSceneJSON(jsonStr){
  try{
    const parsed = JSON.parse(jsonStr);
    // remove current objects
    for(const o of [...objects]){ scene.remove(o); }
    objects = [];
    // recreate
    for(const it of parsed.objects || []){
      let mesh;
      // reuse type hints: prefer name
      if(it.name && it.name.toLowerCase().includes('sphere')){
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.6,32,24), new THREE.MeshStandardMaterial());
      } else if(it.name && it.name.toLowerCase().includes('plane')){
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshStandardMaterial({side:THREE.DoubleSide}));
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial());
      }
      mesh.name = it.name || 'Imported';
      mesh.position.fromArray(it.position);
      mesh.rotation.set(it.rotation[0], it.rotation[1], it.rotation[2]);
      mesh.scale.fromArray(it.scale);
      if(it.userData && it.userData.color){
        const mat = getMaterial(mesh);
        if(mat) mat.color = new THREE.Color(it.userData.color);
      }
      if(it.userData && it.userData.textureDataUrl){
        const img = new Image();
        img.onload = ()=>{
          const tex = new THREE.CanvasTexture(img);
          const mat = getMaterial(mesh);
          if(mat) mat.map = tex;
        };
        img.src = it.userData.textureDataUrl;
      }
      mesh.userData.metaId = it.metaId;
      objects.push(mesh);
      scene.add(mesh);
    }
    refreshObjectList();
    alert('Scene imported.');
  }catch(err){
    console.error(err);
    alert('Failed to import scene JSON.');
  }
}

// small helpers to keep renderer sized with sidebar
function onWindowResize(){
  const w = window.innerWidth - 320;
  const h = window.innerHeight - 96;
  renderer.setSize(w, h);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onWindowResize);

// simple animation loop
function animate(){
  requestAnimationFrame(animate);
  orbit.update();
  renderer.render(scene, camera);
}
animate();

// init with a sample object
createBox();
createSphere();
refreshObjectList();

// Expose some internals to window for debugging
window._app = {scene, renderer, camera, objects};
