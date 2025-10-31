import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

let camera, scene, renderer;
let objects = {};
let gui;

export function init() {
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 100, 250);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(100, 150, 100);
  dirLight.castShadow = true;
  scene.add(ambientLight, dirLight);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x2e8b57 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  loadWolfPair();
  loadPigPair();
  loadPenguinPair();

  window.addEventListener('resize', onWindowResize);
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}

function normalizeAndPlace(obj, { targetSize = 60, position = { x: 0, z: 0 } } = {}) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scaleFactor = targetSize / maxDim;
  obj.scale.setScalar(scaleFactor);

  obj.updateMatrixWorld(true);
  const newBox = new THREE.Box3().setFromObject(obj);
  obj.position.set(position.x || 0, -newBox.min.y, position.z || 0);
}

function alignOnGround(obj) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj);
  obj.position.y = -b.min.y;
}

function refreshGuiWith(name, obj) {
  objects[name] = obj;
  if (gui) gui.destroy();

  gui = new GUI({ title: 'Controles' });
  const params = {
    selected: Object.keys(objects)[0] || name,
    resetCam: () => camera.position.set(0, 100, 250)
  };

  const controller = gui.add(params, 'selected')
    .options(Object.keys(objects))
    .name('Olhar para:');

  controller.onChange((v) => {
    const alvo = objects[v];
    if (alvo) camera.lookAt(alvo.position);
  });

  const first = objects[params.selected];
  if (first) camera.lookAt(first.position);
}

function loadWolfPair() {
  const loader = new FBXLoader();
  const textureLoader = new THREE.TextureLoader();

  const texture = textureLoader.load('assets/textures/wilk_tekstura.png');
  texture.colorSpace = THREE.SRGBColorSpace;

  loader.load(
    'assets/models/wilkzkosci.fbx',
    (obj) => {
      obj.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.2,
            roughness: 0.8
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      normalizeAndPlace(obj, { targetSize: 60, position: { x: -180, z: 0 } });
      scene.add(obj);
      refreshGuiWith('Wolf 1', obj);

      const wolf2 = cloneSkinned(obj);
      wolf2.traverse((c) => { if (c.isMesh) c.material = c.material.clone(); });
      wolf2.position.set(-80, obj.position.y, -60);
      alignOnGround(wolf2);
      scene.add(wolf2);
      refreshGuiWith('Wolf 2', wolf2);
    },
    undefined,
    (err) => console.error('Erro ao carregar o lobo FBX:', err)
  );
}

function loadPigPair() {
  const loader = new FBXLoader();
  const textureLoader = new THREE.TextureLoader();

  let pigTexture = null;
  try {
    pigTexture = textureLoader.load('assets/textures/pig.jpg');
    pigTexture.colorSpace = THREE.SRGBColorSpace;
  } catch {
    console.warn('Sem pig.jpg');
  }

  loader.load(
    'assets/models/pig.fbx',
    (obj) => {
      obj.traverse((child) => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.material = pigTexture
            ? new THREE.MeshStandardMaterial({ map: pigTexture, metalness: 0.1, roughness: 0.9 })
            : new THREE.MeshStandardMaterial({ color: 0xf2b5a0, metalness: 0.1, roughness: 0.9 });
          child.castShadow = true;
          child.receiveShadow = true;
          if (!child.geometry.attributes.normal) child.geometry.computeVertexNormals();
        }
      });

      normalizeAndPlace(obj, { targetSize: 40, position: { x: 0, z: 100 } });
      scene.add(obj);
      refreshGuiWith('Pig 1', obj);

      const pig2 = cloneSkinned(obj);
      pig2.traverse((c) => { if (c.isMesh) c.material = c.material.clone(); });
      pig2.position.set(120, obj.position.y, 140);
      alignOnGround(pig2);
      scene.add(pig2);
      refreshGuiWith('Pig 2', pig2);
    },
    undefined,
    (err) => console.error('Erro ao carregar o porco FBX:', err)
  );
}

function loadPenguinPair() {
  const fbxLoader = new FBXLoader();
  const textureLoader = new THREE.TextureLoader();

  let tex = null;
  try {
    tex = textureLoader.load('assets/textures/penguin.png');
    tex.colorSpace = THREE.SRGBColorSpace;
  } catch {
    console.warn('Sem penguin.png ');
  }

  const applyFixes = (obj) => {
    let meshes = 0;
    obj.traverse((ch) => {
      if (ch.isMesh || ch.isSkinnedMesh) {
        meshes++;
        const mat = new THREE.MeshStandardMaterial(
          tex ? { map: tex, metalness: 0.05, roughness: 0.9 }
              : { color: 0xffffff, metalness: 0.05, roughness: 0.9 }
        );
        ch.material = mat;
        ch.castShadow = true;
        ch.receiveShadow = true;
        if (!ch.geometry.attributes.normal) ch.geometry.computeVertexNormals();
      }
    });
    return meshes;
  };

  const placePair = (baseObj) => {
    normalizeAndPlace(baseObj, { targetSize: 45, position: { x: 140, z: 60 } });
    scene.add(baseObj);
    refreshGuiWith('Penguin 1', baseObj);

    const peng2 = cloneSkinned(baseObj);
    peng2.traverse((c) => { if (c.isMesh) c.material = c.material.clone(); });
    peng2.position.set(220, baseObj.position.y, 60);
    alignOnGround(peng2);
    scene.add(peng2);
    refreshGuiWith('Penguin 2', peng2);
  };

  fbxLoader.load(
    'assets/models/penguin.fbx',
    (obj) => {
      const count = applyFixes(obj);
      if (count === 0) {
        console.warn('FBX do pinguim sem meshes');
        loadPenguinOBJ(placePair);
      } else {
        placePair(obj);
      }
    },
    undefined,
    (err) => {
      console.error('Erro no FBX do pinguim:', err);
      loadPenguinOBJ(placePair);
    }
  );

  function loadPenguinOBJ(cb) {
    const mtlLoader = new MTLLoader();
    const objLoader = new OBJLoader();

    mtlLoader.load(
      'assets/models/penguin.mtl',
      (materials) => {
        materials.preload();
        Object.values(materials.materials).forEach((m) => {
          const map = m.map || tex || null;
          materials.materials[m.name] = new THREE.MeshStandardMaterial({
            map,
            color: m.color?.clone?.() || new THREE.Color(0xffffff),
            metalness: 0.05,
            roughness: 0.9,
            side: THREE.DoubleSide
          });
        });

        objLoader.setMaterials(materials);
        objLoader.load(
          'assets/models/penguin.obj',
          (obj) => {
            obj.traverse((ch) => {
              if (ch.isMesh) {
                ch.castShadow = true;
                ch.receiveShadow = true;
                if (!ch.geometry.attributes.normal) ch.geometry.computeVertexNormals();
              }
            });
            cb(obj);
          }
        );
      },
      undefined,
      (err) => {
        console.error('Erro no MTL do pinguim:', err);
        const objOnly = new OBJLoader();
        objOnly.load('assets/models/penguin.obj', (obj) => {
          obj.traverse((ch) => {
            if (ch.isMesh) {
              ch.material = new THREE.MeshStandardMaterial({
                color: 0xffffff, metalness: 0.05, roughness: 0.9, side: THREE.DoubleSide
              });
              ch.castShadow = true;
              ch.receiveShadow = true;
            }
          });
          cb(obj);
        });
      }
    );
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
