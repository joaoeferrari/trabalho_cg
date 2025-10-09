import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(100, 150, 100);
    scene.add(ambientLight, dirLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(600, 600),
        new THREE.MeshPhongMaterial({ color: 0x2e8b57 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    loadAnimals();

    window.addEventListener('resize', onWindowResize);
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
}

function loadAnimals() {
    const loader = new OBJLoader();

    const spacing = 80;   
    const baseZ = 0;
    const targetSize = 60; 

    const animals = [
        { name: "Wolf1",  file: "assets/Wolf.obj" },
        { name: "Wolf2",  file: "assets/Wolf.obj" },
        { name: "Pug1",   file: "assets/Pug.obj" },
        { name: "Pug2",   file: "assets/Pug.obj" },
        { name: "Monkey1", file: "assets/Monkey_Suzanne.obj" },
        { name: "Monkey2", file: "assets/Monkey_Suzanne.obj" }
    ];

    const totalWidth = (animals.length - 1) * spacing;
    const startX = -totalWidth / 2;
    let loaded = 0;

    animals.forEach((a, i) => {
        loader.load(
            a.file,
            function (obj) {
                obj.traverse(c => {
                    if (c instanceof THREE.Mesh)
                        c.material = new THREE.MeshNormalMaterial();
                });

                const box = new THREE.Box3().setFromObject(obj);
                const size = new THREE.Vector3();
                box.getSize(size);

                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = targetSize / maxDim;
                obj.scale.setScalar(scaleFactor);

                const newBox = new THREE.Box3().setFromObject(obj);

                const yShift = -newBox.min.y;
                obj.position.y = yShift;

                obj.position.x = startX + i * spacing;
                obj.position.z = baseZ;

                scene.add(obj);
                objects[a.name] = obj;

                loaded++;
                if (loaded === animals.length) {
                    createGui();
                    camera.lookAt(objects["Wolf1"].position);
                }
            },
            undefined,
            err => console.error("Erro ao carregar:", a.file, err)
        );
    });
}

function createGui() {
    gui = new GUI();

    const params = {
        selected: "Wolf1"
    };

    gui.add(params, "selected")
        .options(Object.keys(objects))
        .name("Olhar para:")
        .onChange(v => {
            const alvo = objects[v];
            if (alvo) {
                camera.lookAt(alvo.position);
            }
        });

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
