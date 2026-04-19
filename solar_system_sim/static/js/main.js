// static/js/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SOLAR_SYSTEM_DATA } from '/static/js/data.js';

// --- INITIALIZATION ---
let timeSpeed = 1;
let focusedPlanet = null;
let showVectors = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance boost for mobile
document.body.appendChild(renderer.domElement);

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.85);
composer.addPass(bloomPass);

// --- LIGHTING ---
const sunLight = new THREE.PointLight(0xffffff, 5000, 1500);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x222222));

// --- ASSET GENERATION ---
const planetMeshes = [];

// Sun
const sun = new THREE.Mesh(
    new THREE.SphereGeometry(SOLAR_SYSTEM_DATA.Sun.size, 64, 64),
    new THREE.MeshBasicMaterial({ color: SOLAR_SYSTEM_DATA.Sun.color })
);
scene.add(sun);

// Generate Planets from Data.js
const navGrid = document.getElementById('planetNav');

Object.entries(SOLAR_SYSTEM_DATA).forEach(([name, data]) => {
    // Create UI Button (Mobile Friendly)
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.innerHTML = `<span>${name}</span>`;
    btn.onclick = () => focusPlanet(name);
    if (navGrid) navGrid.appendChild(btn);

    if (name === "Sun") return;

    // 3D Planet Group
    const group = new THREE.Group();
    
    // Body
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.size, 32, 32),
        new THREE.MeshStandardMaterial({ 
            color: data.color, 
            roughness: 0.8,
            emissive: data.color,
            emissiveIntensity: 0.1 
        })
    );
    group.add(mesh);

    // Orbit Ring
    const orbitGeo = new THREE.RingGeometry(data.dist - 0.2, data.dist + 0.2, 128);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const orbit = new THREE.Mesh(orbitGeo, orbitMat);
    orbit.rotation.x = Math.PI / 2;
    scene.add(orbit);

    // Physics Vectors (Velocity Arrow)
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), data.size * 2, 0x00f2ff);
    velArrow.visible = false;
    group.add(velArrow);

    scene.add(group);
    planetMeshes.push({ name, group, mesh, data, velArrow, angle: Math.random() * Math.PI * 2 });
});

// --- STARFIELD ---
const starPos = [];
for(let i=0; i<5000; i++) starPos.push((Math.random()-0.5)*3000, (Math.random()-0.5)*3000, (Math.random()-0.5)*3000);
const starGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 })));

// --- CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 1000;
camera.position.set(0, 250, 500);

// --- INTERACTION LOGIC ---
function focusPlanet(name) {
    const data = SOLAR_SYSTEM_DATA[name];
    document.getElementById('tel-name').innerText = name;
    document.getElementById('tel-fact').innerText = data.fact;
    document.getElementById('tel-grav').innerText = data.gravity + " m/s²";
    document.getElementById('tel-vel').innerText = (data.velocity || "0") + " km/s";

    if (name === "Sun") {
        focusedPlanet = null;
    } else {
        focusedPlanet = planetMeshes.find(p => p.name === name);
    }
    
    // Auto-close menu on mobile after selection
    if (window.innerWidth < 768) toggleMenu();
}

// Global UI Hook
window.ui = {
    toggleVector: () => {
        showVectors = !showVectors;
        planetMeshes.forEach(p => p.velArrow.visible = showVectors);
    },
    toggleOrbits: () => {
        scene.children.forEach(c => {
            if (c.geometry?.type === "RingGeometry") c.visible = !c.visible;
        });
    }
};

window.focusPlanet = focusPlanet; // Exposed for HTML onclick

// --- ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    const delta = 0.1 * timeSpeed;
    
    planetMeshes.forEach(p => {
        p.angle += p.data.speed * delta;
        p.group.position.set(Math.cos(p.angle) * p.data.dist, 0, Math.sin(p.angle) * p.data.dist);
        p.mesh.rotation.y += 0.01;

        if (showVectors) {
            const dir = new THREE.Vector3(-Math.sin(p.angle), 0, Math.cos(p.angle));
            p.velArrow.setDirection(dir);
        }
    });

    if (focusedPlanet) {
        controls.target.lerp(focusedPlanet.group.position, 0.1);
    } else {
        controls.target.lerp(new THREE.Vector3(0,0,0), 0.1);
    }

    controls.update();
    composer.render();
}

// --- INITIALIZE & ERROR HANDLING ---
try {
    animate();
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => document.getElementById('loader').style.display = 'none', 500);
    }, 1500);
} catch (e) {
    console.error("System crash:", e);
    document.getElementById('loader').innerHTML = "<h1>Hardware Not Supported</h1>";
}

// --- RESPONSIVENESS ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('timeSlider').oninput = (e) => {
    timeSpeed = e.target.value;
    document.getElementById('timeVal').innerText = timeSpeed + "x";
};