import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── Configuration ──────────────────────────────────────────────────────
const PARTICLE_COUNT = 15000;
const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 128;

// ─── State ──────────────────────────────────────────────────────────────
const state = {
  currentShapeType: 'galaxy',
  isExploded: true, // Initial state: dispersed
  color: new THREE.Color(0x00ffff),
  expansion: 1.0,
  targetExpansion: 1.0,
  rotationVelocity: 0,
  handPresent: false,
  gesture: 'None',
  // Idle tracking
  lastHandSeenTime: 0,
  idleDisperseTriggered: false,
  idleTimeoutMs: 2500 // 2.5 seconds
};

// ─── DOM Elements ───────────────────────────────────────────────────────
const videoElement = document.getElementById('input-video');
const cameraStatus = document.getElementById('camera-status');
const gestureIndicator = document.getElementById('gesture-indicator');
const gestureIcon = document.getElementById('gesture-icon');
const gestureText = document.getElementById('gesture-text');
const cameraContainer = document.getElementById('camera-container');

// ─── Three.js Scene ─────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.015);

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.z = 30;

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#canvas'),
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

// ─── Particle Texture ───────────────────────────────────────────────────
function createParticleTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.Texture(c);
  texture.needsUpdate = true;
  return texture;
}

// ─── Particle System ────────────────────────────────────────────────────
class ParticleSystem {
  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.targetPositions = new Float32Array(PARTICLE_COUNT * 3);

    // Initial State: Dispersed
    this.disperse();
    this.positions.set(this.targetPositions);

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );

    this.material = new THREE.PointsMaterial({
      color: state.color,
      size: 0.3,
      map: createParticleTexture(),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    scene.add(this.mesh);
  }

  update() {
    const positions = this.geometry.attributes.position.array;
    const speed = 0.06; // Morph speed

    // Smoothly interpolate expansion
    state.expansion += (state.targetExpansion - state.expansion) * 0.08;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      positions[ix] += (this.targetPositions[ix] - positions[ix]) * speed;
      positions[ix + 1] += (this.targetPositions[ix + 1] - positions[ix + 1]) * speed;
      positions[ix + 2] += (this.targetPositions[ix + 2] - positions[ix + 2]) * speed;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.mesh.scale.setScalar(state.expansion);
    this.material.color.lerp(state.color, 0.08);

    // Gestural Rotation (Pointing)
    if (state.gesture === 'Pointing') {
      this.mesh.rotation.y += state.rotationVelocity;
      controls.autoRotate = false;
    } else {
      // Inertia / Auto rotate
      this.mesh.rotation.y += 0.001;
      controls.autoRotate = true;
    }
  }

  disperse() {
    // Scatter randomly
    const arr = this.targetPositions;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    state.isExploded = true;
  }

  setShape(type) {
    state.currentShapeType = type;
    state.isExploded = false;
    switch (type) {
      case 'galaxy': this.generateGalaxy(); break;
      case 'heart': this.generateHeart(); break;
      case 'saturn': this.generateSaturn(); break;
      case 'flower': this.generateFlower(); break;
      case 'love': this.generateText('I Love You'); break;
    }
  }

  // --- Shape Generators (Same as before) ---
  generateGalaxy() {
    const arr = this.targetPositions;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const arm = i % 3;
      const armAngle = (arm * Math.PI * 2) / 3;
      const r = Math.random() * 10;
      const spin = r * 0.5;
      const x = Math.cos(spin + armAngle) * r;
      const y = Math.sin(spin + armAngle) * r;
      const z = (Math.random() - 0.5) * 2;
      arr[i3] = x + (Math.random() - 0.5);
      arr[i3 + 1] = y + (Math.random() - 0.5);
      arr[i3 + 2] = z + (Math.random() - 0.5);
    }
  }

  generateHeart() {
    const arr = this.targetPositions;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const t = Math.random() * 2 * Math.PI;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const z = (Math.random() - 0.5) * 4;
      arr[i3] = x * 0.5;
      arr[i3 + 1] = y * 0.5;
      arr[i3 + 2] = z;
    }
  }

  generateSaturn() {
    const arr = this.targetPositions;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      if (Math.random() > 0.4) {
        const angle = Math.random() * Math.PI * 2;
        const rad = 8 + Math.random() * 4;
        const x = Math.cos(angle) * rad;
        let y = (Math.random() - 0.5) * 0.2;
        let z = Math.sin(angle) * rad;
        const tilt = Math.PI / 6;
        arr[i3] = x;
        arr[i3 + 1] = y * Math.cos(tilt) - z * Math.sin(tilt);
        arr[i3 + 2] = y * Math.sin(tilt) + z * Math.cos(tilt);
      } else {
        const radius = 5;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        arr[i3] = radius * Math.sin(phi) * Math.cos(theta);
        arr[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        arr[i3 + 2] = radius * Math.cos(phi);
      }
    }
  }

  generateFlower() {
    const arr = this.targetPositions;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const k = 4;
      const theta = Math.random() * Math.PI * 2;
      const rBase = Math.cos(k * theta);
      const r = Math.abs(rBase) * 8 + 1;
      const phi = (Math.random() - 0.5) * Math.PI;
      arr[i3] = r * Math.cos(theta) * Math.cos(phi * 0.5);
      arr[i3 + 1] = r * Math.sin(theta) * Math.cos(phi * 0.5);
      arr[i3 + 2] = r * Math.sin(phi * 0.5);
    }
  }

  generateText(text) {
    const c = document.createElement('canvas');
    c.width = CANVAS_WIDTH;
    c.height = CANVAS_HEIGHT;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    const data = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
    const validPixels = [];
    for (let py = 0; py < CANVAS_HEIGHT; py += 2) {
      for (let px = 0; px < CANVAS_WIDTH; px += 2) {
        if (data[(py * CANVAS_WIDTH + px) * 4] > 128) { validPixels.push({ x: px, y: py }); }
      }
    }
    if (validPixels.length === 0) return;
    const arr = this.targetPositions;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const p = validPixels[Math.floor(Math.random() * validPixels.length)];
      arr[i3] = (p.x / CANVAS_WIDTH - 0.5) * 30;
      arr[i3 + 1] = -(p.y / CANVAS_HEIGHT - 0.5) * 15;
      arr[i3 + 2] = (Math.random() - 0.5) * 2;
    }
  }
}

