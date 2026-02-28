// js/museum.js
// ══════════════════════════════════════════════════════════
//  Builds the 5 interior palace museum rooms
// ══════════════════════════════════════════════════════════
import * as THREE from 'three';

// Room definitions: center XZ, size WxHxD
export const ROOM_DATA = {
    grand_hall: { name: 'Đại Sảnh', center: [0, 0, 0], size: [50, 10, 50], color: 0xD6C9A8, floorColor: 0xE8E0D0 },
    painting_gallery: { name: 'Phòng Tranh', center: [-65, 0, 0], size: [26, 10, 60], color: 0xCEC0A0, floorColor: 0xDDD5C5 },
    artifacts_room: { name: 'Phòng Hiện Vật', center: [65, 0, 0], size: [50, 10, 50], color: 0xC8BAA0, floorColor: 0xD8D0C0 },
    sculpture_room: { name: 'Phòng Điêu Khắc', center: [0, 0, -65], size: [50, 10, 50], color: 0xD8CCAC, floorColor: 0xEAE0D0 },
    archive_room: { name: 'Phòng Lưu Trữ', center: [0, 0, 65], size: [50, 10, 50], color: 0xC0B498, floorColor: 0xD0C8B8 },
};

// Doorways (portals between rooms)
// Each doorway is a gap in the wall at given position/side
const DOORWAYS = [
    { roomA: 'grand_hall', roomB: 'painting_gallery', wall: 'W', x: -25, z: 0, w: 7, h: 7.5 },
    { roomA: 'grand_hall', roomB: 'artifacts_room', wall: 'E', x: 25, z: 0, w: 7, h: 7.5 },
    { roomA: 'grand_hall', roomB: 'sculpture_room', wall: 'N', x: 0, z: -25, w: 7, h: 7.5 },
    { roomA: 'grand_hall', roomB: 'archive_room', wall: 'S', x: 0, z: 25, w: 7, h: 7.5 },
];

