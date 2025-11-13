import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

let camera, scene, renderer;
let objects = [];
let velCubo = 0.001;
let parametrosGui;
let mixer;
let animationActions = [];
let activeAnimation;
let lastAnimation;
let loadFinished = false;
let clock = new THREE.Clock();
let keyState = {};     
let moveSpeed = 10;   
let turnSpeed = 1.0;  
let activeLight;               
let luzSolar, luzSpot, luzPoint; 

let criaIluminacao = function () {
    luzAmbiente();

    luzSolar = criaLuzSolar();
    luzSpot  = criaLuzSpot();
    luzPoint = criaLuzPoint(); 

    activeLight = luzSolar;
    scene.add(activeLight);
};

let criaLuzSolar = function () {
    const sol = new THREE.DirectionalLight(0xffffff, 0.8);
    sol.position.set(150, 250, 150);
    sol.castShadow = true;
    sol.shadow.mapSize.width = 2048;
    sol.shadow.mapSize.height = 2048;
    sol.shadow.camera.near = 0.5;
    sol.shadow.camera.far = 1000;
    sol.shadow.camera.left = -300;
    sol.shadow.camera.right = 300;
    sol.shadow.camera.top = 300;
    sol.shadow.camera.bottom = -300;

    return sol;
};

let luzAmbiente = function () {
    const amb = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(amb);
};

let criaLuzSpot = function () {
    const spot = new THREE.SpotLight(0xffddaa, 18); 

    spot.position.set(20, 35, 60);

    spot.angle = Math.PI / 4;
    spot.penumbra = 0.15;    
    spot.decay = 1;
    spot.distance = 300;
    spot.castShadow = true;
    spot.shadow.mapSize.width = 2048;
    spot.shadow.mapSize.height = 2048;
    spot.shadow.camera.near = 1;
    spot.shadow.camera.far = 400;
    spot.shadow.focus = 1;

    spot.target.position.set(0, 0, 0);
    scene.add(spot.target);

    return spot;
};

let criaLuzPoint = function () {
    const point = new THREE.PointLight(0xffffff, 1.5, 200, 1); 
    point.position.set(10, 30, 10);
    point.castShadow = true;
    point.shadow.mapSize.width = 1024;
    point.shadow.mapSize.height = 1024;
    point.shadow.camera.near = 0.5;
    point.shadow.camera.far = 500;

    return point;
};

let setAction = function (animacao) {
    if (animacao !== activeAnimation) {
        lastAnimation = activeAnimation;
        activeAnimation = animacao;

        if (lastAnimation) {
            lastAnimation.stop();
        }

        activeAnimation.reset();
        activeAnimation.play();
    }
};

let createGui = function () {
    const gui = new GUI();

    parametrosGui = {
        scale: 1,
        positionX: 0,
        lobaoScale: 30,
        lobaoRotationY: 0,
        opt: 'Origem',
        tipoLuz: 'Directional'
    };

    let scale = gui.add(parametrosGui, 'scale')
        .min(0.1)
        .max(10)
        .step(0.3)
        .name("Scale");

    scale.onChange(function (value) {
        if (objects["ombro"]) {
            objects["ombro"].scale.set(value, value, value);
        }
    });

    let position = gui.addFolder("Position");

    let lobao = gui.addFolder("Lobao");
    lobao.add(parametrosGui, 'lobaoScale')
        .min(0)
        .max(40)
        .step(1)
        .name("Scale")
        .onChange(function (value) {
            if (objects["pug"]) {
                objects["pug"].scale.set(value, value, value);
            }
        });

    lobao.add(parametrosGui, 'lobaoRotationY')
        .min(-2)
        .max(2)
        .step(0.1)
        .name("Rotation")
        .onChange(function (value) {
            if (objects["pug"]) {
                objects["pug"].rotation.y = value;
            }
        });

    let options = ['Origem', 'Lobao'];
    lobao.add(parametrosGui, 'opt')
        .options(options)
        .name("Look")
        .onChange(function (value) {
            if (value === "Lobao" && objects["lobao"]) {
                camera.lookAt(objects["lobao"].position);
            } else if (objects["pug"]) {
                camera.lookAt(objects["pug"].position);
            }
        });

    position.add(parametrosGui, 'positionX')
        .min(-4)
        .max(4)
        .step(0.1)
        .name("X")
        .onChange(function (value) {
            if (objects["ombro"]) {
                objects["ombro"].position.x = value;
            }
        });

    let lighting = gui.addFolder("Iluminação");
    lighting.add(parametrosGui, 'tipoLuz')
        .options(['Directional', 'Spot', 'Point'])
        .name("Tipo de Luz")
        .onChange(function (value) {
            if (activeLight) scene.remove(activeLight);

            switch (value) {
    case 'Directional':
        activeLight = luzSolar;
        camera.lookAt(0, 0, 0);
        break;

    case 'Spot':
        activeLight = luzSpot;

        if (objects["pug"]) {
            luzSpot.target = objects["pug"];
            const p = objects["pug"].position.clone();
            luzSpot.position.set(p.x + 20, p.y + 35, p.z + 60);
        }
        break;
    
    case 'Point':
        activeLight = luzPoint;
        if (objects["pug"]) {
            const p = objects["pug"].position.clone();
            luzPoint.position.set(p.x, p.y + 20, p.z + 10); 
        }
        break;
}


            scene.add(activeLight);
        });
};

