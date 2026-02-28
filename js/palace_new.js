// js/palace.js  â€”â€”  Glomer Thai-Style Palace Exterior
// Fixed ExtrudeGeometry positioning: mesh.position.set(cx, baseY, cz-depth/2)
// (no w/2 offset needed since shape is already centered on X axis)
import * as THREE from 'three';

export const exteriorClickables = [];

export function buildExterior(scene) {
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0xB8DCF0, 180, 400);
    addClouds(scene);

    // Ground
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(500, 500),
        new THREE.MeshStandardMaterial({ color: 0x3E9A2C, roughness: 0.95 }));
    lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true;
    scene.add(lawn);

    // Stone path
    const path = new THREE.Mesh(new THREE.PlaneGeometry(14, 65),
        new THREE.MeshStandardMaterial({ color: 0xCEC4A0, roughness: 0.85 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 35);
    scene.add(path);

    // Palace
    const pg = new THREE.Group(); pg.name = 'palace';
    buildPalace(pg);
    scene.add(pg);

    addGarden(scene);

    const sun = new THREE.DirectionalLight(0xFFF8E8, 2.8);
    sun.position.set(40, 90, 60); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xD4E8FF, 1.0));
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x3E9A2C, 0.45));

    return pg;
}

function buildPalace(g) {
    const M = {
        white: new THREE.MeshStandardMaterial({ color: 0xF8F2E8, roughness: 0.5 }),
        cream: new THREE.MeshStandardMaterial({ color: 0xEDE0C4, roughness: 0.55 }),
        brick: new THREE.MeshStandardMaterial({ color: 0x8B3A22, roughness: 0.85 }),
        gold: new THREE.MeshStandardMaterial({ color: 0xCFA020, roughness: 0.12, metalness: 0.95, emissive: 0x9A7010, emissiveIntensity: 0.3 }),
        roofR: new THREE.MeshStandardMaterial({ color: 0x9A1C0E, roughness: 0.6 }),
        roofO: new THREE.MeshStandardMaterial({ color: 0xBD400E, roughness: 0.6 }),
        door: new THREE.MeshStandardMaterial({ color: 0x1A3520, roughness: 0.4 }),
        glass: new THREE.MeshStandardMaterial({ color: 0x162820, transparent: true, opacity: 0.8 }),
        wtrim: new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4 }),
    };

    const bx = (w, h, d, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    const cy = (rT, rB, h, s, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, s), mat);
        m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
    };

    // CORRECT roof prism: shape from -w/2 to +w/2, mesh positioned at (cx, baseY, cz-depth/2)
    // Ridge apex is at world (cx, baseY+rise, cz)
    const Z0 = 0.5; // center Z of all front-facing elements
    const roof = (cx, cz, y0, w, depth, rise, mat) => {
        const sh = new THREE.Shape();
        sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, rise); sh.closePath();
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }), mat);
        // Correct: cx centers the shape since shape spans -w/2 to +w/2
        m.position.set(cx, y0, cz - depth / 2);
        m.castShadow = true; g.add(m);
        // Return apex Y for spire placement
        return y0 + rise;
    };

    // BASE
    bx(110, 1.0, 16, M.wtrim, 0, 0.5, 0);
    bx(104, 1.0, 15, M.wtrim, 0, 1.5, 0);
    bx(96, 1.0, 14, M.wtrim, 0, 2.5, 0);
    bx(88, 4.5, 13, M.brick, 0, 5.25, 0);
    bx(90, 0.5, 13.5, M.gold, 0, 7.75, 0);

    // FLOOR 1
    bx(84, 9.0, 12, M.cream, 0, 12.5, 0);
    bx(84, 0.5, 12, M.gold, 0, 8.3, 0);
    bx(2, 10.0, 13, M.gold, -43, 11.5, 0);
    bx(2, 10.0, 13, M.gold, 43, 11.5, 0);

    [-32, -24, -16, -8, 8, 16, 24, 32].forEach(x => {
        bx(3.8, 6.2, 0.4, M.glass, x, 12.0, -6.1);
        const at = new THREE.Mesh(new THREE.SphereGeometry(1.9, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), M.glass);
        at.rotation.x = -Math.PI / 2; at.position.set(x, 15.1, -6.1); g.add(at);
        bx(0.35, 6.8, 0.4, M.gold, x - 2.15, 12.0, -5.9);
        bx(0.35, 6.8, 0.4, M.gold, x + 2.15, 12.0, -5.9);
        bx(4.3, 0.3, 0.4, M.gold, x, 8.7, -5.9);
    });

    // Balcony
    bx(85, 0.4, 4, M.wtrim, 0, 17.4, -3.5);
    for (let x = -41; x <= 41; x += 1.1) cy(0.07, 0.07, 2, 8, M.wtrim, x, 16.4, -5.0);
    bx(85, 0.3, 0.35, M.gold, 0, 17.25, -5.2);
    bx(85, 0.3, 0.35, M.gold, 0, 15.4, -5.0);

    // FLOOR 2
    bx(80, 7.0, 11, M.cream, 0, 20.5, 0);
    bx(80, 0.5, 11, M.gold, 0, 17.1, 0);
    bx(80, 0.5, 11, M.gold, 0, 24.1, 0);
    [-28, -18, -8, 8, 18, 28].forEach(x => {
        bx(3.2, 5.0, 0.38, M.glass, x, 20.0, -5.6);
        const at2 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), M.glass);
        at2.rotation.x = -Math.PI / 2; at2.position.set(x, 22.5, -5.6); g.add(at2);
        bx(0.3, 5.5, 0.4, M.gold, x - 1.9, 20.0, -5.5);
        bx(0.3, 5.5, 0.4, M.gold, x + 1.9, 20.0, -5.5);
    });

    // â”€â”€ THAI TIERED ROOFS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // y0 = where roof base starts. Roof sits on top of floor 2 (y=24.1).
    // Each tier baseY slightly overlaps the one below for seamless look.
    const r1top = roof(0, Z0, 24.5, 88, 15, 9, M.roofR);  // apex at 24.5+9=33.5
    const r2top = roof(0, Z0, 30.5, 68, 13, 8, M.roofO);  // apex at 30.5+8=38.5
    const r3top = roof(0, Z0, 36.0, 50, 11, 7, M.roofR);  // apex at 36+7=43

    // Thin gold fascia at the front face of each roof tier
    // Front face z of tier1 = Z0 - 15/2 = 0.5-7.5 = -7; similarly for tier2=-6, tier3=-5
    bx(90, 0.55, 0.4, M.gold, 0, 24.5, -7.0);  // tier 1 front
    bx(70, 0.55, 0.4, M.gold, 0, 30.5, -6.0);  // tier 2 front
    bx(52, 0.55, 0.4, M.gold, 0, 36.0, -5.0);  // tier 3 front
    // Fill gap between tiers with cream panels to avoid dark undersides showing
    bx(88, 6.8, 0.4, M.cream, 0, 27.9, -6.0);  // between tier 1 and 2
    bx(68, 6.2, 0.4, M.cream, 0, 34.1, -5.0);  // between tier 2 and 3

    // â”€â”€ GOLDEN SPIRES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // r3top = 43 = bottom of central spire
    const sZ = Z0;
    const sY = r3top; // = 43
    // Stacked cylinders tapering upward
    cy(1.8, 2.0, 0.8, 12, M.gold, 0, sY + 0.4, sZ);
    cy(1.5, 1.8, 1.0, 12, M.gold, 0, sY + 1.3, sZ);
    cy(1.2, 1.5, 1.2, 12, M.gold, 0, sY + 2.5, sZ);
    cy(0.9, 1.2, 1.5, 10, M.gold, 0, sY + 3.95, sZ);
    cy(0.65, 0.9, 2.0, 10, M.gold, 0, sY + 5.7, sZ);
    cy(0.4, 0.65, 2.5, 8, M.gold, 0, sY + 7.95, sZ);
    cy(0.2, 0.4, 3.0, 8, M.gold, 0, sY + 10.7, sZ);
    cy(0.06, 0.2, 2.5, 6, M.gold, 0, sY + 13.45, sZ);
    cy(0.02, 0.06, 2.0, 6, M.gold, 0, sY + 15.7, sZ); // needle

    // Flanking spires on r2 ridge: y = r2top = 38.5
    const fY = r2top; // = 38.5
    [-14, 14].forEach(fx => {
        cy(0.8, 0.95, 0.5, 10, M.gold, fx, fY + 0.25, sZ);
        cy(0.6, 0.8, 0.8, 10, M.gold, fx, fY + 0.9, sZ);
        cy(0.4, 0.6, 1.2, 8, M.gold, fx, fY + 1.9, sZ);
        cy(0.22, 0.4, 1.5, 8, M.gold, fx, fY + 3.2, sZ);
        cy(0.08, 0.22, 2.0, 6, M.gold, fx, fY + 4.75, sZ);
        cy(0.02, 0.08, 1.5, 6, M.gold, fx, fY + 6.75, sZ);
    });

    // â”€â”€ SIDE WINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    [-55, 55].forEach(wx => {
        bx(22, 18, 12, M.cream, wx, 10, 0);
        bx(22, 5, 12, M.brick, wx, 4, 0);
        bx(23, 0.5, 13, M.gold, wx, 7.3, 0);
        bx(23, 0.5, 13, M.gold, wx, 19.05, 0);
        [-6, 0, 6].forEach(dx => bx(3.2, 5, 0.35, M.glass, wx + dx, 10.5, -6.1));
        const wr1 = roof(wx, Z0, 19.0, 28, 14, 8, M.roofR);  // apex = 27
        const wr2 = roof(wx, Z0, 25.0, 20, 12, 7, M.roofO);  // apex = 32
        bx(30, 0.5, 15, M.gold, wx, 19.0, Z0);
        bx(22, 0.5, 13, M.gold, wx, 25.0, Z0);
        // Wing spire from wr2 apex = 32
        const wY = wr2; // = 32
        cy(0.9, 1.05, 0.5, 10, M.gold, wx, wY + 0.25, sZ);
        cy(0.65, 0.9, 1.0, 10, M.gold, wx, wY + 1.0, sZ);
        cy(0.4, 0.65, 1.5, 8, M.gold, wx, wY + 2.0, sZ);
        cy(0.18, 0.4, 2.0, 8, M.gold, wx, wY + 3.25, sZ);
        cy(0.05, 0.18, 1.5, 6, M.gold, wx, wY + 5.0, sZ);
    });

    // Connectors
    [-36, 36].forEach(cx2 => {
        bx(14, 14, 12, M.cream, cx2, 8, 0);
        const cr = roof(cx2, Z0, 14.5, 16, 13, 6, M.roofR);
        bx(16, 0.5, 14, M.gold, cx2, 14.5, Z0);
    });

    // â”€â”€ ENTRANCE DOOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bx(4.8, 7.5, 0.4, M.door, -2.8, 8.3, -6.3);
    bx(4.8, 7.5, 0.4, M.door, 2.8, 8.3, -6.3);
    bx(11, 0.45, 0.5, M.gold, 0, 12.2, -6.1);
    bx(0.55, 8.5, 0.55, M.gold, -6.2, 8.5, -6.1);
    bx(0.55, 8.5, 0.55, M.gold, 6.2, 8.5, -6.1);
    const archG = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.38, 8, 20, Math.PI), M.gold);
    archG.position.set(0, 12.2, -6.1); archG.castShadow = true; g.add(archG);
    bx(0.35, 7.8, 0.45, M.gold, 0, 8.3, -6.1);
    cy(0.9, 0.9, 0.22, 10, M.gold, 0, 8.3, -6.05);

    const trig = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 12),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    trig.position.set(0, 8.5, -5.8);
    trig.userData.clickable = 'enter';
    g.add(trig);
    exteriorClickables.push(trig);

    // Steps
    for (let s = 0; s < 4; s++) bx(18, 0.6, 2.8, M.wtrim, 0, 3.5 + s * 0.65, -4.2 + s * 2.2);

    // Flags
    const fR = new THREE.MeshStandardMaterial({ color: 0xCC2020, side: THREE.DoubleSide });
    const fB = new THREE.MeshStandardMaterial({ color: 0x1535B0, side: THREE.DoubleSide });
    [-30, -20, 20, 30].forEach((x, i) => {
        cy(0.08, 0.10, 14, 6, M.wtrim, x, 10, -6.2);
        bx(4.5, 2.5, 0.06, i % 2 === 0 ? fR : fB, x + 2.5, 17.5, -6.2);
    });
}

