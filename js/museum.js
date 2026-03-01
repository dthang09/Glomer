// js/museum.js — Glomer Palace Interior (Versailles-style, High Detail)
import * as THREE from 'three';

// ── Room definitions ─────────────────────────────────────────
export const ROOM_DATA = {
    grand_hall: { name: 'Đại Sảnh', center: [0, 0, 0], size: [50, 24, 50] }, // H=24 for 2nd floor height!
    painting_gallery: { name: 'Phòng Tranh', center: [-42, 0, 0], size: [34, 12, 50] },
    artifacts_room: { name: 'Phòng Hiện Vật', center: [42, 0, 0], size: [34, 12, 50] },
    sculpture_room: { name: 'Phòng Điêu Khắc', center: [0, 0, -42], size: [50, 12, 34] },
    archive_room: { name: 'Phòng Lưu Trữ', center: [0, 0, 42], size: [50, 12, 34] },

    // Tầng 2
    royal_bedroom: { name: 'Phòng Hoàng Gia', center: [0, 12, -42], size: [50, 12, 34] },
    library: { name: 'Thư Viện', center: [-42, 12, 0], size: [34, 12, 50] },
    armory: { name: 'Phòng Vũ Khí', center: [42, 12, 0], size: [34, 12, 50] },
};

// Doorway portal connections
export const DOORWAYS = [
    // Tầng 1
    { roomA: 'grand_hall', roomB: 'painting_gallery', wall: 'W', cx: -25, cy: 0, cz: 0 },
    { roomA: 'grand_hall', roomB: 'artifacts_room', wall: 'E', cx: 25, cy: 0, cz: 0 },
    { roomA: 'grand_hall', roomB: 'sculpture_room', wall: 'N', cx: 0, cy: 0, cz: -25 },
    { roomA: 'grand_hall', roomB: 'archive_room', wall: 'S', cx: 0, cy: 0, cz: 25 },
    // Tầng 2
    { roomA: 'grand_hall', roomB: 'library', wall: 'W', cx: -25, cy: 12, cz: 0 },
    { roomA: 'grand_hall', roomB: 'armory', wall: 'E', cx: 25, cy: 12, cz: 0 },
    { roomA: 'grand_hall', roomB: 'royal_bedroom', wall: 'N', cx: 0, cy: 12, cz: -25 },
];

export const doorClickables = [];
export const columnPositions = [];

export const ROOM_TELEPORTS = {
    grand_hall: [0, 1.7, 8],
    painting_gallery: [-42, 1.7, 0],
    artifacts_room: [42, 1.7, 0],
    sculpture_room: [0, 1.7, -42],
    archive_room: [0, 1.7, 42],
    royal_bedroom: [0, 13.7, -42],
    library: [-42, 13.7, 0],
    armory: [42, 13.7, 0],
};

// ── Helper: create MeshStandardMaterial ─────────────────────
function mat(color, roughness = 0.8, metalness = 0, emissive = null, emissiveInt = 0) {
    const opts = { color, roughness, metalness };
    if (emissive !== null) { opts.emissive = emissive; opts.emissiveIntensity = emissiveInt; }
    return new THREE.MeshStandardMaterial(opts);
}
function addMesh(g, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m); return m;
}

// ── Main build function ───────────────────────────────────────
export function buildInterior(scene) {
    const g = new THREE.Group();
    g.name = 'interior';

    // Shared materials
    const GOLD = mat(0xD4A820, 0.08, 0.95, 0xA07808, 0.28);
    const GOLDD = mat(0xB89018, 0.14, 0.92);
    const MARBLE = mat(0xF0EBE0, 0.22, 0.05);
    const MARBLD = mat(0xD8D0B8, 0.28, 0.04);
    // Crystal material (depthWrite:false prevents sorting artifacts)
    const CRYSTAL = new THREE.MeshStandardMaterial({
        color: 0xCCEEFF, roughness: 0.05, metalness: 0.2,
        transparent: true, opacity: 0.72, depthWrite: false
    });

    // Build rooms
    Object.entries(ROOM_DATA).forEach(([id, def]) =>
        buildRoom(g, id, def, GOLD, GOLDD, MARBLE, MARBLD, CRYSTAL)
    );

    // Build doorways (portals with arched frames + clickable triggers)
    DOORWAYS.forEach(d => buildDoorway(g, d, GOLD, GOLDD, MARBLE));

    // Global interior lighting
    scene.add(new THREE.AmbientLight(0xFFEDD0, 0.9));
    const dir = new THREE.DirectionalLight(0xFFE0A0, 0.55);
    dir.position.set(10, 20, 10);
    scene.add(dir);

    scene.add(g);
    return g;
}

