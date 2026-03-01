// js/exhibits.js
// ══════════════════════════════════════════════════════════
//  200 exhibit slots: 40 per room
//  Types: 'painting' (wall-hung frame), 'case' (glass case on pedestal)
// ══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { ROOM_DATA } from './museum.js';

// ── Shared materials ────────────────────────────────────
const FRAME_MAT = new THREE.MeshStandardMaterial({ color: 0xA07830, roughness: 0.4, metalness: 0.6 });
const GOLD_MAT = new THREE.MeshStandardMaterial({ color: 0xC9A84C, roughness: 0.2, metalness: 0.9 });
const PEDESTAL_MAT = new THREE.MeshStandardMaterial({ color: 0xCCC0A0, roughness: 0.7, metalness: 0.05 });
const GLASS_MAT = new THREE.MeshStandardMaterial({ color: 0xAADDFF, roughness: 0, metalness: 0.05, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
const EMPTY_MAT = new THREE.MeshStandardMaterial({ color: 0x1A1020, roughness: 0.9 });
const PLUS_MAT = new THREE.MeshStandardMaterial({ color: 0x3A2A5A, roughness: 0.8, emissive: 0x2A1840, emissiveIntensity: 0.5 });

export const exhibitMeshes = [];   // all clickable slot meshes
export const exhibitMap = {};   // slotId → { mesh, imageMesh, slotDef }

// ── Generate all 200 slot definitions ───────────────────
export function generateSlots() {
    const slots = [];
    let id = 0;
    function painting(roomId, x, y, z, rotY, label) {
        slots.push({ id: `slot_${id++}`, roomId, type: 'painting', position: [x, y, z], rotY, label });
    }
    function caseSlot(roomId, x, y, z, label) {
        slots.push({ id: `slot_${id++}`, roomId, type: 'case', position: [x, y, z], rotY: 0, label });
    }

    // ── Tầng 1 ────────────────────────────────────────────────
    // 1. Grand Hall (cy=0) - 15 exhibits
    [-12,-4,4,12].forEach((x,i) => painting('grand_hall', x, 4, -24.4, 0, `ĐS Bắc ${i+1}`)); // 4
    [-12,0,12].forEach((z,i) => painting('grand_hall', 24.4, 4, z, -Math.PI/2, `ĐS Đông ${i+1}`)); // 3
    [-12,0,12].forEach((z,i) => painting('grand_hall', -24.4, 4, z, Math.PI/2, `ĐS Tây ${i+1}`)); // 3
    [-12,0,12].forEach((x,i) => painting('grand_hall', x, 4, 24.4, Math.PI, `ĐS Nam ${i+1}`)); // 3
    [-4,4].forEach((x,i) => caseSlot('grand_hall', x, 0, -10, `ĐS Tủ ${i+1}`)); // 2
    // Total: 4+3+3+3+2 = 15

    // 2. Painting Gallery (center -42, cy=0) - 15 exhibits
    [-15,0,15].forEach((z,i) => painting('painting_gallery', -25.4, 4, z, Math.PI/2, `Tranh Đông ${i+1}`)); // 3
    [-15,0,15].forEach((z,i) => painting('painting_gallery', -58.6, 4, z, -Math.PI/2, `Tranh Tây ${i+1}`)); // 3
    [-9,0,9].forEach((x,i) => painting('painting_gallery', x-42, 4, -24.4, Math.PI, `Tranh Nam ${i+1}`)); // 3
    [-9,0,9].forEach((x,i) => painting('painting_gallery', x-42, 4, 24.4, 0, `Tranh Bắc ${i+1}`)); // 3
    [-10,0,10].forEach((z,i) => caseSlot('painting_gallery', -42, 0, z, `Gallery Tủ ${i+1}`)); // 3
    // Total: 3+3+3+3+3 = 15

    // 3. Artifacts Room (center 42, cy=0) - 15 cases
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
            caseSlot('artifacts_room', 35 + c*7, 0, -15 + r*7.5, `Hiện Vật ${r*3+c+1}`);
        }
    } // 15

    // 4. Sculpture Room (center 0, z=-42, cy=0) - 15 exhibits
    [-15,0,15].forEach((x,i) => painting('sculpture_room', x, 4, -25.4, 0, `ĐK Tranh ${i+1}`)); // 3
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
            caseSlot('sculpture_room', -10+c*6.6, 0, -48 + r*8, `Tượng ${r*4+c+1}`);
        }
    } // 3+12 = 15

    // 5. Archive Room (center 0, z=42, cy=0) - 15 exhibits
    for (let col = 0; col < 7; col++) painting('archive_room', -12+col*4, 4, 25.4, 0, `Lưu Bắc ${col+1}`); // 7
    for (let col = 0; col < 8; col++) painting('archive_room', -14+col*4, 4, 58.6, Math.PI, `Lưu Nam ${col+1}`); // 8
    // Total: 15

    // ── Tầng 2 ────────────────────────────────────────────────
    // 6. Royal Bedroom (center 0, z=-42, cy=12) - 15 exhibits
    [-15,0,15].forEach((x,i) => painting('royal_bedroom', x, 16, -25.4, Math.PI, `HG Nam ${i+1}`)); // 3 (facing north)
    [-15,-5,5,15].forEach((x,i) => painting('royal_bedroom', x, 16, -58.6, 0, `HG Bắc ${i+1}`)); // 4
    [-47,-37].forEach((z,i) => painting('royal_bedroom', -24.4, 16, z, Math.PI/2, `HG Tây ${i+1}`)); // 2
    [-47,-37].forEach((z,i) => painting('royal_bedroom', 24.4, 16, z, -Math.PI/2, `HG Đông ${i+1}`)); // 2
    [-5,5].forEach((x,i) => caseSlot('royal_bedroom', x, 12, -45, `HG Tủ Bắc ${i+1}`)); // 2
    [-5,5].forEach((x,i) => caseSlot('royal_bedroom', x, 12, -35, `HG Tủ Nam ${i+1}`)); // 2
    // 3+4+2+2+2+2 = 15

    // 7. Library (center -42, x=-42, cy=12) - 15 exhibits
    [-15,0,15].forEach((z,i) => painting('library', -25.4, 16, z, Math.PI/2, `TV Đông ${i+1}`)); // 3
    [-15,0,15].forEach((z,i) => painting('library', -58.6, 16, z, -Math.PI/2, `TV Tây ${i+1}`)); // 3
    [-9,0,9].forEach((x,i) => painting('library', x-42, 16, -24.4, Math.PI, `TV Nam ${i+1}`)); // 3
    [-9,0,9].forEach((x,i) => painting('library', x-42, 16, 24.4, 0, `TV Bắc ${i+1}`)); // 3
    [-8,8].forEach((z,i) => caseSlot('library', -42, 12, z, `TV Tủ ${i+1}`)); // 2
    caseSlot('library', -42, 12, 0, `TV Tủ Giữa`); // 1
    // Total: 3+3+3+3+2+1 = 15

    // 8. Armory (center 42, x=42, cy=12) - 15 exhibits
    [-15,0,15].forEach((z,i) => painting('armory', 25.4, 16, z, -Math.PI/2, `VK Tây ${i+1}`)); // 3
    [-15,0,15].forEach((z,i) => painting('armory', 58.6, 16, z, Math.PI/2, `VK Đông ${i+1}`)); // 3
    [-9,0,9].forEach((x,i) => painting('armory', x+42, 16, -24.4, Math.PI, `VK Nam ${i+1}`)); // 3
    [-9,0,9].forEach((x,i) => painting('armory', x+42, 16, 24.4, 0, `VK Bắc ${i+1}`)); // 3
    [-10,0,10].forEach((z,i) => caseSlot('armory', 42, 12, z, `VK Tủ ${i+1}`)); // 3
    // Total: 3+3+3+3+3 = 15

    return slots;
}

