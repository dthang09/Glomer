// js/main.js
// ══════════════════════════════════════════════════════════
//  Glomer Palace Museum — Three.js Entry Point
// ══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

import { initFirebase, loadAllExhibits, subscribeToExhibits } from './firebase-db.js';
import { buildExterior, exteriorClickables } from './palace.js';
import { buildInterior, ROOM_DATA, ROOM_TELEPORTS, detectRoom, doorClickables, DOORWAYS } from './museum.js';
import { generateSlots, buildExhibitsFull, exhibitMeshes, exhibitMap, updateExhibitImage, setHoverGlow } from './exhibits.js';
import { initFlipCard, showFlipCard, hideFlipCard } from './flipcard.js';
import {
    setRoomLabel, showTooltip, hideTooltip, setActiveRoomBtn,
    setLoadingProgress, hideLoading, showEnterPrompt, hideEnterPrompt,
    showHUD, hideHUD
} from './ui.js';

// ─── Renderer ────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(window.devicePixelRatio);  // full native resolution
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

// ─── Scenes ───────────────────────────────────────────────
const extScene = new THREE.Scene();
const intScene = new THREE.Scene();
intScene.fog = new THREE.FogExp2(0x0A0618, 0.018);

// ─── Cameras ─────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);

// ─── State ───────────────────────────────────────────────
// 'exterior' | 'entering' | 'interior' | 'card_open'
let STATE = 'exterior';
let currentRoomId = 'grand_hall';

// ─── Controls (interior first-person) ────────────────────
const controls = new PointerLockControls(camera, document.body);
const keys = { w: false, a: false, s: false, d: false };
const SPEED = 6.0;
const PLAYER_HEIGHT = 1.7;

// Raycaster (short-range: exhibits only)
const raycaster = new THREE.Raycaster();
raycaster.far = 8.0;
const mouse2D = new THREE.Vector2(0, 0); // always screen center

// Door raycaster (long-range — no far limit effectively)
const doorRaycaster = new THREE.Raycaster();
doorRaycaster.far = 22.0;

// Exterior raycaster (uses actual mouse position)
const extRaycaster = new THREE.Raycaster();
const extMouseNorm = new THREE.Vector2(0, 0);

// ─── Initialize ──────────────────────────────────────────
async function init() {
    // Firebase
    initFirebase();

    // Build exterior
    buildExterior(extScene);

    // Build interior
    buildInterior(intScene);
    // Hide room nav buttons — rooms connected via clickable doors
    const roomNav = document.getElementById('room-nav');
    if (roomNav) roomNav.style.display = 'none';

    // Build exhibits
    const slots = generateSlots();
    buildExhibitsFull(intScene, slots);

    // Init flip card UI
    initFlipCard();

    // Set exterior camera
    setExteriorCamera();

    // Load progress simulation
    let prog = 0;
    const progInterval = setInterval(() => {
        prog = Math.min(prog + 8, 90);
        setLoadingProgress(prog);
    }, 80);

    // Load all exhibit data
    try {
        const allData = await loadAllExhibits();
        applyAllExhibitData(allData);
        // Subscribe to live updates
        subscribeToExhibits(applyAllExhibitData);
    } catch (e) { console.warn('[Glomer] Could not load exhibit data:', e); }

    clearInterval(progInterval);
    setLoadingProgress(100);
    setTimeout(() => {
        hideLoading(() => {
            // Show door hint briefly on first load
            showDoorHint(true);
            setTimeout(() => showDoorHint(false), 4500);
        });
    }, 400);

    // Setup events
    setupEvents();

    // Start render loop
    renderer.setAnimationLoop(render);
}

function setExteriorCamera() {
    camera.position.set(0, 5, 70);
    camera.lookAt(0, 18, 0);
    camera.fov = 62;
    camera.updateProjectionMatrix();
}

function applyAllExhibitData(dataMap) {
    Object.entries(dataMap).forEach(([slotId, data]) => {
        if (data.imageURL || data.imageDataURL) {
            updateExhibitImage(slotId, data.imageURL, data.imageDataURL);
        }
    });
}