// ── Build a single room ───────────────────────────────────────
function buildRoom(g, id, def, GOLD, GOLDD, MARBLE, MARBLD, CRYSTAL) {
    const [cx, cy, cz] = def.center;
    const [W, H, D] = def.size;

    // Assign per-room colours
    const palette = {
        grand_hall: { wall: 0xF5EDD0, floorA: 0xF0E8D0, floorB: 0x8A6A40 },
        painting_gallery: { wall: 0xEADFC0, floorA: 0xB89050, floorB: 0x5A3810 },
        artifacts_room: { wall: 0xE8DCC8, floorA: 0xD8C8A8, floorB: 0x786048 },
        sculpture_room: { wall: 0xF0EAD5, floorA: 0xE5DCC8, floorB: 0x706050 },
        archive_room: { wall: 0xDDD0B0, floorA: 0xA07840, floorB: 0x503820 },
    };
    const { wall: wc, floorA, floorB } = palette[id] || palette.grand_hall;

    buildFloor(g, cx, cy, cz, W, D, floorA, floorB);
    buildCeiling(g, id, cx, cy, cz, W, D, H, GOLD);
    buildWalls(g, cx, cy, cz, W, H, D, wc, GOLD, MARBLE, MARBLD);
    buildColumns(g, cx, cy, cz, W, H, D, MARBLE, GOLD, GOLDD);
    addCornices(g, cx, cy, cz, W, D, H, GOLD);

    // Chandeliers
    const chandelierPositions = [[cx, cz]];
    if (id === 'grand_hall') { buildSecondFloorBalcony(g, cx, cy, cz, W, H, D, MARBLE, GOLD, GOLDD); buildGrandStaircase(g, cx, cy, cz, MARBLE, GOLD); }
    if (W > 40) { chandelierPositions.push([cx - W / 4, cz], [cx + W / 4, cz]); }
    if (D > 50) { chandelierPositions.push([cx, cz - D / 4], [cx, cz + D / 4]); }
    chandelierPositions.forEach(([px, pz]) => addChandelier(g, px, cy + H - 0.2, pz, GOLD, CRYSTAL));

    // Room-specific decorations
    if (id === 'grand_hall') addGrandHallDecor(g, cx, cz, W, H, D, GOLD, MARBLE);
    if (id === 'painting_gallery') addGalleryDecor(g, cx, cz, W, H, D, GOLD);
    if (id === 'artifacts_room') addArtifactsDecor(g, cx, cz, W, H, D, GOLD, MARBLE);
    if (id === 'sculpture_room') addSculptureDecor(g, cx, cz, W, H, D, GOLD, MARBLE);
    if (id === 'archive_room') addArchiveDecor(g, cx, cz, W, H, D, GOLD);
}

// ── Checkerboard marble floor ─────────────────────────────────
function buildFloor(g, cx, cy, cz, W, D, colA, colB) {
    const sz = 3;
    const matA = mat(colA, 0.22, 0.06);
    const matB = mat(colB, 0.28, 0.04);
    const cols = Math.ceil(W / sz), rows = Math.ceil(D / sz);
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), (c + r) % 2 === 0 ? matA : matB);
            m.rotation.x = -Math.PI / 2;
            m.position.set(cx - W / 2 + c * sz + sz / 2, cy + 0.01, cz - D / 2 + r * sz + sz / 2);
            m.receiveShadow = true;
            g.add(m);
        }
    }
}

// ── Ornate ceiling with fresco + gold coffers ─────────────────
function buildCeiling(g, id, cx, cy, cz, W, D, H, GOLD) {
    // Base ceiling
    const ceilMat = mat(0xFAF4E0, 0.9);
    addMesh(g, new THREE.PlaneGeometry(W, D), ceilMat, cx, cy + H, cz, Math.PI / 2);

    // Central fresco — polygonOffset prevents z-fighting with base ceiling
    const frescoMat = makeFrescoMat(id);
    frescoMat.polygonOffset = true;
    frescoMat.polygonOffsetFactor = -2;
    frescoMat.polygonOffsetUnits = -2;
    addMesh(g, new THREE.PlaneGeometry(W * 0.5, D * 0.5), frescoMat, cx, cy + H, cz, Math.PI / 2);

    // Gold coffer grid (box strips—no z-fighting issue)
    const coffW = W / 4, coffD = D / 4;
    const goldCoffer = mat(0xD4A820, 0.1, 0.92, 0x906000, 0.18);
    for (let ci = -1; ci <= 1; ci++) {
        for (let ri = -1; ri <= 1; ri++) {
            if (ci === 0 && ri === 0) continue;
            // Recessed panel with polygonOffset
            const panM = mat(0xF5EDD8, 0.88);
            panM.polygonOffset = true; panM.polygonOffsetFactor = -1; panM.polygonOffsetUnits = -1;
            addMesh(g, new THREE.PlaneGeometry(coffW - 0.5, coffD - 0.5), panM, cx + ci * coffW, H, cz + ri * coffD, Math.PI / 2);
            // Border strips (box geometry, no z-fighting)
            addMesh(g, new THREE.BoxGeometry(coffW, 0.08, 0.22), goldCoffer, cx + ci * coffW, H - 0.05, cz + ri * coffD - coffD / 2);
            addMesh(g, new THREE.BoxGeometry(coffW, 0.08, 0.22), goldCoffer, cx + ci * coffW, H - 0.05, cz + ri * coffD + coffD / 2);
            addMesh(g, new THREE.BoxGeometry(0.22, 0.08, coffD), goldCoffer, cx + ci * coffW - coffW / 2, H - 0.05, cz + ri * coffD);
            addMesh(g, new THREE.BoxGeometry(0.22, 0.08, coffD), goldCoffer, cx + ci * coffW + coffW / 2, H - 0.05, cz + ri * coffD);
            addMesh(g, new THREE.SphereGeometry(0.12, 8, 6), goldCoffer, cx + ci * coffW, H - 0.06, cz + ri * coffD);
        }
    }
}

