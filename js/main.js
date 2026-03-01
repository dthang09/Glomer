// js/main.js
// ══════════════════════════════════════════════════════════
//  Glomer Palace Museum — Three.js Entry Point
// ══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

import { initFirebase, loadAllExhibits, subscribeToExhibits } from './firebase-db.js';
import { buildExterior, exteriorClickables } from './palace.js';
import { buildInterior, ROOM_DATA, ROOM_TELEPORTS, detectRoom, doorClickables, DOORWAYS, columnPositions } from './museum.js';
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

// Door raycaster (long-range)
const doorRaycaster = new THREE.Raycaster();
doorRaycaster.far = 35.0;

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
    // Calculate base Y floor level based on position
    let targetBaseY = 0;
    const pos = camera.position;

    // Check if in stairwell area (inside grand_hall south)
    const onStairs = (pos.z > 13.5 && pos.z < 25.5 && Math.abs(pos.x) < 15.5);
    if (onStairs) {
        if (pos.z >= 14 && pos.z <= 22 && Math.abs(pos.x) <= 4.5) {
            // Central flight: z=14 (y=0) to z=22 (y=6)
            targetBaseY = Math.max(0, Math.min(6, (pos.z - 14) / 8 * 6));
        } else if (pos.z > 22 && pos.z <= 25 && Math.abs(pos.x) <= 4.0) {
            // Landing
            targetBaseY = 6;
        } else if (pos.z >= 21 && pos.z <= 25 && pos.x < -4 && pos.x >= -15) {
            // Left flight: x=-4 (y=6) to x=-15 (y=12)
            targetBaseY = Math.max(6, Math.min(12, 6 + (-4 - pos.x) / 11 * 6));
        } else if (pos.z >= 21 && pos.z <= 25 && pos.x > 4 && pos.x <= 15) {
            // Right flight: x=4 (y=6) to x=15 (y=12)
            targetBaseY = Math.max(6, Math.min(12, 6 + (pos.x - 4) / 11 * 6));
        } else {
            // Fallback for weird gaps near stairs: keep previous elevation 
            targetBaseY = camera.position.y - PLAYER_HEIGHT;
        }
    } else {
        // Flat floor check
        let curDef = null;
        // Priority to rooms matching current height
        const curY = camera.position.y - PLAYER_HEIGHT;
        for (const [id, def] of Object.entries(ROOM_DATA)) {
            const [cx, cy = 0, cz] = def.center;
            const [W, H, D] = def.size;
            if (Math.abs(pos.x - cx) < W / 2 + 1.5 && Math.abs(pos.z - cz) < D / 2 + 1.5) {
                // If it's grand_hall, height is 24, so it covers both floors!
                if (id === 'grand_hall') {
                    if (curY > 8) targetBaseY = 12; else targetBaseY = 0;
                    curDef = def;
                } else if (Math.abs(curY - cy) < 4) { // matching floor level
                    curDef = def;
                    targetBaseY = cy;
                    break;
                }
            }
        }
        if (!curDef) targetBaseY = Math.round((camera.position.y - PLAYER_HEIGHT) / 12) * 12; // default
    }

    // Smooth Y transition for stairs
    const currentBaseY = camera.position.y - PLAYER_HEIGHT;
    const newBaseY = currentBaseY + (targetBaseY - currentBaseY) * 0.2; // lerp smooth
    camera.position.y = newBaseY + PLAYER_HEIGHT;
    const isUpper = (newBaseY > 8);

    // Room boundary clamping
    clampToRooms(isUpper);

    // Update room label
    const room = detectRoom(camera.position.x, camera.position.z);
    if (room && room !== currentRoomId) {
        currentRoomId = room;
        setRoomLabel(ROOM_DATA[room]?.name);
        setActiveRoomBtn(room);
    }
}

