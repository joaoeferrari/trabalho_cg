import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'; 

let camera, scene, renderer;
let objects = [];
let mixer; 
let npcMixers = []; 
let radarObject = null;
let listaMetros = []; 

let tremAtual = null;

let walkAction, danceAction, idleAction, acaoAtual;
let loadFinished = false;
let clock = new THREE.Clock();
let keyState = {};     
let moveSpeed = 25; 
let turnSpeed = 2.0;
let playerContainer;
let modeloPersonagem;
let isDancingMode = false; 

const MAP_SIZE = 300; 
const TRILHO_Z_MIN = -100;
const TRILHO_Z_MAX = -60;
const TRILHO_X_MIN = 40;   
const TRILHO_X_MAX = 80;
const TRILHO_COMPRIMENTO = 4000; 
const LIMITE_RESET = 2000; 

export function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa04b36); 
    scene.fog = new THREE.Fog(0xa04b36, 50, 350); 

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
    // Câmera ajustada para acompanhar a nova posição inicial
    camera.position.set(0, 15, 10); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    criaIluminacaoMarte();
    criaChao();
    criaSistemaMetroCruzado(); 
    loadAssets(); 
    createGui();

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);

    renderer.setAnimationLoop(renderLoop);
}

let criaIluminacaoMarte = function () {
    const ambientLight = new THREE.AmbientLight(0xffaaaa, 0.3);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(50, 150, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096; 
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.left = -300;
    sunLight.shadow.camera.right = 300;
    sunLight.shadow.camera.top = 300;
    sunLight.shadow.camera.bottom = -300;
    scene.add(sunLight);

    const baseLight = new THREE.PointLight(0x00ffff, 10, 100);
    baseLight.position.set(0, 20, 0);
    scene.add(baseLight);
};

let criaChao = function () {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('assets/marte/marte_solo.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40); 
    
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, metalness: 0.1 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);
};

let criaSistemaMetroCruzado = function() {
    const objLoader = new OBJLoader();
    
    const linhas = [
        { eixo: 'z', pos: -70, direcao: 1, cor: 0xcccccc }, 
        { eixo: 'z', pos: -90, direcao: -1, cor: 0x888888 },
        { eixo: 'x', pos: 50, direcao: 1, cor: 0xffaa00 }, 
        { eixo: 'x', pos: 70, direcao: -1, cor: 0x333333 } 
    ];

    const trilhoMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const dormenteMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    linhas.forEach(linha => {
        let trilhoGeom, dormenteGeom;
        
        if (linha.eixo === 'z') {
            trilhoGeom = new THREE.BoxGeometry(1, 0.5, TRILHO_COMPRIMENTO);
            dormenteGeom = new THREE.BoxGeometry(6, 0.2, 1.5);
            let t1 = new THREE.Mesh(trilhoGeom, trilhoMat); t1.position.set(linha.pos - 1.5, 0.2, 0); scene.add(t1);
            let t2 = new THREE.Mesh(trilhoGeom, trilhoMat); t2.position.set(linha.pos + 1.5, 0.2, 0); scene.add(t2);
            for(let k = -TRILHO_COMPRIMENTO/2; k < TRILHO_COMPRIMENTO/2; k += 20) { 
                let d = new THREE.Mesh(dormenteGeom, dormenteMat); d.position.set(linha.pos, 0.1, k); scene.add(d);
            }
        } else {
            trilhoGeom = new THREE.BoxGeometry(TRILHO_COMPRIMENTO, 0.5, 1);
            dormenteGeom = new THREE.BoxGeometry(1.5, 0.2, 6); 
            let t1 = new THREE.Mesh(trilhoGeom, trilhoMat); t1.position.set(0, 0.2, linha.pos - 1.5); scene.add(t1);
            let t2 = new THREE.Mesh(trilhoGeom, trilhoMat); t2.position.set(0, 0.2, linha.pos + 1.5); scene.add(t2);
            for(let k = -TRILHO_COMPRIMENTO/2; k < TRILHO_COMPRIMENTO/2; k += 20) {
                let d = new THREE.Mesh(dormenteGeom, dormenteMat); d.position.set(k, 0.1, linha.pos); scene.add(d);
            }
        }

        objLoader.load('assets/marte/metro.obj', function(modeloOriginal) {
            configuraMaterial(modeloOriginal, linha.cor);
            for (let i = 0; i < 4; i++) { 
                let trem = modeloOriginal.clone();
                let offset = -1000 + (i * 600); 
                trem.scale.set(6, 6, 6);
                if (linha.eixo === 'z') {
                    trem.position.set(linha.pos, 0.8, offset);
                    trem.rotation.y = (linha.direcao === -1) ? Math.PI : 0;
                } else {
                    trem.position.set(offset, 0.8, linha.pos);
                    trem.rotation.y = (linha.direcao === 1) ? Math.PI / 2 : -Math.PI / 2;
                }
                scene.add(trem);
                listaMetros.push({ 
                    mesh: trem, 
                    speed: 20 * linha.direcao, 
                    eixo: linha.eixo,
                    parado: false,
                    chamado: false
                }); 
            }
        }, undefined, function() {});
    });
};

let loadAssets = function () {
    const objLoader = new OBJLoader();
    const fbxLoader = new FBXLoader();

    let modeloBase = null;
    let modeloNPC = null;
    let clipNPCAnim = null;
    let modeloCaixa = null;
    let modeloRover = null;
    let modeloBarril = null;

    // carregamento
    objLoader.load('assets/marte/base_marte.obj', function (obj) { configuraMaterial(obj, 0x888888); modeloBase = obj; check(); });
    objLoader.load('assets/marte/caixa.obj', function (obj) { configuraMaterial(obj, 0xffa500); modeloCaixa = obj; check(); }, undefined, function() { modeloCaixa = "erro"; check(); });
    objLoader.load('assets/marte/rover.obj', function (obj) { configuraMaterial(obj, 0x555555); modeloRover = obj; check(); }, undefined, function() { modeloRover = "erro"; check(); });
    objLoader.load('assets/marte/barrel.obj', function (obj) { configuraMaterial(obj, 0xaaaaaa); modeloBarril = obj; check(); }, undefined, function() { modeloBarril = "erro"; check(); });
    
    fbxLoader.load('assets/marte/npc.fbx', function (fbx) {
        modeloNPC = fbx;
        modeloNPC.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }});
        fbxLoader.load('assets/marte/npc_idle.fbx', function (anim) { if (anim.animations.length > 0) clipNPCAnim = anim.animations[0]; check(); });
    }, undefined, function() { modeloNPC = "erro"; check(); });

    // rochas / montanhas
    objLoader.load('assets/marte/rocha.obj', function (obj) {
        configuraMaterial(obj, 0x8b5a2b);
        
        // rochas
        let rochasCriadas = 0;
        while(rochasCriadas < 300) { 
            let rx = (Math.random()*600)-300;
            let rz = (Math.random()*600)-300;
            
            let noHangar = Math.sqrt(rx*rx + rz*rz) < 30;
            let noTrilhoZ = (rx > TRILHO_Z_MIN - 10 && rx < TRILHO_Z_MAX + 10);
            let noTrilhoX = (rz > TRILHO_X_MIN - 10 && rz < TRILHO_X_MAX + 10);

            if (!noHangar && !noTrilhoZ && !noTrilhoX) {
                let r = obj.clone();
                r.position.set(rx, 0, rz);
                r.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                let s = Math.random()*4 + 0.5; 
                r.scale.set(s,s,s);
                scene.add(r);
                rochasCriadas++;
            }
        }

        // montanhas
        for(let k=0; k<25; k++) {
            let montanha = obj.clone();
            let angulo = Math.random() * Math.PI * 2;
            let distancia = 300 + Math.random() * 50; 
            
            montanha.position.set(Math.cos(angulo)*distancia, -15, Math.sin(angulo)*distancia);
            let escalaMontanha = 60 + Math.random() * 30; 
            montanha.scale.set(escalaMontanha, escalaMontanha, escalaMontanha);
            montanha.traverse(c => { if(c.isMesh) c.material = new THREE.MeshStandardMaterial({ color: 0x5a3020, roughness: 1.0 }); });
            scene.add(montanha);
        }

    }, undefined, function() { console.warn("rocha.obj não encontrado."); });

    // nave / radar / hangar
    objLoader.load('assets/marte/nave.obj', function(obj) {
        configuraMaterial(obj, 0xdddddd);
        obj.position.set(40, 0, -40); 
        obj.scale.set(20, 20, 20); obj.rotation.y = -Math.PI/4;
        scene.add(obj);
    }, undefined, function() {});

    objLoader.load('assets/marte/radar.obj', function(obj) {
        configuraMaterial(obj, 0x555555);
        obj.position.set(-40, 0, 40); obj.scale.set(10, 10, 10);
        scene.add(obj);
        radarObject = obj;
    }, undefined, function() {});

    objLoader.load('assets/marte/hangar.obj', function(obj) {
        configuraMaterial(obj, 0xeeeeee);
        obj.position.set(0, 0, 0); obj.scale.set(8, 8, 8); 
        scene.add(obj);
    }, undefined, function() { console.warn("hangar.obj não encontrado."); });

    function check() {
        if (modeloBase && modeloNPC && clipNPCAnim) {
            criaColonia(modeloBase, modeloNPC, clipNPCAnim, modeloCaixa, modeloRover, modeloBarril);
        } else if (modeloBase && modeloNPC === "erro") {
            criaColonia(modeloBase, null, null, modeloCaixa, modeloRover, modeloBarril);
        }
    }

    carregaJogadorPrincipal(fbxLoader);
};