function makeFrescoMat(id) {
    const palettes = {
        grand_hall: [0x7080B8, 0xF0D060, 0xC06040],
        painting_gallery: [0x559975, 0xE8C860, 0x887040],
        artifacts_room: [0xA07050, 0xD8C080, 0x607090],
        sculpture_room: [0x8E90A0, 0xD8D0C0, 0x806050],
        archive_room: [0x807040, 0xC0A858, 0x507070],
    };
    const [c1, c2, c3] = palettes[id] || palettes.grand_hall;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const hex = n => '#' + n.toString(16).padStart(6, '0');
    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 140);
    grad.addColorStop(0, hex(c2));
    grad.addColorStop(0.55, hex(c1));
    grad.addColorStop(1, hex(c3));
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(255,255,230,0.12)'; ctx.lineWidth = 8;
    for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 256, Math.random() * 256);
        ctx.bezierCurveTo(Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
}

// ── Walls with panels and pilasters ──────────────────────────
function buildWalls(g, cx, cy, cz, W, H, D, wc, GOLD, MARBLE, MARBLD) {
    const wallMat = mat(wc, 0.82, 0.02);
    const panelMat = mat(mixColor(wc, 0xFFFFFF, 0.15), 0.76, 0.02);
    const wainMat = mat(mixColor(wc, 0x000000, 0.18), 0.88, 0.02);

    const wallDefs = [
        { pos: [cx, cy + H / 2, cz - D / 2], rot: [0, 0, 0], len: W },
        { pos: [cx, cy + H / 2, cz + D / 2], rot: [0, Math.PI, 0], len: W },
        { pos: [cx - W / 2, cy + H / 2, cz], rot: [0, Math.PI / 2, 0], len: D },
        { pos: [cx + W / 2, cy + H / 2, cz], rot: [0, -Math.PI / 2, 0], len: D },
    ];

    wallDefs.forEach(w => {
        // Main wall
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(w.len, H), wallMat);
        wall.position.set(...w.pos); wall.rotation.set(...w.rot);
        wall.receiveShadow = true; g.add(wall);

        // Wainscot (lower panel) — offset +0.008 inward to avoid z-fighting
        const wainMat2 = mat(mixColor(wc, 0x000000, 0.18), 0.88, 0.02);
        wainMat2.polygonOffset = true; wainMat2.polygonOffsetFactor = -1; wainMat2.polygonOffsetUnits = -4;
        const wain = new THREE.Mesh(new THREE.PlaneGeometry(w.len, 2.0), wainMat2);
        wain.position.set(w.pos[0], cy + 1.0, w.pos[2]); wain.rotation.set(...w.rot);
        const wOff = new THREE.Vector3(0, 0, 0.008); wOff.applyEuler(wain.rotation); wain.position.add(wOff);
        g.add(wain);

        // Field panels
        const pCount = Math.max(2, Math.floor(w.len / 7));
        const pW = (w.len - 0.5) / pCount;
        for (let pi = 0; pi < pCount; pi++) {
            const pOffset = -w.len / 2 + pi * pW + pW / 2 + 0.25;
            const panelMat2 = mat(mixColor(wc, 0xFFFFFF, 0.15), 0.76, 0.02);
            panelMat2.polygonOffset = true; panelMat2.polygonOffsetFactor = -2; panelMat2.polygonOffsetUnits = -8;
            const panel = new THREE.Mesh(new THREE.PlaneGeometry(pW - 0.7, H - 3.5), panelMat2);
            panel.position.set(w.pos[0], cy + cy + H / 2 + 0.3, w.pos[2]);
            panel.rotation.set(...w.rot);
            // Offset along wall local X
            const off = new THREE.Vector3(pOffset, 0, 0.015);
            off.applyEuler(panel.rotation);
            panel.position.add(off);
            g.add(panel);
            // Gold panel border lines (thin box)
            const bOff = new THREE.Vector3(pOffset, -0.02, 0.02);
            bOff.applyEuler(panel.rotation);
            const pbH = new THREE.Mesh(new THREE.BoxGeometry(pW - 0.65, 0.05, 0.04), GOLD);
            pbH.position.set(w.pos[0], cy + cy + H / 2 - 0.25 + (H - 3.5) / 2, w.pos[2]); pbH.rotation.set(...w.rot); pbH.position.add(bOff); g.add(pbH);
            const pbH2 = pbH.clone(); pbH2.position.y = cy + cy + H / 2 + 0.3 - (H - 3.5) / 2 - 0.05; g.add(pbH2);
        }

        // Pilasters
        const pilCount = Math.max(2, Math.floor(w.len / 8));
        const pilStep = w.len / pilCount;
        for (let pi = 0; pi <= pilCount; pi++) {
            const plx = -w.len / 2 + pi * pilStep;
            const pil = new THREE.Mesh(new THREE.BoxGeometry(0.52, H - 0.4, 0.3), MARBLE);
            pil.position.set(w.pos[0], cy + H / 2, w.pos[2]); pil.rotation.set(...w.rot);
            const poff = new THREE.Vector3(plx, 0, 0.06);
            poff.applyEuler(pil.rotation);
            pil.position.add(poff);
            g.add(pil);
            // Capital
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.38, 0.42), GOLD);
            cap.position.copy(pil.position); cap.position.y = cy + H - 0.35;
            g.add(cap);
            // Base
            const base = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.28, 0.42), GOLD);
            base.position.copy(pil.position); base.position.y = cy + 0.14;
            g.add(base);
        }

        // Gold baseboard
        const bb = new THREE.Mesh(new THREE.BoxGeometry(w.len, 0.24, 0.08), GOLD);
        bb.position.set(w.pos[0], cy + 0.12, w.pos[2]); bb.rotation.set(...w.rot);
        g.add(bb);
    });
}