let loadObj = function () {
    let objLoader = new OBJLoader();
    let fbxLoader = new FBXLoader();
    let textLoader = new THREE.TextureLoader();

    objLoader.load(
        "assets/Wolf.obj",
        function (obj) {
            obj.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshNormalMaterial();
                }
            });
            scene.add(obj);
            objects["lobao"] = obj;
            obj.position.x = 90;
            obj.scale.set(30, 30, 30);
        },
        function (progress) {
            console.log("Wolf: " + (progress.loaded / progress.total) * 100 + "%");
        },
        function (error) {
            console.log("Erro Wolf: " + error);
        }
    );

    fbxLoader.load(
        "assets/fbx/Dragon3.fbx",
        function (obj) {
            obj.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    let texture = textLoader.load("assets/fbx/Dragon_ground_color.jpg");
                    child.material = new THREE.MeshStandardMaterial({ map: texture });
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            scene.add(obj);
            objects["pug"] = obj;
            obj.position.x = -10;
            obj.scale.set(0.01, 0.01, 0.01);
            obj.position.y -= 5.8;

            if (luzSpot) {
                luzSpot.target = objects["pug"];
            }

            mixer = new THREE.AnimationMixer(obj);

            let animation = mixer.clipAction(obj.animations[1]);
            animationActions.push(animation);

            animation = mixer.clipAction(obj.animations[0]);
            animationActions.push(animation);

            animation = mixer.clipAction(obj.animations[2]);
            animationActions.push(animation);

            animation = mixer.clipAction(obj.animations[3]);
            animationActions.push(animation);

            activeAnimation = animationActions[2];
            setAction(animationActions[2]);

            loadFinished = true;
        },
        function (progress) {
            console.log("Dragon: " + (progress.loaded / progress.total) * 100 + "%");
        },
        function (error) {
            console.log("Erro Dragon: " + error);
        }
    );
};

export function init() {

    camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 200);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcce0ff);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    criaIluminacao();
    createGui();
    loadObj();

    camera.position.z = 60;

    renderer.setAnimationLoop(nossaAnimacao);

    document.body.appendChild(renderer.domElement);

    let textLoader = new THREE.TextureLoader();
    let textGround = textLoader.load("assets/grasslight-big.jpg");
    textGround.wrapS = textGround.wrapT = THREE.RepeatWrapping;
    textGround.repeat.set(25, 25);
    textGround.anisotropy = 16;

    let materialGround = new THREE.MeshStandardMaterial({ map: textGround });

    let ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), materialGround);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y -= 6;
    ground.receiveShadow = true;
    scene.add(ground);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', makeMove);
    document.addEventListener('mouseup', clickOn);
    document.addEventListener('mousedown', ClickOff);

    window.addEventListener('resize', onWindowResize);
}

let nossaAnimacao = function () {

    let delta = clock.getDelta();

    if (loadFinished) {
        mixer.update(delta);

        let isWalking = false;
        let isTurning = false;

        // W
        if (keyState[87]) {
            objects["pug"].translateZ(moveSpeed * delta);
            isWalking = true;
        }
        // S
        if (keyState[83]) {
            objects["pug"].translateZ(-moveSpeed * delta);
            isWalking = true;
        }
        // A
        if (keyState[65]) {
            objects["pug"].rotateY(turnSpeed * delta);
            isTurning = true;
        }
        // D
        if (keyState[68]) {
            objects["pug"].rotateY(-turnSpeed * delta);
            isTurning = true;
        }

        if (isWalking && activeAnimation !== animationActions[1]) {
            setAction(animationActions[1]); 
        } else if (!isWalking && !isTurning && activeAnimation !== animationActions[2]) {
            setAction(animationActions[2]); 
        }
    }

    renderer.render(scene, camera);
};

let click = false;
let mousePosition = { x: 0, y: 0, z: 0 };

let makeMove = function (e) {
    if (click) {
        let deltaX = mousePosition.x - e.offsetX;
        let eulerMat = new THREE.Euler(0, toRadians(deltaX) * 0.1, 0, "YXZ");
        let quater = new THREE.Quaternion().setFromEuler(eulerMat);
        camera.quaternion.multiplyQuaternions(quater, camera.quaternion);
    }
    mousePosition = { x: e.offsetX, y: e.offsetY };
};

let ClickOff = function () { click = true; };
let clickOn = function () { click = false; };

let toRadians = function (value) {
    return value * (Math.PI / 180);
};

let velOmbro = 0.01;
let velCotovelo = 0.01;

let onKeyDown = function (e) {

    keyState[e.keyCode] = true;

    if (e.keyCode === 187 && objects["ombro"]) { 
        objects["ombro"].scale.x += 0.01;
        objects["ombro"].scale.y += 0.01;
        objects["ombro"].scale.z += 0.01;
    }

    if (e.keyCode === 189 && objects["cubo1"]) { 
        objects["cubo1"].scale.x -= 0.01;
        objects["cubo1"].scale.y -= 0.01;
        objects["cubo1"].scale.z -= 0.01;
    }

    if (e.keyCode === 82 && objects["pivoOmbro"]) { 
        objects["pivoOmbro"].rotation.x -= velOmbro;
        if (objects["pivoOmbro"].rotation.x < -1.62 || objects["pivoOmbro"].rotation.x > 0.9)
            velOmbro *= -1;
    }

    if (e.keyCode === 32) { 
        velCubo = velCubo === 0 ? 0.001 : 0;
    }
};

let onKeyUp = function (e) {
    keyState[e.keyCode] = false;
};


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