function addGarden(scene) {
    const trunkM = new THREE.MeshStandardMaterial({ color: 0x4A3010, roughness: 0.9 });
    const foliageM = new THREE.MeshStandardMaterial({ color: 0x267820, roughness: 0.8 });
    const lampM = new THREE.MeshStandardMaterial({ color: 0x1A4020, roughness: 0.5, metalness: 0.4 });
    const globeM = new THREE.MeshStandardMaterial({ color: 0xFFFFE8, roughness: 0, emissive: 0xFFFFCC, emissiveIntensity: 0.5 });
    const fl1M = new THREE.MeshStandardMaterial({ color: 0xE02020 });
    const fl2M = new THREE.MeshStandardMaterial({ color: 0xFFCC00 });

    [[-15, 20, 7, 3], [15, 20, 7, 3], [-15, 36, 8, 3.5], [15, 36, 8, 3.5],
    [-20, 55, 9, 4], [20, 55, 9, 4], [-48, 28, 8, 3.5], [48, 28, 8, 3.5],
    [-55, 10, 7, 3.2], [55, 10, 7, 3.2]
    ].forEach(([x, z, h, fr]) => {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, h, 8), trunkM);
        t.position.set(x, h / 2, z); scene.add(t);
        [0, 0.65].forEach((ly, i) => {
            const f = new THREE.Mesh(new THREE.SphereGeometry(fr * (1 - i * 0.2), 10, 7), foliageM);
            f.scale.y = 0.75; f.position.set(x, h + fr * (0.45 + ly * 0.6), z); scene.add(f);
        });
    });

    const hM = new THREE.MeshStandardMaterial({ color: 0x267A14, roughness: 0.9 });
    [-20, 20].forEach(hx => {
        for (let hz = 6; hz < 55; hz += 3) {
            const s = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), hM);
            s.position.set(hx, 0.75, hz); scene.add(s);
        }
    });

    [[0, 12], [-10, 8], [10, 8], [-22, 20], [22, 20]].forEach(([x, z]) => {
        const fb = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.2, 16),
            new THREE.MeshStandardMaterial({ color: 0x3A8A28 }));
        fb.position.set(x, 0.1, z); scene.add(fb);
        for (let a = 0; a < 10; a++) {
            const ang = a / 10 * Math.PI * 2;
            const f = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4), a % 2 === 0 ? fl1M : fl2M);
            f.position.set(x + Math.cos(ang) * 1.6, 0.3, z + Math.sin(ang) * 1.6);
            scene.add(f);
        }
    });

    [[-22, 4], [22, 4], [-22, 20], [22, 20], [-22, 38], [22, 38]].forEach(([lx, lz]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6, 8), lampM);
        post.position.set(lx, 3, lz); scene.add(post);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.1), lampM);
        arm.position.set(lx + 1, 6.2, lz); scene.add(arm);
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), globeM);
        globe.position.set(lx + 2.1, 6.2, lz); scene.add(globe);
    });

    [[-8, 4], [8, 4]].forEach(([x, z]) => {
        const u = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.42, 1.3, 10),
            new THREE.MeshStandardMaterial({ color: 0xC8A855, roughness: 0.45 }));
        u.position.set(x, 1, z); scene.add(u);
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x228820 }));
        p.scale.y = 0.8; p.position.set(x, 2, z); scene.add(p);
    });
}

function addClouds(scene) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 1, transparent: true, opacity: 0.88 });
    [[45, 70, -80], [-55, 62, -90], [80, 75, -60], [-35, 68, -65], [15, 58, -100]].forEach(([cx, cy_, cz]) => {
        [[-3, 0, 0], [3, 0, 0], [0, 2.5, -2], [0, 0, 4]].forEach(([dx, dy, dz]) => {
            const c = new THREE.Mesh(new THREE.SphereGeometry(6 + Math.random() * 5, 8, 6), mat);
            c.position.set(cx + dx * 2.6, cy_ + dy, cz + dz); c.scale.y = 0.38 + Math.random() * 0.18;
            scene.add(c);
        });
    });
}