// ── Corner / wall columns ─────────────────────────────────────
function buildColumns(g, cx, cy, cz, W, H, D, MARBLE, GOLD, GOLDD) {
    const colH = H - 0.5;
    const positions = [];
    [-W / 2 + 2.8, W / 2 - 2.8].forEach(dx =>
        [-D / 2 + 2.8, D / 2 - 2.8].forEach(dz => positions.push([cx + dx, cz + dz]))
    );
    if (W > 40) [-W / 4, W / 4].forEach(dx => { positions.push([cx + dx, cz - D / 2 + 2.8]); positions.push([cx + dx, cz + D / 2 - 2.8]); });
    if (D > 40) [-D / 4, D / 4].forEach(dz => { positions.push([cx - W / 2 + 2.8, cz + dz]); positions.push([cx + W / 2 - 2.8, cz + dz]); });

    positions.forEach(([px, pz]) => {
        columnPositions.push([px, pz]); // record for collision
        addMesh(g, new THREE.CylinderGeometry(0.40, 0.50, colH, 16), MARBLE, px, cy + colH / 2, pz);
        addMesh(g, new THREE.CylinderGeometry(0.72, 0.40, 0.55, 16), GOLD, px, cy + colH + 0.28, pz);
        addMesh(g, new THREE.BoxGeometry(1.05, 0.2, 1.05), GOLD, px, cy + colH + 0.66, pz);
        addMesh(g, new THREE.CylinderGeometry(0.62, 0.62, 0.3, 16), GOLDD, px, cy + 0.15, pz);
        addMesh(g, new THREE.BoxGeometry(1.05, 0.18, 1.05), GOLDD, px, cy + 0.09, pz);
    });
}

// ── Crown cornices on all 4 sides ─────────────────────────────
function addCornices(g, cx, cy, cz, W, D, H, GOLD) {
    const hw = W / 2, hd = D / 2;
    // Top
    [[cx, cy + H - 0.2, cz - hd, W, 0],
    [cx, cy + H - 0.2, cz + hd, W, 0],
    [cx - hw, H - 0.2, cz, D, Math.PI / 2],
    [cx + hw, H - 0.2, cz, D, Math.PI / 2]].forEach(([x, y, z, len, ry]) => {
        addMesh(g, new THREE.BoxGeometry(len, 0.44, 0.36), GOLD, x, y, z, 0, ry);
    });
    // Floor
    [[cx, 0.32, cz - hd, W, 0],
    [cx, 0.32, cz + hd, W, 0],
    [cx - hw, 0.32, cz, D, Math.PI / 2],
    [cx + hw, 0.32, cz, D, Math.PI / 2]].forEach(([x, y, z, len, ry]) => {
        addMesh(g, new THREE.BoxGeometry(len, 0.3, 0.24), GOLD, x, y, z, 0, ry);
    });
}

// ── Crystal chandelier ────────────────────────────────────────
function addChandelier(g, x, y, z, GOLD, CRYSTAL) {
    // Chain + body
    addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), GOLD, x, y - 0.6, z);
    addMesh(g, new THREE.SphereGeometry(0.55, 14, 10), GOLD, x, y - 1.4, z);
    addMesh(g, new THREE.ConeGeometry(0.38, 0.8, 14), GOLD, x, y - 2.0, z);

    // Three tiers of arms
    [{ r: 1.6, n: 8, ay: y - 1.4 }, { r: 2.5, n: 12, ay: y - 1.8 }, { r: 3.4, n: 16, ay: y - 2.2 }].forEach(({ r, n, ay }) => {
        for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2;
            const ax = x + Math.cos(ang) * r, az = z + Math.sin(ang) * r;
            // arm
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, r, 6), GOLD);
            arm.rotation.set(0, ang, Math.PI / 2);
            arm.position.set((x + ax) / 2, ay, (z + az) / 2);
            g.add(arm);
            // Crystal drop — use SphereGeometry (OctahedronGeometry causes spikes)
            addMesh(g, new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 6, 5), CRYSTAL, ax, ay - 0.28 - Math.random() * 0.3, az);
            // candle
            addMesh(g, new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), mat(0xFFFAF0), ax, ay + 0.11, az);
            // flame
            addMesh(g, new THREE.SphereGeometry(0.055, 6, 5), mat(0xFFAA20, 0.1, 0, 0xFF8800, 1.5), ax, ay + 0.3, az);
        }
    });

    // Pendant crystal strands
    for (let s = 0; s < 28; s++) {
        const ang = (s / 28) * Math.PI * 2, r = 1.5 + Math.random() * 2.2;
        addMesh(g, new THREE.SphereGeometry(0.075 + Math.random() * 0.065, 6, 5), CRYSTAL,
            x + Math.cos(ang) * r, y - 2.6 - Math.random() * 0.9, z + Math.sin(ang) * r);
    }
    // Lights
    const pt = new THREE.PointLight(0xFFE890, 3.0, 45, 1.5);
    pt.position.set(x, y - 1.5, z); g.add(pt);
    const fill = new THREE.PointLight(0xFFCC50, 0.7, 24, 2);
    fill.position.set(x, y - 3.0, z); g.add(fill);
}