export function buildInterior(scene) {
    const interiorGroup = new THREE.Group();
    interiorGroup.name = 'interior';

    // Materials
    const wallMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xC9A84C, roughness: 0.2, metalness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88CCFF, roughness: 0, metalness: 0.1, transparent: true, opacity: 0.18 });

    function createMarbleTexture(baseColor) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, 512, 512);
        // Marble veins
        ctx.strokeStyle = 'rgba(180,170,150,0.2)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 18; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            for (let j = 0; j < 6; j++) ctx.lineTo(Math.random() * 512, Math.random() * 512);
            ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return tex;
    }

    function addRoom(roomId, roomDef) {
        const [cx, , cz] = roomDef.center;
        const [W, H, D] = roomDef.size;
        const hw = W / 2, hh = H / 2, hd = D / 2;
        const wc = roomDef.color;
        const fc = roomDef.floorColor;

        // Floor
        const floorTex = createMarbleTexture(fc);
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(W, D),
            new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4, metalness: 0.05 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(cx, 0.01, cz);
        floor.receiveShadow = true;
        interiorGroup.add(floor);

        // Ceiling
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(W, D),
            new THREE.MeshStandardMaterial({ color: 0xE8E0CC, roughness: 0.9 })
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(cx, H, cz);
        interiorGroup.add(ceiling);

        // Walls (4 panels, with doorway gaps handled separately)
        const walls = [
            { name: `${roomId}_N`, pos: [cx, hh, cz - hd], rot: [0, 0, 0], size: [W, H] },
            { name: `${roomId}_S`, pos: [cx, hh, cz + hd], rot: [0, Math.PI, 0], size: [W, H] },
            { name: `${roomId}_W`, pos: [cx - hw, hh, cz], rot: [0, Math.PI / 2, 0], size: [D, H] },
            { name: `${roomId}_E`, pos: [cx + hw, hh, cz], rot: [0, -Math.PI / 2, 0], size: [D, H] },
        ];

        walls.forEach(w => {
            const mat = new THREE.MeshStandardMaterial({ color: wc, roughness: 0.8, metalness: 0.02 });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w.size[0], w.size[1]), mat);
            mesh.position.set(...w.pos);
            mesh.rotation.set(...w.rot);
            mesh.receiveShadow = true;
            mesh.name = w.name;
            interiorGroup.add(mesh);

            // Baseboard (gold)
            const board = new THREE.Mesh(new THREE.BoxGeometry(w.size[0], 0.3, 0.05), goldMat);
            board.position.set(...w.pos);
            board.rotation.set(...w.rot);
            board.position.y = 0.15;
            interiorGroup.add(board);

            // Crown molding (gold)
            const crown = new THREE.Mesh(new THREE.BoxGeometry(w.size[0], 0.25, 0.06), goldMat);
            crown.position.set(...w.pos);
            crown.rotation.set(...w.rot);
            crown.position.y = H - 0.12;
            interiorGroup.add(crown);

            // Wall pilasters (decorative columns every 8 units)
            const pilCount = Math.floor(w.size[0] / 8);
            for (let pi = 0; pi < pilCount; pi++) {
                const offset = -w.size[0] / 2 + (pi + 0.5) * (w.size[0] / pilCount);
                const pil = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, H - 0.6, 0.12),
                    new THREE.MeshStandardMaterial({ color: wc, roughness: 0.7 })
                );
                pil.position.set(...w.pos);
                pil.rotation.set(...w.rot);
                // Apply local offset along wall
                const localOff = new THREE.Vector3(offset, 0, 0);
                localOff.applyEuler(new THREE.Euler(...w.rot));
                pil.position.add(localOff);
                pil.position.y = H / 2;
                interiorGroup.add(pil);
            }
        });

        // Chandelier
        addChandelier(cx, H - 0.3, cz, interiorGroup);
        if (W > 40 || D > 40) {
            addChandelier(cx - W / 4, H - 0.3, cz, interiorGroup);
            addChandelier(cx + W / 4, H - 0.3, cz, interiorGroup);
        }
        if (D > 50) {
            addChandelier(cx, H - 0.3, cz - D / 4, interiorGroup);
            addChandelier(cx, H - 0.3, cz + D / 4, interiorGroup);
        }
    }

    function addChandelier(x, y, z, group) {
        const goldM = new THREE.MeshStandardMaterial({ color: 0xC9A84C, roughness: 0.2, metalness: 0.9 });
        const crystalM = new THREE.MeshStandardMaterial({ color: 0xDDEEFF, roughness: 0, metalness: 0.1, transparent: true, opacity: 0.75 });

        // Main chain
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), goldM);
        chain.position.set(x, y - 0.4, z);
        group.add(chain);

        // Central body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), goldM);
        body.position.set(x, y - 1.0, z);
        group.add(body);

        // Candle arms (6 arms)
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const ax = x + Math.cos(angle) * 1.2;
            const az = z + Math.sin(angle) * 1.2;
            // Arm
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), goldM);
            arm.rotation.z = Math.PI / 2;
            arm.rotation.y = angle;
            arm.position.set((x + ax) / 2, y - 1.0, (z + az) / 2);
            group.add(arm);
            // Crystal drop
            const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), crystalM);
            drop.position.set(ax, y - 1.35, az);
            group.add(drop);
        }

        // Light source
        const light = new THREE.PointLight(0xFFE8A0, 2.5, 35, 1.2);
        light.position.set(x, y - 1.1, z);
        group.add(light);
        // Secondary warm fill
        const fill = new THREE.PointLight(0xFFD080, 0.6, 20, 2);
        fill.position.set(x, y - 2.5, z);
        group.add(fill);
    }

    // Build all rooms
    Object.entries(ROOM_DATA).forEach(([id, def]) => addRoom(id, def));

    // ── Doorway trim (gold arches over portals) ────────────
    DOORWAYS.forEach(d => {
        const isNS = d.wall === 'N' || d.wall === 'S';
        const [ax, az] = [d.x, d.z];
        const trimW = d.w + 1.4;

        // Door frame sides
        const frameH = d.h + 0.5;
        const frameMat = goldMat;

        // Left post
        const lp = new THREE.Mesh(new THREE.BoxGeometry(0.3, frameH, 0.4), frameMat);
        lp.position.set(ax + (isNS ? -d.w / 2 - 0.15 : 0), frameH / 2, az + (isNS ? 0 : -d.w / 2 - 0.15));
        interiorGroup.add(lp);
        // Right post
        const rp = lp.clone();
        rp.position.set(ax + (isNS ? d.w / 2 + 0.15 : 0), frameH / 2, az + (isNS ? 0 : d.w / 2 + 0.15));
        interiorGroup.add(rp);
        // Lintel
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(isNS ? trimW : 0.4, 0.3, isNS ? 0.4 : trimW), frameMat);
        lintel.position.set(ax, d.h + 0.15, az);
        interiorGroup.add(lintel);
    });

    // ── Global interior lighting ───────────────────────────
    scene.add(new THREE.AmbientLight(0xFFEDD0, 0.8));
    // Warm directional fill
    const dirLight = new THREE.DirectionalLight(0xFFE0A0, 0.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    scene.add(interiorGroup);
    return interiorGroup;
}

// Player room detection — returns current roomId based on camera XZ
export function detectRoom(x, z) {
    for (const [id, def] of Object.entries(ROOM_DATA)) {
        const [cx, , cz] = def.center;
        const [W, , D] = def.size;
        if (Math.abs(x - cx) < W / 2 && Math.abs(z - cz) < D / 2) return id;
    }
    return null;
}

// Teleport target positions for room nav buttons
export const ROOM_TELEPORTS = {
    grand_hall: [0, 1.7, 0],
    painting_gallery: [-65, 1.7, 0],
    artifacts_room: [65, 1.7, 0],
    sculpture_room: [0, 1.7, -65],
    archive_room: [0, 1.7, 65],
};