function configuraMaterial(obj, colorHex) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.5 });
    obj.traverse(c => { if (c.isMesh) { c.material = mat; c.castShadow = true; c.receiveShadow = true; }});
}

function criaColonia(objBase, objNPC, animNPC, objCaixa, objRover, objBarril) {
    const geomSiloAlt = new THREE.CylinderGeometry(2, 2, 8, 16);
    const matSiloAlt = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const geomCaixaAlt = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const matCaixaAlt = new THREE.MeshStandardMaterial({ color: 0xffa500 });
    const geomPoste = new THREE.CylinderGeometry(0.1, 0.1, 6, 8);
    const matPoste = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const geomLuz = new THREE.SphereGeometry(0.3);
    const matLuz = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 2 });

    const distritos = [
        { x: 0, z: 0, qtd: 5, raio: 40 },       
        { x: -30, z: -160, qtd: 5, raio: 30 },  
        { x: -30, z: 160, qtd: 5, raio: 30 },   
        { x: 160, z: 30, qtd: 5, raio: 30 },    
        { x: -160, z: 30, qtd: 5, raio: 30 }    
    ];

    distritos.forEach(distrito => {
        for (let i = 0; i < distrito.qtd; i++) {
            let baseX, baseZ, rotY;
            let posValida = false;
            let tentativas = 0;
            
            while (!posValida && tentativas < 200) {
                baseX = distrito.x + (Math.random() * distrito.raio * 2) - distrito.raio;
                baseZ = distrito.z + (Math.random() * distrito.raio * 2) - distrito.raio;
                
                let noHangar = Math.sqrt(baseX*baseX + baseZ*baseZ) > 40; 
                let noTrilhoZ = (baseX > TRILHO_Z_MIN - 15 && baseX < TRILHO_Z_MAX + 15); 
                let noTrilhoX = (baseZ > TRILHO_X_MIN - 15 && baseZ < TRILHO_X_MAX + 15);

                if (noHangar && !noTrilhoZ && !noTrilhoX) { posValida = true; }
                tentativas++;
            }

            if (!posValida) continue; 
            rotY = Math.random() * Math.PI * 2;

            let baseClone = objBase.clone();
            baseClone.position.set(baseX, 0, baseZ);
            baseClone.rotation.y = rotY;
            baseClone.scale.set(5, 5, 5);
            scene.add(baseClone);

            if (objBarril && objBarril !== "erro") {
                let barrilClone = objBarril.clone();
                barrilClone.position.set(baseX + 8, 0, baseZ + 8); 
                barrilClone.scale.set(4, 4, 4); scene.add(barrilClone);
            } else {
                let silo = new THREE.Mesh(geomSiloAlt, matSiloAlt);
                silo.position.set(baseX + 8, 4, baseZ + 8);
                silo.castShadow = true; scene.add(silo);
            }

            if (objRover && objRover !== "erro") {
                let roverClone = objRover.clone();
                roverClone.position.set(baseX - 8, 0, baseZ + 8);
                roverClone.rotation.y = rotY + Math.PI;
                roverClone.scale.set(3, 3, 3); scene.add(roverClone);
            }

            for(let j=0; j<4; j++) {
                let caixa;
                if (objCaixa && objCaixa !== "erro") {
                    caixa = objCaixa.clone(); caixa.scale.set(3, 3, 3);
                } else {
                    caixa = new THREE.Mesh(geomCaixaAlt, matCaixaAlt);
                }
                caixa.position.set(baseX + (Math.random()*16 - 8), (objCaixa ? 0 : 0.75), baseZ + (Math.random()*16 - 8));
                caixa.rotation.y = Math.random(); scene.add(caixa);
            }

            for(let k=0; k<2; k++) {
                let poste = new THREE.Mesh(geomPoste, matPoste);
                let lampada = new THREE.Mesh(geomLuz, matLuz);
                let pX = baseX + (Math.random()*12 - 6);
                let pZ = baseZ + (Math.random()*12 - 6);
                poste.position.set(pX, 3, pZ); lampada.position.set(0, 3, 0); 
                poste.add(lampada);
                let pointLight = new THREE.PointLight(0x00ff00, 2, 10);
                pointLight.position.set(0, 2.5, 0);
                poste.add(pointLight); scene.add(poste);
            }

            if (objNPC && animNPC) {
                // dois guardas por base
                for(let g=0; g<2; g++) {
                    let npcClone = SkeletonUtils.clone(objNPC);
                    npcClone.scale.set(0.02, 0.02, 0.02);
                    npcClone.position.set(baseX + 12 + (g*3), 0, baseZ + 12);
                    npcClone.rotation.y = Math.random() * Math.PI * 2;
                    scene.add(npcClone);

                    let mixerNPC = new THREE.AnimationMixer(npcClone);
                    let action = mixerNPC.clipAction(animNPC);
                    action.startAt(Math.random()).play();
                    npcMixers.push(mixerNPC); 
                }
            }
        }
    });

    if (objNPC && animNPC) {
        for(let n=0; n<5; n++) {
            let npc = SkeletonUtils.clone(objNPC);
            npc.scale.set(0.02, 0.02, 0.02);
            // Em volta do ponto 0,0 (Hangar)
            npc.position.set(Math.random()*20 - 10, 0, Math.random()*20 - 10); 
            npc.rotation.y = Math.random() * Math.PI * 2;
            scene.add(npc);

            let mixerNPC = new THREE.AnimationMixer(npc);
            let action = mixerNPC.clipAction(animNPC);
            action.startAt(Math.random()).play();
            npcMixers.push(mixerNPC); 
        }
    }

    objects['base'] = objBase; 
}