// ── Doorway builder ───────────────────────────────────────────
function buildDoorway(g, d, GOLD, GOLDD, MARBLE) {
    const DW = 6, DH = 9;
    const isNS = d.wall === 'N' || d.wall === 'S';
    const { cx, cy = 0, cz } = d;

    // Posts
    [-1, 1].forEach(side => {
        const px = isNS ? cx + side * (DW / 2 + 0.22) : cx;
        const pz = isNS ? cz : cz + side * (DW / 2 + 0.22);
        addMesh(g, new THREE.BoxGeometry(0.48, DH, 0.58), MARBLE, px, cy + cy + DH / 2, pz);
        addMesh(g, new THREE.BoxGeometry(0.75, 0.38, 0.75), GOLD, px, cy + cy + DH + 0.19, pz);
    });

    // Lintel
    addMesh(g, new THREE.BoxGeometry(isNS ? DW + 1.4 : 0.52, 0.46, isNS ? 0.52 : DW + 1.4), GOLD, cx, cy + cy + DH + 0.23, cz);

    // Arch (half-torus)
    const archGeo = new THREE.TorusGeometry(DW / 2, 0.2, 10, 26, Math.PI);
    const arch = new THREE.Mesh(archGeo, GOLD);
    arch.position.set(cx, cy + DH, cz);
    arch.rotation.x = Math.PI / 2;
    if (!isNS) arch.rotation.z = Math.PI / 2;
    g.add(arch);

    // Keystone
    addMesh(g, new THREE.SphereGeometry(0.26, 8, 8), GOLD, cx, cy + cy + DH + DW / 2 + 0.05, cz);

    // Decorative door panels
    [-1, 1].forEach(side => {
        const px = isNS ? cx + side * (DW / 4) : cx;
        const pz = isNS ? cz : cz + side * (DW / 4);
        const wDoor = isNS ? DW / 2 - 0.12 : 0.2;
        const dDoor = isNS ? 0.2 : DW / 2 - 0.12;
        addMesh(g, new THREE.BoxGeometry(wDoor, DH - 0.5, dDoor), mat(0x4A2E1A, 0.55, 0.05), px, cy + DH / 2 - 0.25, pz);
        // Inset gold
        addMesh(g, new THREE.BoxGeometry(wDoor * 0.75, DH * 0.35, isNS ? 0.12 : dDoor * 0.75),
            mat(0xD4A820, 0.1, 0.9, 0xA07808, 0.2), px, cy + cy + DH * 0.65, pz);
        addMesh(g, new THREE.BoxGeometry(wDoor * 0.75, DH * 0.3, isNS ? 0.12 : dDoor * 0.75),
            mat(0xD4A820, 0.1, 0.9, 0xA07808, 0.2), px, cy + cy + DH * 0.25, pz);
        // Door handle
        addMesh(g, new THREE.SphereGeometry(0.1, 8, 8), mat(0xD4A820, 0.08, 0.96),
            isNS ? cx + side * 0.45 : cx, cy + cy + 1.05, isNS ? cy + cz : cz + side * 0.45);
    });

    // INVISIBLE click trigger — transparent (NOT visible:false) so raycaster can hit it
    const trigGeo = new THREE.PlaneGeometry(DW - 1.0, DH - 1.5);
    const trigMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const trig = new THREE.Mesh(trigGeo, trigMat.clone());
    trig.position.set(cx, cy + DH / 2 - 0.5, cz);
    if (!isNS) trig.rotation.y = Math.PI / 2;
    trig.userData.targetRoom = d.roomB; trig.userData.isDoor = true;
    g.add(trig); doorClickables.push(trig);
    const trig2 = new THREE.Mesh(trigGeo.clone(), trigMat.clone());
    trig2.position.set(cx, cy + DH / 2 - 0.5, cz);
    if (!isNS) trig2.rotation.y = Math.PI / 2;
    trig2.userData.targetRoom = d.roomA; trig2.userData.isDoor = true;
    g.add(trig2); doorClickables.push(trig2);
}

// ── Room-specific decorations ─────────────────────────────────
function addGrandHallDecor(g, cx, cz, W, H, D, GOLD, MARBLE) {
    // Red carpet runner
    addMesh(g, new THREE.PlaneGeometry(4.2, D - 5), mat(0x8B0000, 0.75), cx, 0.02, cz, -Math.PI / 2);
    [-1.9, 1.9].forEach(bx => addMesh(g, new THREE.PlaneGeometry(0.2, D - 5), mat(0xD4A820, 0.12, 0.92), cx + bx, 0.021, cz, -Math.PI / 2));

    // Throne on north wall
    addMesh(g, new THREE.BoxGeometry(3.8, 0.52, 2.2), mat(0x8B0000, 0.55), cx, 0.92, cz - D / 2 + 3.2);
    addMesh(g, new THREE.BoxGeometry(3.8, 4.2, 0.44), mat(0x8B0000, 0.55), cx, 3.06, cz - D / 2 + 2.1);
    [-1.65, 1.65].forEach(ax => addMesh(g, new THREE.BoxGeometry(0.38, 0.38, 2.2), mat(0x8B0000, 0.55), cx + ax, 1.26, cz - D / 2 + 3.2));
    // Throne gold trim
    addMesh(g, new THREE.BoxGeometry(3.9, 0.22, 2.3), GOLD, cx, 1.21, cz - D / 2 + 3.2);
    addMesh(g, new THREE.BoxGeometry(3.9, 0.2, 0.12), GOLD, cx, 5.1, cz - D / 2 + 2.1);
    // Crown above throne
    addMesh(g, new THREE.TorusGeometry(0.65, 0.13, 8, 22), GOLD, cx, cy + H - 1.5, cz - D / 2 + 2.4);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        addMesh(g, new THREE.ConeGeometry(0.07, 0.4, 6), GOLD,
            cx + Math.cos(a) * 0.65, H - 1.1, cz - D / 2 + 2.4 + Math.sin(a) * 0.65);
    }

    // Tall mirror panels on east and west walls
    [-W / 2 + 1.4, W / 2 - 1.4].forEach((mx, mi) => {
        const mirMat = new THREE.MeshStandardMaterial({ color: 0xCCDDEE, roughness: 0, metalness: 0.98 });
        const mirr = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 6.5), mirMat);
        mirr.position.set(cx + mx, cy + cy + H / 2 + 0.3, cz);
        mirr.rotation.y = mi === 0 ? Math.PI / 2 : -Math.PI / 2;
        g.add(mirr);
        // Gold frame
        addMesh(g, new THREE.BoxGeometry(0.22, 7.2, 6.2), GOLD, cx + mx + (mi === 0 ? -0.12 : 0.12), cy + cy + H / 2 + 0.3, cz);
    });
}