// ── Build 3D meshes for all slots ───────────────────────
export function buildExhibits(scene, slots) {
    const group = new THREE.Group();
    group.name = 'exhibits';

    slots.forEach(slot => {
        const mesh = slot.type === 'painting'
            ? buildPaintingSlot(slot)
            : buildCaseSlot(slot);

        if (mesh) {
            mesh.userData.slotId = slot.id;
            mesh.userData.slotDef = slot;
            mesh.userData.clickable = 'exhibit';
            exhibitMeshes.push(mesh);
            exhibitMap[slot.id] = { mesh, imageMesh: null, slotDef: slot };
            group.add(...(mesh.userData._groupChildren || [mesh]));
        }
    });

    scene.add(group);
    return group;
}

function buildPaintingSlot(slot) {
    const group = new THREE.Group();
    const [x, y, z] = slot.position;

    // Outer frame
    const frameW = 2.4, frameH = 2.0;
    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(frameW + 0.3, frameH + 0.3, 0.12),
        FRAME_MAT
    );

    // Inner canvas (image surface)
    const canvas = new THREE.Mesh(
        new THREE.PlaneGeometry(frameW, frameH),
        EMPTY_MAT.clone()
    );
    canvas.position.z = 0.07;
    canvas.userData.isImageSurface = true;

    // Hover glow plane (behind frame)
    const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(frameW + 0.7, frameH + 0.7),
        new THREE.MeshBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0, side: THREE.FrontSide })
    );
    glow.position.z = -0.05;
    glow.userData.isGlow = true;

    // "+" label for empty
    const plusGeom = new THREE.PlaneGeometry(frameW - 0.1, frameH - 0.1);
    const plus = new THREE.Mesh(plusGeom, PLUS_MAT.clone());
    plus.position.z = 0.065;
    plus.userData.isPlus = true;

    group.add(frame, canvas, glow, plus);
    group.position.set(x, y, z);
    group.rotation.set(0, slot.rotY, 0);

    // Make the whole group clickable via the canvas child
    canvas.userData.slotId = slot.id;
    canvas.userData.slotDef = slot;
    canvas.userData.clickable = 'exhibit';
    canvas.userData._groupChildren = Array.from(group.children);

    // Expose for external access
    canvas.userData._parentGroup = group;

    exhibitMeshes.push(canvas);
    exhibitMap[slot.id] = {
        mesh: canvas,
        imageMesh: canvas,
        glowMesh: glow,
        plusMesh: plus,
        slotDef: slot
    };

    // Remove auto-push from parent
    return null; // signal to parent to use _groupChildren
}