// ─── Events ──────────────────────────────────────────────
function setupEvents() {
    // Enter button (fallback — hidden)
    const btnEnter = document.getElementById('btn-enter');
    if (btnEnter) btnEnter.addEventListener('click', enterPalace);

    // Exit interior
    document.getElementById('btn-exit-interior').addEventListener('click', exitInterior);

    // Room nav teleport
    document.querySelectorAll('.room-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const roomId = btn.dataset.room;
            teleportToRoom(roomId);
        });
    });

    // Keyboard
    document.addEventListener('keydown', e => {
        if (STATE !== 'interior') return;
        if (e.code === 'KeyW') keys.w = true;
        if (e.code === 'KeyA') keys.a = true;
        if (e.code === 'KeyS') keys.s = true;
        if (e.code === 'KeyD') keys.d = true;
    });
    document.addEventListener('keyup', e => {
        if (e.code === 'KeyW') keys.w = false;
        if (e.code === 'KeyA') keys.a = false;
        if (e.code === 'KeyS') keys.s = false;
        if (e.code === 'KeyD') keys.d = false;
    });

    // Pointer lock (click canvas to lock)
    canvas.addEventListener('click', () => {
        if (STATE === 'exterior') {
            // Check door click via raycaster
            checkExteriorClick();
        } else if (STATE === 'interior') {
            if (!controls.isLocked) {
                controls.lock();
            } else {
                checkInteriorClick();
            }
        }
    });

    // Mouse move — track for exterior raycaster + door hover
    canvas.addEventListener('mousemove', (e) => {
        extMouseNorm.x = (e.clientX / window.innerWidth) * 2 - 1;
        extMouseNorm.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    controls.addEventListener('unlock', () => {
        if (STATE === 'interior') {
            // controls unlocked via ESC — don't close card
        }
    });

    // Mouse move for exterior camera parallax
    document.addEventListener('mousemove', onMouseMove);

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ─── Exterior parallax + door hover ────────────────────
let extMouseX = 0, extMouseY = 0;
let doorHovered = false;
function onMouseMove(e) {
    extMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    extMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    if (STATE !== 'exterior') return;
    // Door hover via raycaster
    extRaycaster.setFromCamera(extMouseNorm, camera);
    const hits = extRaycaster.intersectObjects(exteriorClickables, false);
    const nowHover = hits.length > 0;
    if (nowHover !== doorHovered) {
        doorHovered = nowHover;
        canvas.style.cursor = nowHover ? 'pointer' : 'default';
        showDoorHint(nowHover);
    }
}

// ─── Enter palace ────────────────────────────────────────
function enterPalace() {
    if (STATE !== 'exterior') return;
    STATE = 'entering';
    doorHovered = false;
    canvas.style.cursor = 'default';
    showDoorHint(false);
    hideEnterPrompt();

    // Fade to black then switch to interior
    const overlay = document.createElement('div');
    overlay.style.cssText = `
    position:fixed;inset:0;background:#000;z-index:500;
    opacity:0;transition:opacity 0.8s ease;pointer-events:all;
  `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    setTimeout(() => {
        // Switch to interior scene
        camera.position.set(0, PLAYER_HEIGHT, 20);
        camera.rotation.set(0, Math.PI, 0); // face north
        camera.fov = 70;
        camera.updateProjectionMatrix();
        STATE = 'interior';
        currentRoomId = 'grand_hall';
        showHUD();
        setRoomLabel(ROOM_DATA.grand_hall.name);

        // Fade back in
        overlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(overlay);
            controls.lock();
        }, 700);
    }, 900);
}

// ─── Exit interior ────────────────────────────────────────
function exitInterior() {
    if (controls.isLocked) controls.unlock();
    STATE = 'exterior';
    hideHUD();
    setExteriorCamera();
    // Briefly show door hint so user knows to click door
    setTimeout(() => { showDoorHint(true); setTimeout(() => showDoorHint(false), 3500); }, 800);
}

// ─── Teleport to room ─────────────────────────────────────
function teleportToRoom(roomId) {
    const dest = ROOM_TELEPORTS[roomId];
    if (!dest) return;
    camera.position.set(dest[0], dest[1], dest[2]);
    camera.rotation.set(0, 0, 0);
    currentRoomId = roomId;
    setRoomLabel(ROOM_DATA[roomId]?.name);
    setActiveRoomBtn(roomId);
    if (!controls.isLocked && STATE === 'interior') controls.lock();
}