function addGalleryDecor(g, cx, cz, W, H, D, GOLD) {
    // Parquet floor (warm wood)
    addMesh(g, new THREE.PlaneGeometry(W - 0.4, D - 0.4), mat(0xA07840, 0.55, 0.04), cx, 0.02, cz, -Math.PI / 2);

    // Painting frames on both long walls
    const colors = [0x4A6080, 0x806040, 0x608040, 0x804060, 0x406080, 0x708050, 0x607040, 0x805050, 0x505080, 0x607060];
    let ci = 0;
    for (let fz = cz - D / 2 + 5; fz < cz + D / 2 - 4; fz += 8) {
        [-W / 2 + 0.45, W / 2 - 0.45].forEach((mx, mi) => {
            const c = colors[(ci++) % colors.length];
            const canvas = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.5), mat(c, 0.92));
            canvas.position.set(cx + mx, H / 2 + 0.85, fz);
            canvas.rotation.y = mi === 0 ? Math.PI / 2 : -Math.PI / 2;
            g.add(canvas);
            // Frame
            addMesh(g, new THREE.BoxGeometry(0.22, 4.1, 6.1), GOLD, cx + mx + (mi === 0 ? -0.12 : 0.12), H / 2 + 0.85, fz);
            // Label plate
            addMesh(g, new THREE.BoxGeometry(1.8, 0.22, 0.05), mat(0xC8A030, 0.3, 0.8),
                cx + mx + (mi === 0 ? -0.14 : 0.14), H / 2 - 0.95, fz, 0, mi === 0 ? Math.PI / 2 : -Math.PI / 2);
        });
    }
}

function addArtifactsDecor(g, cx, cz, W, H, D, GOLD, MARBLE) {
    const artifactColors = [0xFF6030, 0x30CCFF, 0xA0FF50, 0xFFD020, 0xFF40C0, 0x40FFD0, 0xC060FF, 0xFF8030, 0x30FF80];
    const positions = [
        [cx - 14, cz - 14], [cx, cz - 14], [cx + 14, cz - 14],
        [cx - 14, cz], [cx + 14, cz],
        [cx - 14, cz + 14], [cx, cz + 14], [cx + 14, cz + 14],
    ];
    positions.forEach(([px, pz], i) => {
        // Pedestal
        addMesh(g, new THREE.CylinderGeometry(0.55, 0.65, 1.1, 14), MARBLE, px, 0.55, pz);
        addMesh(g, new THREE.CylinderGeometry(0.64, 0.55, 0.16, 14), GOLD, px, 1.18, pz);
        // Artifact orb
        const ac = artifactColors[i % artifactColors.length];
        const artMat = new THREE.MeshStandardMaterial({ color: ac, emissive: ac, emissiveIntensity: 0.65, roughness: 0.1, metalness: 0.3 });
        addMesh(g, new THREE.OctahedronGeometry(0.32, 1), artMat, px, 1.65, pz);
        const glow = new THREE.PointLight(ac, 1.4, 8, 2.2);
        glow.position.set(px, 1.9, pz); g.add(glow);
        // Glass dome
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0xCCEEFF, transparent: true, opacity: 0.2, roughness: 0, metalness: 0.1 }));
        dome.position.set(px, 1.18, pz); g.add(dome);
    });
}