function carregaJogadorPrincipal(fbxLoader) {
    fbxLoader.load('assets/marte/personagem.fbx', function (fbx) {
        modeloPersonagem = fbx;
        modeloPersonagem.scale.set(0.02, 0.02, 0.02);
        modeloPersonagem.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }});
        playerContainer = new THREE.Group();
        playerContainer.add(modeloPersonagem);
        
        // posicao inicial
        playerContainer.position.set(0, 0, 50); 

        scene.add(playerContainer);

        mixer = new THREE.AnimationMixer(modeloPersonagem);

        fbxLoader.load('assets/marte/anim_walk.fbx', function (anim) {
            if (anim.animations.length > 0) { walkAction = mixer.clipAction(anim.animations[0]); }
        });
        fbxLoader.load('assets/marte/anim_dance.fbx', function (anim) {
            if (anim.animations.length > 0) { danceAction = mixer.clipAction(anim.animations[0]); }
        });
        fbxLoader.load('assets/marte/anim_idle.fbx', function (anim) {
            if (anim.animations.length > 0) { 
                idleAction = mixer.clipAction(anim.animations[0]); 
                acaoAtual = idleAction;
                acaoAtual.play();
            }
            loadFinished = true;
        });
    });
}

let trocaAcao = function(novaAcao) {
    if (acaoAtual === novaAcao) return;
    if (acaoAtual) acaoAtual.fadeOut(0.2);
    if (novaAcao) { novaAcao.reset().fadeIn(0.2).play(); acaoAtual = novaAcao; }
};