function buildCaseSlot(slot) {
    const group = new THREE.Group();
    const [x, , z] = slot.position;

    // Pedestal
    const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.85, 1.1, 16),
        PEDESTAL_MAT
    );
    ped.position.y = 0.55;

    // Platform top
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), PEDESTAL_MAT);
    top.position.y = 1.15;

    // Glass case (box)
    const caseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 1.0, 1.3),
        GLASS_MAT
    );
    caseMesh.position.y = 1.65;

    // Inner display surface (image)
    const inner = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 1.0),
        EMPTY_MAT.clone()
    );
    inner.position.set(0, 1.65, 0);
    inner.rotation.x = -Math.PI / 2;
    inner.userData.isImageSurface = true;

    // Glow ring
    const glow = new THREE.Mesh(
        new THREE.RingGeometry(0.82, 0.92, 32),
        new THREE.MeshBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    glow.position.y = 1.16;
    glow.rotation.x = -Math.PI / 2;
    glow.userData.isGlow = true;

    // Gold trim on case top
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 1.4), GOLD_MAT);
    trim.position.y = 2.17;

    group.add(ped, top, caseMesh, inner, glow, trim);
    group.position.set(x, 0, z);

    // Make inner surface clickable
    inner.userData.slotId = slot.id;
    inner.userData.slotDef = slot;
    inner.userData.clickable = 'exhibit';

    exhibitMeshes.push(inner);
    exhibitMap[slot.id] = {
        mesh: inner,
        imageMesh: inner,
        glowMesh: glow,
        plusMesh: null,
        slotDef: slot
    };

    // Add group children to scene directly
    group.children.forEach(c => {
        c.userData._belongsToSlot = slot.id;
    });

    return group;
}

// ── Called by buildExhibits — patched version ────────────
// We call this instead of the above since painting returns null
export function buildExhibitsFull(scene, slots) {
    const group = new THREE.Group();
    group.name = 'exhibits';

    slots.forEach(slot => {
        if (slot.type === 'painting') {
            addPaintingToScene(group, slot);
        } else {
            addCaseToScene(group, slot);
        }
    });

    scene.add(group);
    return group;
}