function clampToRooms(isUpper) {
    const pos = camera.position;
    const DOOR_HALF = 3.5;  // half-width of doorway opening
    const MARGIN = 0.5;    // player body radius from wall

    // Column push-back
    const COL_R = 0.75;
    for (const [cpx, cpz] of columnPositions) {
        const dx = pos.x - cpx, dz = pos.z - cpz;
        const dd = dx * dx + dz * dz;
        if (dd < COL_R * COL_R && dd > 0.0001) {
            const d = Math.sqrt(dd);
            const push = (COL_R - d) / d;
            pos.x += dx * push;
            pos.z += dz * push;
        }
    }

    // Find current room
    let curDef = null, curId = null;
    const expectedY = isUpper ? 12 : 0;
    for (const [id, def] of Object.entries(ROOM_DATA)) {
        const [cx, cy = 0, cz] = def.center;
        const [W, , D] = def.size;

        // Grand hall spans both floors
        const yMatch = (id === 'grand_hall') ? true : (Math.abs(cy - expectedY) < 1.0);

        if (yMatch && Math.abs(pos.x - cx) < W / 2 + 1.5 && Math.abs(pos.z - cz) < D / 2 + 1.5) {
            curDef = def; curId = id; break;
        }
    }

    if (!curDef) {
        // Are we on stairs?
        if (pos.z > 13.5 && pos.z < 25.5 && Math.abs(pos.x) < 15.5) return; // Free move on stairs

        const inCorridor = DOORWAYS.some(d => {
            const dy = d.cy || 0;
            if (Math.abs(dy - expectedY) > 1.0) return false;
            const isNS = d.wall === 'N' || d.wall === 'S';
            return isNS ? Math.abs(pos.x - d.cx) < DOOR_HALF : Math.abs(pos.z - d.cz) < DOOR_HALF;
        });
        if (inCorridor) return;
        return; // gentle fallback if lost
    }

    const [cx, , cz] = curDef.center;
    const [W, , D] = curDef.size;

    // Custom balcony railings for Grand Hall Floor 2
    if (curId === 'grand_hall' && isUpper) {
        // Balcony layout: West(x:-25 to -15), East(x:15 to 25), North(z:-25 to -15)
        // Central void is x: -15 to 15, z: -15 to 25
        if (pos.x > -15 + MARGIN && pos.x < 15 - MARGIN && pos.z > -15 + MARGIN) {
            // In the void! Push them back to the nearest balcony
            // They came from: West (-15), East (15), North (-15), or South Stairs (z=25)
            // But south part doesn't have a balcony, just stairs arriving at west/east.
            const dW = Math.abs(pos.x - (-15));
            const dE = Math.abs(pos.x - 15);
            const dN = Math.abs(pos.z - (-15));
            const min = Math.min(dW, dE, dN);
            if (min === dW) pos.x = -15 + MARGIN;
            else if (min === dE) pos.x = 15 - MARGIN;
            else if (min === dN) pos.z = -15 + MARGIN;
        }
    }

    let minX = cx - W / 2 + MARGIN, maxX = cx + W / 2 - MARGIN;
    let minZ = cz - D / 2 + MARGIN, maxZ = cz + D / 2 - MARGIN;

    // For Grand Hall Floor 2, the South wall has NO balcony except the stair landings, so we can't go to z=24.4 unless on stairs
    if (curId === 'grand_hall' && isUpper) {
        // Stair arrival is at x=<-15 or x=>15, z=21 to 25.
        // We handle falling off balcony above, but just to be safe:
        // Prevent going into corners that don't exist if needed, but the current balcony floor covers the corners.
    }

    // Doorway gap checks matching current floor
    const checkGap = (wallType, condition) => DOORWAYS.some(d => {
        const dy = d.cy || 0;
        if (Math.abs(dy - expectedY) > 1.0) return false;
        return ((d.wall === wallType && d.roomA === curId) ||
            ((wallType === 'W' ? 'E' : wallType === 'E' ? 'W' : wallType === 'N' ? 'S' : 'N') && d.roomB === curId))
            && condition(d);
    });

    if (pos.x < minX && !checkGap('W', d => Math.abs(pos.z - d.cz) < DOOR_HALF)) pos.x = minX;
    if (pos.x > maxX && !checkGap('E', d => Math.abs(pos.z - d.cz) < DOOR_HALF)) pos.x = maxX;
    if (pos.z < minZ && !checkGap('N', d => Math.abs(pos.x - d.cx) < DOOR_HALF)) pos.z = minZ;
    if (pos.z > maxZ && !checkGap('S', d => Math.abs(pos.x - d.cx) < DOOR_HALF)) pos.z = maxZ;

    // Special case for Grand Hall South doorway (it's the exit door at Floor 1)
    if (curId === 'grand_hall' && !isUpper && pos.z > maxZ) {
        if (Math.abs(pos.x) < DOOR_HALF) {
            // Near exit door, let them hit it
        } else {
            pos.z = maxZ;
        }
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