let renderLoop = function () {
    let delta = clock.getDelta();
    if (loadFinished) {
        if (mixer) mixer.update(delta);
        npcMixers.forEach(m => m.update(delta));
        if (radarObject) radarObject.rotation.y += delta * 0.5;

        listaMetros.forEach(trem => {
            if (!trem.parado) {
                if (trem.eixo === 'z') {
                    trem.mesh.position.z += trem.speed * delta;
                    if (trem.mesh.position.z > LIMITE_RESET) trem.mesh.position.z = -LIMITE_RESET;
                    if (trem.mesh.position.z < -LIMITE_RESET) trem.mesh.position.z = LIMITE_RESET;
                } else {
                    trem.mesh.position.x += trem.speed * delta;
                    if (trem.mesh.position.x > LIMITE_RESET) trem.mesh.position.x = -LIMITE_RESET;
                    if (trem.mesh.position.x < -LIMITE_RESET) trem.mesh.position.x = LIMITE_RESET;
                }
            }

            if (trem.chamado) {
                let dist = 9999;
                if (trem.eixo === 'z') dist = Math.abs(trem.mesh.position.z - playerContainer.position.z);
                else dist = Math.abs(trem.mesh.position.x - playerContainer.position.x);

                if (dist < 3) {
                    trem.parado = true;
                    trem.chamado = false; 
                }
            }
        });

        if (tremAtual) {
            playerContainer.position.copy(tremAtual.mesh.position);
            playerContainer.position.y += 4; 
        } 
        else {
            let isWalking = false;
            if (keyState[87]) { playerContainer.translateZ(moveSpeed * delta); isWalking = true; } 
            if (keyState[83]) { playerContainer.translateZ(-moveSpeed * delta); isWalking = true; } 
            if (keyState[65]) { playerContainer.rotateY(turnSpeed * delta); } 
            if (keyState[68]) { playerContainer.rotateY(-turnSpeed * delta); } 

            if (isWalking) isDancingMode = false;
            if (isWalking) trocaAcao(walkAction);
            else if (isDancingMode) trocaAcao(danceAction);
            else trocaAcao(idleAction);
        }

        const relativeCameraOffset = new THREE.Vector3(0, 5, -10);
        const cameraOffset = relativeCameraOffset.applyMatrix4(playerContainer.matrixWorld);
        camera.position.lerp(cameraOffset, 0.1);
        camera.lookAt(playerContainer.position.clone().add(new THREE.Vector3(0, 2, 0)));
    }
    renderer.render(scene, camera);
};