function addPaintingToScene(parent, slot) {
    const [x, y, z] = slot.position;
    const frameW = 2.4, frameH = 2.0;

    // Outer frame (gold/wood)
    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(frameW + 0.26, frameH + 0.26, 0.1),
        FRAME_MAT
    );

    // Canvas (image surface)
    const canvasMat = EMPTY_MAT.clone();
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), canvasMat);
    canvas.position.z = 0.06;

    // "+" icon overlay (empty state)
    const plusMat = new THREE.MeshBasicMaterial({
        color: 0xC9A84C, transparent: true, opacity: 0.18, side: THREE.FrontSide
    });
    const plus = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), plusMat);
    plus.position.z = 0.07;

    // Glow
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFD070, transparent: true, opacity: 0 });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(frameW + 0.6, frameH + 0.6), glowMat);
    glow.position.z = -0.06;

    // Clickable proxy (same plane) — transparent not invisible so raycaster can hit it
    const proxy = new THREE.Mesh(new THREE.PlaneGeometry(frameW + 0.26, frameH + 0.26),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    proxy.position.z = 0.08;
    proxy.userData.slotId = slot.id;
    proxy.userData.slotDef = slot;
    proxy.userData.clickable = 'exhibit';

    const g = new THREE.Group();
    g.add(frame, canvas, plus, glow, proxy);
    g.position.set(x, y, z);
    g.rotation.set(0, slot.rotY, 0);
    parent.add(g);

    exhibitMeshes.push(proxy);
    exhibitMap[slot.id] = { mesh: proxy, imageMesh: canvas, glowMesh: glow, plusMesh: plus, slotDef: slot };
}

function addCaseToScene(parent, slot) {
    const [x, , z] = slot.position;

    const g = new THREE.Group();

    // Pedestal
    const ped2 = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.88, 1.1, 16), PEDESTAL_MAT);
    ped2.position.set(0, 0.55, 0);
    g.add(ped2);

    // Top cap
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), PEDESTAL_MAT);
    topCap.position.set(0, 1.15, 0);
    g.add(topCap);

    // Glass sides
    [0, 1, 2, 3].forEach(i => {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), GLASS_MAT);
        s.position.set(
            i === 0 ? 0.65 : i === 1 ? -0.65 : 0, 1.65,
            i === 2 ? 0.65 : i === 3 ? -0.65 : 0
        );
        s.rotation.y = i * Math.PI / 2;
        g.add(s);
    });
    // Glass top
    const gt = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), GLASS_MAT);
    gt.rotation.x = -Math.PI / 2; gt.position.set(0, 2.15, 0);
    g.add(gt);

    // Image surface (horizontal)
    const canvasMat = EMPTY_MAT.clone();
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), canvasMat);
    canvas.rotation.x = -Math.PI / 2;
    canvas.position.set(0, 1.17, 0);

    // Gold trim top
    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.5), GOLD_MAT);
    goldTrim.position.set(0, 2.18, 0);
    g.add(goldTrim);

    // Glow ring
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFD070, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.95, 32), glowMat);
    glow.rotation.x = -Math.PI / 2; glow.position.set(0, 1.16, 0);
    g.add(glow);

    // Click proxy — transparent cylinder (NOT visible:false, raycaster skips invisible meshes)
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 16),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    proxy.position.y = 1.1;
    proxy.userData.slotId = slot.id;
    proxy.userData.slotDef = slot;
    proxy.userData.clickable = 'exhibit';
    g.add(proxy);

    g.add(canvas);
    g.position.set(x, 0, z);
    parent.add(g);

    exhibitMeshes.push(proxy);
    exhibitMap[slot.id] = { mesh: proxy, imageMesh: canvas, glowMesh: glow, plusMesh: null, slotDef: slot };
}

// ── Update exhibit visual when image is loaded ───────────
export function updateExhibitImage(slotId, imageURL, imageDataURL) {
    const entry = exhibitMap[slotId];
    if (!entry) return;

    const src = imageURL || imageDataURL;
    if (!src) return;

    const loader = new THREE.TextureLoader();
    loader.load(src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
        entry.imageMesh.material = mat;
        // Hide "+" overlay
        if (entry.plusMesh) entry.plusMesh.material.opacity = 0;
    });
}

// ── Set hover glow ────────────────────────────────────────
export function setHoverGlow(slotId, on) {
    const entry = exhibitMap[slotId];
    if (entry && entry.glowMesh) {
        entry.glowMesh.material.opacity = on ? 0.25 : 0;
    }
}