const particles = new ParticleSystem();

// ─── UI Interaction (Shapes) ──────────────────────────────────────────────
document.querySelectorAll('.shape-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    particles.setShape(e.currentTarget.dataset.shape);
  });
});

const colorPicker = document.getElementById('color-picker');
const colorHex = document.getElementById('color-hex');
colorPicker.addEventListener('input', (e) => {
  state.color.set(e.target.value);
  colorHex.textContent = e.target.value.toUpperCase();
});

document.getElementById('fullscreen-btn').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Hand Detection & Gestures ──────────────────────────────────────────
let prevHandX = null;

function onHandResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    state.handPresent = true;
    state.lastHandSeenTime = performance.now(); // Reset idle timer
    state.idleDisperseTriggered = false;
    cameraContainer.classList.add('hand-active');
    const landmarks = results.multiHandLandmarks[0];

    // --- Gesture Recognition ---
    const wrist = landmarks[0];

    // Check finger extensions (Tip further from wrist than PIP)
    // 8: Index, 12: Middle, 16: Ring, 20: Pinky
    const isExtended = (tipIdx, pipIdx) => {
      const dTip = Math.sqrt((landmarks[tipIdx].x - wrist.x) ** 2 + (landmarks[tipIdx].y - wrist.y) ** 2);
      const dPip = Math.sqrt((landmarks[pipIdx].x - wrist.x) ** 2 + (landmarks[pipIdx].y - wrist.y) ** 2);
      return dTip > dPip * 1.1; // 10% tolerance
    };

    const indexUp = isExtended(8, 6);
    const middleUp = isExtended(12, 10);
    const ringUp = isExtended(16, 14);
    const pinkyUp = isExtended(20, 18);

    // Thumb is tricky, use Angle or X-dist. Simplify: Index is reference.

    // 1. V-Sign: Index & Middle UP, Ring & Pinky DOWN
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
      state.gesture = 'VSign';
      gestureIcon.textContent = '✌️';
      gestureText.textContent = 'Gathering...';

      // Trigger Gathering
      if (state.isExploded) {
        particles.setShape(state.currentShapeType); // Pull together
      }
    }
    // 2. Pointing: Index UP, Others DOWN
    else if (indexUp && !middleUp && !ringUp && !pinkyUp) {
      state.gesture = 'Pointing';
      gestureIcon.textContent = '👆';
      gestureText.textContent = 'Rotating';

      // Rotation Control
      const currX = landmarks[8].x; // Index tip X
      if (prevHandX !== null) {
        const delta = currX - prevHandX;
        // Move Left (screen X decreases) -> Rotate Left (Y decreases?)
        // Sensitivity
        state.rotationVelocity = delta * 15; // Speed multiplier
      }
      prevHandX = currX;
    }
    // 3. Four Fingers: All 4 UP (Zoom)
    else if (indexUp && middleUp && ringUp && pinkyUp) {
      state.gesture = 'FourFingers';
      gestureIcon.textContent = '🖐️';
      gestureText.textContent = 'Zooming';

      prevHandX = null; // Reset rotation tracking

      // Zoom Control via Hand Distance (Scale)
      // Distance from Wrist (0) to Middle MCP (9) is stable reference for hand size
      const handSize = Math.sqrt(
        (landmarks[0].x - landmarks[9].x) ** 2 +
        (landmarks[0].y - landmarks[9].y) ** 2
      );

      // Map 0.1 (far) -> 0.3 (close) to expansion 
      // Logic: Closer to camera = Larger handSize = Zoom IN (Expansion UP)
      // Far from camera = Smaller handSize = Zoom OUT

      // handSize varies approx 0.05 to 0.25
      const zoom = Math.max(0.2, Math.min(2.5, (handSize - 0.05) * 8));
      state.targetExpansion = zoom;
    }
    else {
      state.gesture = 'None';
      gestureIcon.textContent = '✋';
      gestureText.textContent = 'Hand Detected';
      prevHandX = null;
    }
    gestureIndicator.classList.add('detected');

  } else {
    state.handPresent = false;
    state.gesture = 'None';
    prevHandX = null;
    gestureIndicator.classList.remove('detected');
    cameraContainer.classList.remove('hand-active');
  }
}