let onKeyDown = function (e) { 
    keyState[e.keyCode] = true; 
    
    if (e.keyCode === 66 && !e.repeat) isDancingMode = !isDancingMode;

    if (e.keyCode === 67 && !e.repeat) {
        let tremMaisProximo = null;
        let menorDist = 9999;

        listaMetros.forEach(trem => {
            let d = 9999;
            if (trem.eixo === 'z') d = Math.abs(trem.mesh.position.x - playerContainer.position.x);
            else d = Math.abs(trem.mesh.position.z - playerContainer.position.z);

            if (d < 15) {
                tremMaisProximo = trem;
            }
        });

        if (tremMaisProximo) {
            if (tremMaisProximo.parado) {
                tremMaisProximo.parado = false;
            } else {
                tremMaisProximo.chamado = true;
                let direcao = Math.sign(tremMaisProximo.speed);
                if (tremMaisProximo.eixo === 'z') {
                    tremMaisProximo.mesh.position.z = playerContainer.position.z - (direcao * 30);
                } else {
                    tremMaisProximo.mesh.position.x = playerContainer.position.x - (direcao * 30);
                }
            }
        }
    }

    if (e.keyCode === 69 && !e.repeat) {
        if (tremAtual) {
            playerContainer.translateZ(5);
            playerContainer.position.y = 0; 
            tremAtual = null;
        } else {
            let tremProximo = null;
            let menorDistancia = 10;
            listaMetros.forEach(trem => {
                let dist = playerContainer.position.distanceTo(trem.mesh.position);
                if (dist < menorDistancia) {
                    tremProximo = trem;
                    menorDistancia = dist;
                }
            });
            if (tremProximo) {
                tremAtual = tremProximo;
                isDancingMode = false; 
                trocaAcao(idleAction); 
            }
        }
    }
};

let onKeyUp = function (e) { keyState[e.keyCode] = false; };
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let createGui = function () {
    const gui = new GUI();
    const params = { baseScale: 5, charScale: 0.02 };
    gui.add(params, 'baseScale', 0.1, 20).onChange(val => { if (objects['base']) objects['base'].scale.set(val, val, val); });
    gui.add(params, 'charScale', 0.001, 0.1).step(0.001).onChange(val => { if (modeloPersonagem) modeloPersonagem.scale.set(val, val, val); });
};