function addSculptureDecor(g, cx, cz, W, H, D, GOLD, MARBLE) {
    // Bright skylight
    const sky = new THREE.PointLight(0xFFFFFF, 2.2, 55, 1.5);
    sky.position.set(cx, cy + H - 0.5, cz); g.add(sky);
    addMesh(g, new THREE.CircleGeometry(5.5, 32),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.55 }),
        cx, cy + H - 0.05, cz, Math.PI / 2);

    // Busts in a circle
    const sMat = mat(0xE0D8C8, 0.55, 0.02);
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2, r = 13;
        const sx = cx + Math.cos(ang) * r, sz = cz + Math.sin(ang) * r;
        addMesh(g, new THREE.CylinderGeometry(0.5, 0.62, 1.55, 12), MARBLE, sx, 0.78, sz);
        const tb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), sMat);
        tb.scale.set(1, 1.35, 0.82); tb.position.set(sx, 1.96, sz); g.add(tb);
        addMesh(g, new THREE.CylinderGeometry(0.14, 0.18, 0.3, 8), sMat, sx, 2.45, sz);
        addMesh(g, new THREE.SphereGeometry(0.28, 12, 8), sMat, sx, 2.72, sz);
    }

    // Central large statue on plinth
    const pMat = mat(0xF4EEE4, 0.45, 0.04);
    addMesh(g, new THREE.BoxGeometry(2.1, 2.8, 2.1), MARBLE, cx, 1.4, cz);
    addMesh(g, new THREE.CylinderGeometry(0.48, 0.58, 2.0, 12), pMat, cx, 3.8, cz);
    addMesh(g, new THREE.CylinderGeometry(0.14, 0.18, 0.32, 8), pMat, cx, 4.96, cz);
    addMesh(g, new THREE.SphereGeometry(0.36, 14, 10), pMat, cx, 5.32, cz);
    const a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), pMat);
    a1.rotation.z = Math.PI / 5; a1.position.set(cx - 0.62, 4.0, cz); g.add(a1);
    const a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), pMat);
    a2.rotation.z = -Math.PI / 5; a2.position.set(cx + 0.62, 4.0, cz); g.add(a2);
}

function addArchiveDecor(g, cx, cz, W, H, D, GOLD) {
    const woodMat = mat(0x4A2A08, 0.8, 0.02);
    const shelfMat = mat(0x3A1C06, 0.85, 0.02);
    const bookColors = [0x8B0000, 0x003366, 0x1A5C1A, 0x4A2A00, 0x4A0048, 0x003030, 0x602010, 0x004040];

    // Bookshelves on 3 walls
    const shelfWalls = [
        { x: cx - W / 2 + 0.9, z: cz, ry: Math.PI / 2, len: D - 5 },
        { x: cx + W / 2 - 0.9, z: cz, ry: -Math.PI / 2, len: D - 5 },
        { x: cx, z: cz - D / 2 + 0.9, ry: 0, len: W - 5 },
    ];
    shelfWalls.forEach(({ x, z, ry, len }) => {
        const isY = Math.abs(ry) < 0.01;
        // Bookcase back panel
        const bw = isY ? len : 0.18, bd = isY ? 0.18 : len;
        addMesh(g, new THREE.BoxGeometry(bw, H - 2, bd), woodMat, x, H / 2 + 0.5, z);
        // Shelves
        for (let sh = 1; sh <= 4; sh++) {
            const sw = isY ? len : 0.45, sd = isY ? 0.45 : len;
            addMesh(g, new THREE.BoxGeometry(sw, 0.08, sd), shelfMat, x, sh * 2.0 + 0.55, z);
            // Books
            const bookCount = Math.floor(len / 0.25);
            for (let b = 0; b < bookCount; b++) {
                const bw2 = 0.1 + Math.random() * 0.1, bh = 1.1 + Math.random() * 0.65;
                const bookM = mat(bookColors[Math.floor(Math.random() * bookColors.length)], 0.72);
                const bOff = -len / 2 + b * 0.24 + 0.14;
                const bx2 = isY ? x + bOff : x;
                const bz2 = isY ? z : z + bOff;
                const bookW = isY ? bw2 : 0.28, bookD = isY ? 0.28 : bw2;
                addMesh(g, new THREE.BoxGeometry(bookW, bh, bookD), bookM, bx2, sh * 2.0 + 0.55 + bh / 2 + 0.04, bz2);
            }
        }
    });

    // Reading desk
    addMesh(g, new THREE.BoxGeometry(3.2, 0.9, 1.9), woodMat, cx, 0.45, cz);
    addMesh(g, new THREE.BoxGeometry(3.0, 0.1, 1.7), mat(0x5A3810, 0.55, 0.04), cx, 0.92, cz);
    // Desk lamp
    addMesh(g, new THREE.CylinderGeometry(0.14, 0.18, 0.12, 8), GOLD, cx + 0.85, 0.98, cz - 0.45);
    addMesh(g, new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6), GOLD, cx + 0.85, 1.3, cz - 0.45);
    addMesh(g, new THREE.ConeGeometry(0.25, 0.32, 8), mat(0x1A3A10, 0.5, 0.08), cx + 0.85, 1.78, cz - 0.45, Math.PI);
    const lampPt = new THREE.PointLight(0xFFE870, 2.8, 14, 2.2);
    lampPt.position.set(cx + 0.85, 1.45, cz - 0.45); g.add(lampPt);
}

// ── Colour math helpers ───────────────────────────────────────
function mixColor(hex, mix, amount) {
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
    const r = lerp((hex >> 16) & 0xFF, (mix >> 16) & 0xFF, amount);
    const gg = lerp((hex >> 8) & 0xFF, (mix >> 8) & 0xFF, amount);
    const b = lerp(hex & 0xFF, mix & 0xFF, amount);
    return (r << 16) | (gg << 8) | b;
}

// ── Room detection + teleports (re-exported) ─────────────────
export function detectRoom(x, z) {
    for (const [id, def] of Object.entries(ROOM_DATA)) {
        const [cx, cy, cz] = def.center;
        const [W, , D] = def.size;
        if (Math.abs(x - cx) < W / 2 && Math.abs(z - cz) < D / 2) return id;
    }
    return null;
}