// ─── Initialize MediaPipe & Camera (Robust Loading) ─────────────────────
// ... (Logic kept SAME as previous fix) ...
async function initHandTracking() {
  cameraStatus.textContent = 'Loading model...';

  if (!window.Hands) {
    console.error('[Hand Tracking] window.Hands not found.');
    cameraStatus.textContent = 'Script load failed';
    return;
  }

  const hands = new window.Hands({
    locateFile: (file) => `/mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  hands.onResults(onHandResults);

  try {
    const initPromise = hands.initialize();
    const timeoutPromise = new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), 10000));
    await Promise.race([initPromise, timeoutPromise]);
    cameraStatus.textContent = 'Camera active';
  } catch (err) {
    console.error('Model init failed', err);
    cameraStatus.textContent = 'Model error';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
    videoElement.srcObject = stream;
    await videoElement.play();

    // Loop
    const processFrame = async () => {
      if (videoElement.readyState >= 2) {
        try { await hands.send({ image: videoElement }); } catch (e) { }
      }
      setTimeout(processFrame, 50);
    };
    processFrame();

  } catch (err) {
    cameraStatus.textContent = 'Camera denied';
  }
}

// ─── Idle Detection ─────────────────────────────────────────────────────
function checkIdle() {
  if (!state.handPresent && !state.idleDisperseTriggered && !state.isExploded) {
    const elapsed = performance.now() - state.lastHandSeenTime;
    if (elapsed > state.idleTimeoutMs) {
      // Smoothly disperse after timeout
      state.idleDisperseTriggered = true;
      particles.disperse();
      gestureIcon.textContent = '💫';
      gestureText.textContent = 'Dispersing...';
    }
  }
}

// ─── Main Loop ──────────────────────────────────────────────────────────
function tick() {
  controls.update();
  checkIdle();
  particles.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
setTimeout(initHandTracking, 500);