// ─── Exterior door click ──────────────────────────────────
function checkExteriorClick() {
    extRaycaster.setFromCamera(extMouseNorm, camera);
    const hits = extRaycaster.intersectObjects(exteriorClickables, false);
    if (hits.length > 0) enterPalace();
}

// ─── Interior exhibit click ───────────────────────────────
let hoveredSlotId = null;

function checkInteriorClick() {
    // 1. Exhibit check (short range, takes priority for upload flow)
    raycaster.setFromCamera(mouse2D, camera);
    const hits = raycaster.intersectObjects(exhibitMeshes, false);
    if (hits.length > 0) {
        const slotId = hits[0].object.userData.slotId;
        if (slotId) { openExhibit(slotId); return; }
    }
    // 2. Door check (long range, only if no exhibit hit)
    doorRaycaster.setFromCamera(mouse2D, camera);
    const doorHits = doorRaycaster.intersectObjects(doorClickables, false);
    if (doorHits.length > 0) {
        const target = doorHits[0].object.userData.targetRoom;
        if (target) teleportToRoom(target);
    }
}

function openExhibit(slotId) {
    if (controls.isLocked) controls.unlock();
    STATE = 'card_open';

    // Get current data for this slot
    const entry = exhibitMap[slotId];
    const slotDef = entry?.slotDef;

    // Load from localStorage / firebase current data
    const storedRaw = localStorage.getItem(`glomer_${slotId}`);
    let storedData = {};
    try { storedData = storedRaw ? JSON.parse(storedRaw) : {}; } catch (_) { }

    showFlipCard(slotId, {
        title: storedData.title || slotDef?.label || '',
        description: storedData.description || '',
        imageURL: storedData.imageURL || null,
        imageDataURL: storedData.imageDataURL || null,
    });

    // Listen for close
    const closeHandler = () => {
        if (STATE === 'card_open') STATE = 'interior';
    };
    document.getElementById('btn-close').addEventListener('click', closeHandler, { once: true });
    document.getElementById('btn-close-back').addEventListener('click', closeHandler, { once: true });
    document.getElementById('flip-backdrop').addEventListener('click', closeHandler, { once: true });
}

// ─── Hover detection ─────────────────────────────────────
function updateHover() {
    if (STATE !== 'interior' || !controls.isLocked) {
        if (hoveredSlotId) { setHoverGlow(hoveredSlotId, false); hideTooltip(); hoveredSlotId = null; }
        return;
    }

    // 1. Exhibit hover (short range, takes priority)
    raycaster.setFromCamera(mouse2D, camera);
    const hits = raycaster.intersectObjects(exhibitMeshes, false);
    const newHover = hits.length > 0 ? hits[0].object.userData.slotId : null;
    if (newHover !== hoveredSlotId) {
        if (hoveredSlotId) setHoverGlow(hoveredSlotId, false);
        hoveredSlotId = newHover;
        if (hoveredSlotId) {
            setHoverGlow(hoveredSlotId, true);
            const label = exhibitMap[hoveredSlotId]?.slotDef?.label || hoveredSlotId;
            showTooltip(`🖼 ${label} — Click để xem`);
            return;
        } else {
            hideTooltip();
        }
    }
    if (hoveredSlotId) return; // already showing exhibit tooltip

    // 2. Door hover (long range)
    doorRaycaster.setFromCamera(mouse2D, camera);
    const doorHits = doorRaycaster.intersectObjects(doorClickables, false);
    if (doorHits.length > 0) {
        const target = doorHits[0].object.userData.targetRoom;
        const roomName = ROOM_DATA[target]?.name || target;
        showTooltip(`🚪 ${roomName} — Click để vào`);
    } else {
        hideTooltip();
    }
}

// ─── Movement ─────────────────────────────────────────────
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

function updateMovement() {
    if (STATE !== 'interior' || !controls.isLocked) return;

    const now = performance.now();
    const delta = Math.min((now - prevTime) / 1000, 0.05);
    prevTime = now;

    direction.set(
        (keys.d ? 1 : 0) - (keys.a ? 1 : 0),
        0,
        (keys.s ? 1 : 0) - (keys.w ? 1 : 0)
    );
    direction.normalize();

    velocity.set(0, 0, 0);
    if (direction.length() > 0) {
        controls.moveRight(direction.x * SPEED * delta);
        controls.moveForward(-direction.z * SPEED * delta);
    }

    // Keep player at floor level
    camera.position.y = PLAYER_HEIGHT;

    // Room boundary clamping
    clampToRooms();

    // Update room label
    const room = detectRoom(camera.position.x, camera.position.z);
    if (room && room !== currentRoomId) {
        currentRoomId = room;
        setRoomLabel(ROOM_DATA[room]?.name);
        setActiveRoomBtn(room);
    }
}