// ── Second Floor Balcony (U-Shape) ────────────────────────────
function buildSecondFloorBalcony(g, cx, cy, cz, W, H, D, MARBLE, GOLD, GOLDD) {
    const floorH = 12; // 2nd floor height
    const bw = 10; // Balcony width
    const balcMat = new THREE.MeshStandardMaterial({ color: 0xE8DCC8, roughness: 0.3 });

    // West balcony (x: -25 to -15)
    addMesh(g, new THREE.BoxGeometry(bw, 0.4, D), balcMat, cx - W / 2 + bw / 2, floorH - 0.2, cz);
    // East balcony (x: 15 to 25)
    addMesh(g, new THREE.BoxGeometry(bw, 0.4, D), balcMat, cx + W / 2 - bw / 2, floorH - 0.2, cz);
    // North balcony (z: -25 to -15) bridging W/E
    addMesh(g, new THREE.BoxGeometry(W - 2 * bw, 0.4, bw), balcMat, cx, floorH - 0.2, cz - D / 2 + bw / 2);

    // Railings
    const railMat = mat(0xD4A820, 0.1, 0.9);
    const railH = 1.0;

    // Helper to draw railing
    const drawRailing = (rx, rz, rW, rD) => {
        addMesh(g, new THREE.BoxGeometry(rW || 0.1, railH, rD || 0.1), railMat, rx, floorH + railH / 2, rz);
        // Handrail top
        addMesh(g, new THREE.BoxGeometry(rW ? rW : 0.2, 0.1, rD ? rD : 0.2), mat(0x4A2E1A), rx, floorH + railH, rz);
    };

    // West railing (x=-15)
    drawRailing(cx - W / 2 + bw, cz + bw / 2, 0.1, D - bw);
    // East railing (x=15)
    drawRailing(cx + W / 2 - bw, cz + bw / 2, 0.1, D - bw);
    // North railing (z=-15)
    drawRailing(cx, cz - D / 2 + bw, W - 2 * bw, 0.1);

    // Spindles (balusters)
    const spindleG = new THREE.CylinderGeometry(0.04, 0.04, railH, 8);
    for (let z = cz - D / 2 + bw; z < cz + D / 2; z += 0.5) {
        addMesh(g, spindleG, GOLD, cx - W / 2 + bw, floorH + railH / 2, z);
        addMesh(g, spindleG, GOLD, cx + W / 2 - bw, floorH + railH / 2, z);
    }
    for (let x = cx - W / 2 + bw; x < cx + W / 2 - bw; x += 0.5) {
        addMesh(g, spindleG, GOLD, x, floorH + railH / 2, cz - D / 2 + bw);
    }
}

// ── Grand Staircase ───────────────────────────────────────────
function buildGrandStaircase(g, cx, cy, cz, MARBLE, GOLD) {
    // Grand staircase from South side (z=25) up to West/East balconies (y=12)
    // 1. Central flight: z=10 to z=21, y=0 to y=6 (width=8)
    // 2. Mid landing: z=21 to z=25, x=-4 to 4, y=6
    // 3. Left flight: x=-4 to -15, y=6 to 12, z=21 to 25
    // 4. Right flight: x=4 to 15, y=6 to 12, z=21 to 25

    const stairMat = mat(0xE8DCC8, 0.3);
    const carpetMat = mat(0x8B0000, 0.9); // Red carpet

    // Central flight
    const steps1 = 20;
    const dy1 = 6 / steps1;
    const dz1 = 11 / steps1;
    for (let i = 0; i < steps1; i++) {
        const y = cy + i * dy1;
        const z = cz + 10 + i * dz1;
        addMesh(g, new THREE.BoxGeometry(8, dy1, dz1), stairMat, cx, y + dy1 / 2, z + dz1 / 2);
        addMesh(g, new THREE.BoxGeometry(4, dy1 + 0.01, dz1 + 0.01), carpetMat, cx, y + dy1 / 2, z + dz1 / 2);
    }

    // Landing
    addMesh(g, new THREE.BoxGeometry(8, 0.4, 4), stairMat, cx, cy + 6 - 0.2, cz + 23);
    addMesh(g, new THREE.PlaneGeometry(8, 4), carpetMat, cx, cy + 6.01, cz + 23, -Math.PI / 2);

    // Left flight (goes West to x=-15)
    const steps2 = 20;
    const dy2 = 6 / steps2;
    const dx2 = 11 / steps2; // from x=-4 to x=-15
    for (let i = 0; i < steps2; i++) {
        const y = cy + 6 + i * dy2;
        const x = cx - 4 - i * dx2;
        addMesh(g, new THREE.BoxGeometry(dx2, dy2, 4), stairMat, x - dx2 / 2, y + dy2 / 2, cz + 23);
        addMesh(g, new THREE.BoxGeometry(dx2 + 0.01, dy2 + 0.01, 2), carpetMat, x - dx2 / 2, y + dy2 / 2, cz + 23);
    }

    // Right flight (goes East to x=15)
    for (let i = 0; i < steps2; i++) {
        const y = cy + 6 + i * dy2;
        const x = cx + 4 + i * dx2;
        addMesh(g, new THREE.BoxGeometry(dx2, dy2, 4), stairMat, x + dx2 / 2, y + dy2 / 2, cz + 23);
        addMesh(g, new THREE.BoxGeometry(dx2 + 0.01, dy2 + 0.01, 2), carpetMat, x + dx2 / 2, y + dy2 / 2, cz + 23);
    }
}