function clampToRooms() {
    const pos = camera.position;
    const DOOR_HALF = 3.8;  // half-width of doorway opening (DW=6 => 3)
    const MARGIN = 0.45;    // player radius from wall

    // Find current room
    let curDef = null, curId = null;
    for (const [id, def] of Object.entries(ROOM_DATA)) {
        const [cx, , cz] = def.center;
        const [W, , D] = def.size;
        if (Math.abs(pos.x - cx) < W / 2 + 1.5 && Math.abs(pos.z - cz) < D / 2 + 1.5) {
            curDef = def; curId = id; break;
        }
    }
    if (!curDef) {
        // Not near any room: snap toward nearest
        let nearest = null, nearDist = Infinity;
        for (const [, def] of Object.entries(ROOM_DATA)) {
            const d = Math.hypot(pos.x - def.center[0], pos.z - def.center[2]);
            if (d < nearDist) { nearDist = d; nearest = def; }
        }
        if (nearest) { pos.x += (nearest.center[0] - pos.x) * 0.2; pos.z += (nearest.center[2] - pos.z) * 0.2; }
        return;
    }

    const [cx, , cz] = curDef.center;
    const [W, , D] = curDef.size;
    const minX = cx - W / 2 + MARGIN, maxX = cx + W / 2 - MARGIN;
    const minZ = cz - D / 2 + MARGIN, maxZ = cz + D / 2 - MARGIN;

    // West wall: allow gap if doorway there
    if (pos.x < minX) {
        const gap = DOORWAYS.some(d =>
            ((d.wall === 'W' && d.roomA === curId) || (d.wall === 'E' && d.roomB === curId))
            && Math.abs(pos.z - d.cz) < DOOR_HALF);
        if (!gap) pos.x = minX;
    }
    // East wall
    if (pos.x > maxX) {
        const gap = DOORWAYS.some(d =>
            ((d.wall === 'E' && d.roomA === curId) || (d.wall === 'W' && d.roomB === curId))
            && Math.abs(pos.z - d.cz) < DOOR_HALF);
        if (!gap) pos.x = maxX;
    }
    // North wall
    if (pos.z < minZ) {
        const gap = DOORWAYS.some(d =>
            ((d.wall === 'N' && d.roomA === curId) || (d.wall === 'S' && d.roomB === curId))
            && Math.abs(pos.x - d.cx) < DOOR_HALF);
        if (!gap) pos.z = minZ;
    }
    // South wall
    if (pos.z > maxZ) {
        const gap = DOORWAYS.some(d =>
            ((d.wall === 'S' && d.roomA === curId) || (d.wall === 'N' && d.roomB === curId))
            && Math.abs(pos.x - d.cx) < DOOR_HALF);
        if (!gap) pos.z = maxZ;
    }
}

// ─── Door hint overlay ────────────────────────────────────
function showDoorHint(on) {
    const el = document.getElementById('door-hint');
    if (el) el.classList.toggle('hidden', !on);
}

// ─── Exterior camera gentle drift ────────────────────────
let extTime = 0;
function updateExteriorCamera() {
    extTime += 0.006;
    camera.position.x = extMouseX * 5 + Math.sin(extTime * 0.35) * 2;
    camera.position.y = 5 + extMouseY * -4 + Math.sin(extTime * 0.25) * 0.8;
    camera.position.z = 70 + Math.sin(extTime * 0.18) * 2.5;
    camera.lookAt(0, 18, 0);
}

// ─── Render loop ──────────────────────────────────────────
function render() {
    if (STATE === 'exterior' || STATE === 'entering') {
        updateExteriorCamera();
        renderer.render(extScene, camera);
    } else if (STATE === 'interior' || STATE === 'card_open') {
        updateMovement();
        updateHover();
        renderer.render(intScene, camera);
    }
}

// ─── Boot ────────────────────────────────────────────────
init().catch(console.error);
