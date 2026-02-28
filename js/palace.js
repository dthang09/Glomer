// js/palace.js — Glomer Palace Exterior (High Detail)
import * as THREE from 'three';

export const exteriorClickables = [];

export function buildExterior(scene) {
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0xC8E8FF, 0.0025);

    addClouds(scene);

    // Ground lawn
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(600, 600),
        new THREE.MeshStandardMaterial({ color: 0x3E9A2C, roughness: 0.92 }));
    lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true;
    scene.add(lawn);

    // Wide stone plaza
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(120, 75),
        new THREE.MeshStandardMaterial({ color: 0xD4CDB4, roughness: 0.8 }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.005, 15);
    scene.add(plaza);

    // Central path + edge borders
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xC8BC9A, roughness: 0.85 });
    const path = new THREE.Mesh(new THREE.PlaneGeometry(14, 80), pathMat);
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 35);
    scene.add(path);
    [-7.5, 7.5].forEach(px => {
        const border = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 80),
            new THREE.MeshStandardMaterial({ color: 0x8A7A5A, roughness: 0.88 }));
        border.rotation.x = -Math.PI / 2; border.position.set(px, 0.012, 35);
        scene.add(border);
    });

    const pg = new THREE.Group(); pg.name = 'palace';
    buildPalace(pg);
    scene.add(pg);

    addGarden(scene);

    // Sun
    const sun = new THREE.DirectionalLight(0xFFF3D0, 3.0);
    sun.position.set(50, 100, 70); sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -80;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xFFE4B0, 0.9);
    fill.position.set(-40, 40, 20); scene.add(fill);
    scene.add(new THREE.AmbientLight(0xCDE4FF, 0.85));
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x4A8A28, 0.5));

    return pg;
}

function buildPalace(g) {
    const white = new THREE.MeshStandardMaterial({ color: 0xF5EFE0, roughness: 0.45 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xEADDB5, roughness: 0.5 });
    const marble = new THREE.MeshStandardMaterial({ color: 0xF0EAD8, roughness: 0.3, metalness: 0.04 });
    const brick = new THREE.MeshStandardMaterial({ color: 0x8B3A22, roughness: 0.88 });
    const darkBrick = new THREE.MeshStandardMaterial({ color: 0x6A2A18, roughness: 0.9 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xD4A820, roughness: 0.1, metalness: 0.98, emissive: 0xA07808, emissiveIntensity: 0.28 });
    const goldDark = new THREE.MeshStandardMaterial({ color: 0xB89010, roughness: 0.15, metalness: 0.95 });
    const roofR = new THREE.MeshStandardMaterial({ color: 0x901808, roughness: 0.55, metalness: 0.08 });
    const roofO = new THREE.MeshStandardMaterial({ color: 0xB03808, roughness: 0.55, metalness: 0.08 });
    const roofG = new THREE.MeshStandardMaterial({ color: 0xCC9A10, roughness: 0.3, metalness: 0.7, emissive: 0x885005, emissiveIntensity: 0.2 });
    const door = new THREE.MeshStandardMaterial({ color: 0x1A3A20, roughness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0A2015, transparent: true, opacity: 0.82, roughness: 0.05, metalness: 0.1 });
    const stone = new THREE.MeshStandardMaterial({ color: 0xC8B898, roughness: 0.75 });
    const wtrim = new THREE.MeshStandardMaterial({ color: 0xFFFFFC, roughness: 0.35 });

    const bx = (w, h, d, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    const cy = (rT, rB, h, s, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, s), mat);
        m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
    };
    const sp = (r, s, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, s, s), mat);
        m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
    };
    const cn = (r, h, s, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, s), mat);
        m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
    };
    const tor = (R, r, ts, rs, mat, x = 0, y = 0, z = 0, rx = 0) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, ts, rs), mat);
        m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); return m;
    };

    // CORRECT roof prism — shape spans local -w/2..+w/2, mesh.position.x = cx
    const Z0 = 0.5;
    const roof = (cx, cz, y0, w, depth, rise, mat) => {
        const sh = new THREE.Shape();
        sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, rise); sh.closePath();
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }), mat);
        m.position.set(cx, y0, cz - depth / 2);
        m.castShadow = true; g.add(m);
        // gold eave trim at front + back
        bx(w + 2, 0.5, 0.45, gold, cx, y0 + 0.25, cz - depth / 2);
        bx(w + 2, 0.5, 0.45, gold, cx, y0 + 0.25, cz + depth / 2);
        return y0 + rise;
    };

    // ── COMPOUND WALL ────────────────────────────────────────
    bx(120, 5.2, 1.8, cream, 0, 2.9, -13);
    bx(120, 0.35, 2, gold, 0, 5.6, -13);
    for (let wp = -56; wp <= 56; wp += 4.5) {
        bx(3.0, 1.0, 2.0, white, wp, 5.85, -13); // merlon
    }
    for (let wp = -52; wp <= 52; wp += 9) {
        bx(1.4, 5.6, 2.2, marble, wp, 3.0, -13); // pilaster
    }
    [-9, 9].forEach(gx => {
        bx(3.2, 8.5, 3.5, marble, gx, 4.5, -13);
        cy(1.3, 1.5, 0.6, 14, gold, gx, 8.8, -13);
        sp(0.9, 12, gold, gx, 9.4, -13);
    });

    // ── BASE PLATFORM ────────────────────────────────────────
    bx(112, 1.2, 18, wtrim, 0, 0.6, 0);
    bx(106, 1.2, 17, wtrim, 0, 1.8, 0);
    bx(98, 1.2, 16, wtrim, 0, 3.0, 0);
    bx(90, 1.0, 15, stone, 0, 4.1, 0);
    bx(88, 5.0, 14, brick, 0, 7.2, 0);
    bx(90, 0.6, 14.5, gold, 0, 9.9, 0);
    // Decorative base panels
    for (let bpx = -42; bpx <= 42; bpx += 7) {
        bx(5.5, 3.6, 0.3, darkBrick, bpx, 7.1, -7.5);
        bx(0.3, 3.8, 0.3, gold, bpx - 3.1, 7.1, -7.4);
        bx(0.3, 3.8, 0.3, gold, bpx + 3.1, 7.1, -7.4);
    }

    // ── FLOOR 1 ──────────────────────────────────────────────
    bx(86, 10, 13, cream, 0, 15.2, 0);
    bx(88, 0.7, 14, gold, 0, 10.3, 0);  // base cornice
    bx(88, 0.7, 14, gold, 0, 20.3, 0);  // top cornice
    // Fluted pilasters every 8 units
    for (let px = -41; px <= 41; px += 8) {
        bx(1.8, 10.5, 13.5, marble, px, 15.2, 0);
        bx(2.2, 0.8, 14, goldDark, px, 10.5, 0);
        bx(2.2, 0.8, 14, goldDark, px, 20.0, 0);
        bx(0.2, 9.5, 0.12, white, px - 0.4, 15.2, -6.9);
        bx(0.2, 9.5, 0.12, white, px + 0.4, 15.2, -6.9);
    }
    // Arched ground floor windows (8)
    [-32, -24, -16, -8, 8, 16, 24, 32].forEach(wx => {
        bx(4.2, 7.0, 0.5, glass, wx, 15.2, -6.85);
        const at = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass);
        at.rotation.x = -Math.PI / 2; at.position.set(wx, 18.7, -6.85); g.add(at);
        bx(0.42, 7.5, 0.5, gold, wx - 2.35, 15.2, -6.65);
        bx(0.42, 7.5, 0.5, gold, wx + 2.35, 15.2, -6.65);
        bx(4.9, 0.36, 0.5, gold, wx, 11.7, -6.65);
        bx(4.9, 0.36, 0.5, gold, wx, 19.1, -6.65);
        cy(0.24, 0.3, 7.5, 12, marble, wx - 2.7, 15.2, -6.55);
        cy(0.24, 0.3, 7.5, 12, marble, wx + 2.7, 15.2, -6.55);
        sp(0.48, 8, gold, wx, 18.92, -6.6);  // keystone
    });

    // ── BALCONY ───────────────────────────────────────────────
    bx(88, 0.55, 4.5, marble, 0, 20.7, -3.5);
    bx(88, 0.5, 4.5, gold, 0, 20.22, -3.5);
    // Vase balusters
    for (let bx0 = -43; bx0 <= 43; bx0 += 1.1) {
        cy(0.09, 0.13, 0.3, 6, goldDark, bx0, 19.5, -5.25);
        cy(0.055, 0.09, 1.0, 6, marble, bx0, 20.0, -5.25);
        sp(0.12, 6, goldDark, bx0, 20.55, -5.25);
        cy(0.055, 0.055, 0.85, 6, marble, bx0, 21.0, -5.25);
        cy(0.13, 0.09, 0.28, 6, goldDark, bx0, 21.5, -5.25);
    }
    bx(88, 0.4, 0.52, gold, 0, 21.75, -5.25);
    bx(88, 0.28, 0.5, gold, 0, 19.32, -5.25);

    // ── FLOOR 2 ───────────────────────────────────────────────
    bx(82, 7.5, 12, cream, 0, 25.1, 0);
    bx(82, 0.65, 12, gold, 0, 21.6, 0);
    bx(82, 0.65, 12, gold, 0, 28.9, 0);
    for (let p2x = -39; p2x <= 39; p2x += 8) {
        bx(1.6, 7.8, 12.5, marble, p2x, 25.1, 0);
        bx(2.0, 0.6, 13, goldDark, p2x, 21.7, 0);
        bx(2.0, 0.6, 13, goldDark, p2x, 28.7, 0);
    }
    [-28, -16, -4, 4, 16, 28].forEach(wx => {
        bx(3.4, 5.2, 0.42, glass, wx, 24.6, -6.15);
        const at2 = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), glass);
        at2.rotation.x = -Math.PI / 2; at2.position.set(wx, 27.3, -6.15); g.add(at2);
        bx(0.4, 5.8, 0.4, gold, wx - 2.1, 24.6, -6.05);
        bx(0.4, 5.8, 0.4, gold, wx + 2.1, 24.6, -6.05);
        bx(4.1, 0.34, 0.4, gold, wx, 21.9, -6.05);
        bx(4.1, 0.34, 0.4, gold, wx, 27.55, -6.05);
        sp(0.33, 6, gold, wx, 27.38, -6.05);
    });

    // ── THAI TIERED ROOFS ─────────────────────────────────────
    const r1y = roof(0, Z0, 29.2, 90, 17, 10, roofR);   // apex = 39.2
    // Eave finials tier 1
    for (let ex = -44; ex <= 44; ex += 5.5) {
        cy(0.18, 0.26, 1.2, 8, gold, ex, 29.8, -8.1); sp(0.3, 8, gold, ex, 30.5, -8.1);
        cy(0.18, 0.26, 1.2, 8, gold, ex, 29.8, 9.0); sp(0.3, 8, gold, ex, 30.5, 9.0);
    }
    bx(92, 0.55, 0.55, gold, 0, 29.75, Z0);  // ridge bar

    const r2y = roof(0, Z0, 35.2, 70, 14, 9, roofO);   // apex = 44.2
    for (let ex = -34; ex <= 34; ex += 5.5) {
        cy(0.15, 0.22, 1.0, 8, gold, ex, 35.7, -6.8); sp(0.26, 8, gold, ex, 36.3, -6.8);
        cy(0.15, 0.22, 1.0, 8, gold, ex, 35.7, 7.3); sp(0.26, 8, gold, ex, 36.3, 7.3);
    }
    bx(72, 0.5, 0.5, gold, 0, 35.7, Z0);

    const r3y = roof(0, Z0, 40.7, 52, 12, 8, roofR);   // apex = 48.7
    for (let ex = -25; ex <= 25; ex += 5) {
        cy(0.12, 0.18, 0.8, 8, gold, ex, 41.1, -5.6); sp(0.22, 8, gold, ex, 41.55, -5.6);
        cy(0.12, 0.18, 0.8, 8, gold, ex, 41.1, 6.5); sp(0.22, 8, gold, ex, 41.55, 6.5);
    }
    bx(54, 0.46, 0.46, gold, 0, 41.2, Z0);

    // Fill panels between tier front faces
    bx(90, 7.2, 0.5, cream, 0, 33.2, -8.2);
    bx(70, 6.6, 0.5, cream, 0, 39.2, -6.9);
    bx(90, 0.55, 0.46, gold, 0, 29.75, -8.2);
    bx(70, 0.5, 0.46, gold, 0, 35.7, -6.9);
    bx(52, 0.46, 0.46, gold, 0, 40.7, -5.7);

    // ── CENTRAL ORNATE SPIRE (stacked taper) ─────────────────
    const sY = r3y, sZ = Z0;
    cy(2.8, 3.2, 0.8, 16, gold, 0, sY + 0.4, sZ);
    cy(2.2, 2.8, 0.5, 16, goldDark, 0, sY + 0.95, sZ);
    const ss = [
        [2.0, 2.5, 1.2, 14], [1.6, 2.0, 1.0, 12], [1.25, 1.6, 1.1, 12],
        [0.95, 1.25, 1.0, 10], [0.7, 0.95, 1.2, 10], [0.5, 0.7, 1.1, 8],
        [0.35, 0.5, 1.2, 8], [0.22, 0.35, 1.0, 8], [0.12, 0.22, 1.2, 6],
        [0.05, 0.12, 1.5, 6], [0.02, 0.05, 1.2, 5],
    ];
    let sy = sY + 1.45;
    ss.forEach(([rT, rB, h, seg], i) => {
        cy(rT, rB, h, seg, i % 2 === 0 ? gold : goldDark, 0, sy + h / 2, sZ);
        cy(rB + 0.12, rB + 0.12, 0.18, seg + 2, gold, 0, sy, sZ);
        sy += h;
    });
    cn(0.04, 2.5, 6, gold, 0, sy + 1.25, sZ);

    // Flanking spires on r2 apex (44.2)
    const fY = r2y;
    [-14, 14].forEach(fx => {
        cy(1.2, 1.4, 0.5, 12, gold, fx, fY + 0.25, sZ);
        let fy = fY + 0.5;
        [[1.0, 1.2, 0.8, 12], [0.8, 1.0, 0.7, 10], [0.6, 0.8, 0.8, 10],
        [0.4, 0.6, 0.7, 8], [0.25, 0.4, 0.9, 8], [0.12, 0.25, 0.8, 6], [0.04, 0.12, 1.2, 6]
        ].forEach(([rT, rB, h, seg], i) => {
            cy(rT, rB, h, seg, i % 2 === 0 ? gold : goldDark, fx, fy + h / 2, sZ);
            cy(rB + 0.09, rB + 0.09, 0.14, seg, gold, fx, fy, sZ);
            fy += h;
        });
        cn(0.03, 1.5, 6, gold, fx, fy + 0.75, sZ);
    });

    // ── SIDE WINGS ────────────────────────────────────────────
    [-58, 58].forEach(wx => {
        bx(26, 20, 13, cream, wx, 11, 0);
        bx(26, 5, 13, brick, wx, 4, 0);
        bx(27, 0.6, 14, gold, wx, 7, 0);
        bx(27, 0.6, 14, gold, wx, 21.1, 0);
        for (let wp = -11; wp <= 11; wp += 5.5) {
            bx(1.4, 20.5, 14, marble, wx + wp, 11, 0);
        }
        [-7, 0, 7].forEach(dx => {
            bx(3.0, 5.2, 0.45, glass, wx + dx, 11.5, -6.75);
            const wa = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), glass);
            wa.rotation.x = -Math.PI / 2; wa.position.set(wx + dx, 14.2, -6.75); g.add(wa);
            bx(0.36, 5.6, 0.42, gold, wx + dx - 1.7, 11.5, -6.65);
            bx(0.36, 5.6, 0.42, gold, wx + dx + 1.7, 11.5, -6.65);
        });
        const wr1 = roof(wx, Z0, 21.5, 30, 15, 9, roofR);
        const wr2 = roof(wx, Z0, 28.0, 22, 12, 8, roofO);
        bx(30, 0.5, 16, gold, wx, 21.5, Z0);
        bx(22, 0.5, 13, gold, wx, 28.0, Z0);
        bx(30, 7.0, 0.4, cream, wx, 25.2, -7.2);
        bx(22, 5.8, 0.4, cream, wx, 31.5, -5.6);
        // Wing spire from wr2 apex
        const wY = wr2;
        cy(1.0, 1.2, 0.5, 10, gold, wx, wY + 0.25, sZ);
        let wy2 = wY + 0.5;
        [[0.85, 1.0, 0.7, 10], [0.6, 0.85, 0.85, 8], [0.4, 0.6, 0.8, 8],
        [0.22, 0.4, 0.9, 6], [0.08, 0.22, 0.9, 6], [0.03, 0.08, 1.2, 5]
        ].forEach(([rT, rB, h, seg], i) => {
            cy(rT, rB, h, seg, i % 2 === 0 ? gold : goldDark, wx, wy2 + h / 2, sZ);
            cy(rB + 0.08, rB + 0.08, 0.12, seg, gold, wx, wy2, sZ);
            wy2 += h;
        });
        cn(0.025, 1.2, 5, gold, wx, wy2 + 0.6, sZ);
    });

    // Connectors
    [-38, 38].forEach(cx2 => {
        bx(14, 14, 13, cream, cx2, 8, 0);
        const cr = roof(cx2, Z0, 14.5, 16, 13, 7, roofR);
        bx(16, 0.5, 14, gold, cx2, 14.5, Z0);
        bx(16, 6.5, 0.4, cream, cx2, 17.6, -7.0);
        cy(0.55, 0.65, 0.3, 10, gold, cx2, cr + 0.15, sZ);
        cy(0.35, 0.55, 0.6, 8, gold, cx2, cr + 0.6, sZ);
        cy(0.15, 0.35, 0.8, 6, gold, cx2, cr + 1.3, sZ);
        cn(0.05, 1.2, 6, gold, cx2, cr + 2.1, sZ);
    });

    // ── ENTRANCE PORTAL ───────────────────────────────────────
    // Piers
    bx(2.8, 13, 2.0, marble, -7.5, 15.5, -6.5);
    bx(2.8, 13, 2.0, marble, 7.5, 15.5, -6.5);
    // Doors
    bx(5.2, 9.0, 0.5, door, -3.1, 15.5, -7.6);
    bx(5.2, 9.0, 0.5, door, 3.1, 15.5, -7.6);
    // Door inset panels
    [[-3.1], [3.1]].forEach(([dx]) => {
        bx(4.0, 3.5, 0.2, goldDark, dx, 17.5, -7.5);
        bx(4.0, 3.5, 0.2, goldDark, dx, 13.5, -7.5);
        bx(4.0, 0.2, 0.2, gold, dx, 15.2, -7.5);
        sp(0.28, 8, gold, dx + (dx < 0 ? 1.8 : -1.8), 15.5, -7.45);
    });
    bx(0.4, 9.5, 0.6, gold, 0, 15.5, -7.4);
    // Threshold & lintel
    bx(14, 0.5, 0.6, gold, 0, 10.2, -7.2);
    bx(14, 0.5, 0.6, gold, 0, 21.6, -7.1);
    // Columns
    [-6.5, 6.5].forEach(cx => {
        cy(0.65, 0.75, 14, 16, marble, cx, 15.5, -7.05);
        cy(0.9, 0.8, 0.8, 16, gold, cx, 9.2, -7.05);
        cy(0.9, 0.8, 0.8, 16, gold, cx, 22.3, -7.05);
        [12, 15.5, 19].forEach(ry => cy(0.82, 0.82, 0.22, 14, goldDark, cx, ry, -7.05));
    });
    // Arches over door
    tor(5.5, 0.5, 10, 24, gold, 0, 21.5, -7.05); // half-arc: position top at 21.5+5.5=27?
    tor(4.8, 0.34, 10, 22, goldDark, 0, 21.5, -7.05);
    // Arch keystone
    bx(1.5, 2.2, 0.7, gold, 0, 27.2, -7.05);
    sp(0.65, 10, gold, 0, 28.5, -7.05);
    // Pediment
    const pedSh = new THREE.Shape();
    pedSh.moveTo(-5.5, 0); pedSh.lineTo(5.5, 0); pedSh.lineTo(0, 4); pedSh.closePath();
    const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(pedSh, { depth: 0.4, bevelEnabled: false }), roofG);
    ped.position.set(-5.5, 22.6, -7.2); ped.castShadow = true; g.add(ped);
    cy(1.4, 1.4, 0.22, 16, gold, 0, 24.2, -7.05);
    sp(0.55, 10, gold, 0, 24.35, -7.0);
    [-6, 6].forEach(cfx => {
        cy(0.22, 0.3, 0.6, 8, gold, cfx, 22.9, -7.05);
        cn(0.12, 2.0, 8, gold, cfx, 24.3, -7.05);
    });
    cy(2.0, 2.0, 0.22, 16, gold, 0, 26.8, -7.05);
    sp(1.0, 12, gold, 0, 27.1, -7.05);

    // Invisible click trigger
    const trig = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 14),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    trig.position.set(0, 15.5, -6.8);
    trig.userData.clickable = 'enter'; g.add(trig);
    exteriorClickables.push(trig);

    // Steps (5)
    for (let s = 0; s < 5; s++) {
        bx(22, 0.55, 3.2, marble, 0, 3.8 + s * 0.65, -5.5 + s * 2.6);
        bx(22, 0.08, 0.08, gold, 0, 4.08 + s * 0.65, -5.55 + s * 2.6);
    }

    // Flag poles
    const fR = new THREE.MeshStandardMaterial({ color: 0xCC1818, side: THREE.DoubleSide });
    const fB = new THREE.MeshStandardMaterial({ color: 0x1030B0, side: THREE.DoubleSide });
    const fY = new THREE.MeshStandardMaterial({ color: 0xD4A820, side: THREE.DoubleSide });
    [-36, -26, -16, 16, 26, 36].forEach((px, i) => {
        cy(0.1, 0.14, 16, 8, marble, px, 10, -7.6);
        cy(0.22, 0.18, 0.5, 8, gold, px, 18.4, -7.6);
        sp(0.3, 8, gold, px, 18.9, -7.6);
        const fm = [fR, fB, fY, fY, fB, fR][i];
        bx(5.5, 3.0, 0.06, fm, px + 3, 17.3, -7.6);
        bx(5.7, 0.15, 0.07, gold, px + 3, 18.75, -7.6);
        bx(5.7, 0.15, 0.07, gold, px + 3, 15.8, -7.6);
    });
}

function addGarden(scene) {
    const trunkM = new THREE.MeshStandardMaterial({ color: 0x4A3010, roughness: 0.9 });
    const foliageM = new THREE.MeshStandardMaterial({ color: 0x267820, roughness: 0.8 });
    const foliageL = new THREE.MeshStandardMaterial({ color: 0x38A030, roughness: 0.82 });
    const palmM = new THREE.MeshStandardMaterial({ color: 0x1E5010, roughness: 0.85 });
    const lampM = new THREE.MeshStandardMaterial({ color: 0x1A4020, roughness: 0.5, metalness: 0.4 });
    const globeM = new THREE.MeshStandardMaterial({ color: 0xFFFFE8, roughness: 0, emissive: 0xFFFFCC, emissiveIntensity: 0.6 });
    const fl1 = new THREE.MeshStandardMaterial({ color: 0xE82020 });
    const fl2 = new THREE.MeshStandardMaterial({ color: 0xFFCC00 });
    const fl3 = new THREE.MeshStandardMaterial({ color: 0xFF80C0 });
    const fl4 = new THREE.MeshStandardMaterial({ color: 0xFF6820 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xD0C8A8, roughness: 0.8 });
    const urnMat = new THREE.MeshStandardMaterial({ color: 0xC8A855, roughness: 0.4, metalness: 0.15 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xD4A820, roughness: 0.12, metalness: 0.95, emissive: 0xA07808, emissiveIntensity: 0.25 });
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x266414, roughness: 0.9 });
    const hedgeMat2 = new THREE.MeshStandardMaterial({ color: 0x308018, roughness: 0.88 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x3A2810, roughness: 0.95 });

    // Trees
    [
        [-12, 22, 9, 3.8, 0], [12, 22, 9, 3.8, 0],
        [-12, 38, 10, 4.2, 0], [12, 38, 10, 4.2, 0],
        [-14, 55, 11, 4.5, 0], [14, 55, 11, 4.5, 0],
        [-50, 25, 10, 4.0, 0], [50, 25, 10, 4.0, 0],
        [-58, 8, 8, 3.5, 0], [58, 8, 8, 3.5, 0],
        [-28, 62, 9, 4.0, 0], [28, 62, 9, 4.0, 0],
        [-40, 48, 9, 3.8, 0], [40, 48, 9, 3.8, 0],
        [-25, 10, 7, 3.0, 1], [25, 10, 7, 3.0, 1], // palms
    ].forEach(([x, z, h, fr, type]) => {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, h, 9), trunkM);
        trunk.position.set(x, h / 2, z); scene.add(trunk);
        if (type === 1) {
            // Palm
            const canopy = new THREE.Mesh(new THREE.SphereGeometry(fr * 1.3, 12, 6), palmM);
            canopy.scale.y = 0.22; canopy.position.set(x, h + 0.8, z); scene.add(canopy);
            for (let a = 0; a < 8; a++) {
                const ang = a / 8 * Math.PI * 2;
                const frond = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 4), palmM);
                frond.scale.set(2.0, 0.28, 1.0);
                frond.position.set(x + Math.cos(ang) * fr * 1.1, h + 0.3, z + Math.sin(ang) * fr * 1.1);
                frond.rotation.y = ang; scene.add(frond);
            }
            const coconutMat = new THREE.MeshStandardMaterial({ color: 0x5A3808, roughness: 0.85 });
            for (let a = 0; a < 5; a++) {
                const ang = a / 5 * Math.PI * 2;
                const cc = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), coconutMat);
                cc.position.set(x + Math.cos(ang) * 0.6, h - 0.3, z + Math.sin(ang) * 0.6); scene.add(cc);
            }
        } else {
            // Round tree — 3 canopy layers
            [[0, 1.0, fr], [0.55, 0.88, fr * 0.82], [1.05, 0.74, fr * 0.64]].forEach(([ly, sc, r], i) => {
                const fol = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), i % 2 === 0 ? foliageM : foliageL);
                fol.scale.y = 0.78; fol.position.set(x, h + r * sc + ly * fr * 0.55, z); scene.add(fol);
            });
        }
    });

    // Hedge rows
    [-22, 22].forEach(hx => {
        for (let hz = 2; hz < 58; hz += 2.5) {
            const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4), hz % 5 < 2.5 ? hedgeMat : hedgeMat2);
            s.position.set(hx, 0.8, hz); scene.add(s);
        }
    });
    for (let hz = 2; hz < 58; hz += 5) {
        [-22, 22].forEach(hx => {
            const f = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), fl2);
            f.position.set(hx, 1.9, hz); scene.add(f);
        });
    }

    // Flower beds
    [
        [0, 15, 10, fl1, fl2], [-10, 9, 8, fl3, fl4], [10, 9, 8, fl1, fl4],
        [-28, 22, 10, fl2, fl3], [28, 22, 10, fl4, fl1]
    ].forEach(([x, z, n, m1, m2]) => {
        const fb = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.2, 0.25, 20),
            new THREE.MeshStandardMaterial({ color: 0x3A8A28 }));
        fb.position.set(x, 0.12, z); scene.add(fb);
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.15, 18), soilMat);
        soil.position.set(x, 0.2, z); scene.add(soil);
        const border = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.2, 6, 28), stoneMat);
        border.rotation.x = Math.PI / 2; border.position.set(x, 0.25, z); scene.add(border);
        for (let a = 0; a < n; a++) {
            const ang = a / n * Math.PI * 2;
            const r = a % 2 === 0 ? 2.2 : 1.3;
            const f = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), a % 2 === 0 ? m1 : m2);
            f.position.set(x + Math.cos(ang) * r, 0.38, z + Math.sin(ang) * r); scene.add(f);
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 5),
                new THREE.MeshStandardMaterial({ color: 0x287020 }));
            stem.position.set(x + Math.cos(ang) * r, 0.22, z + Math.sin(ang) * r); scene.add(stem);
        }
        const fc = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), m2);
        fc.position.set(x, 0.45, z); scene.add(fc);
    });

    // Ornate lampposts
    [[-24, 3], [24, 3], [-24, 20], [24, 20], [-24, 40], [24, 40], [-24, 56], [24, 56]].forEach(([lx, lz]) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 7, 10), lampM);
        post.position.set(lx, 3.5, lz); scene.add(post);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.4, 12), lampM);
        base.position.set(lx, 0.2, lz); scene.add(base);
        [2.5, 4.5].forEach(ry => {
            const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.22, 10), goldMat);
            ring.position.set(lx, ry, lz); scene.add(ring);
        });
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), lampM);
        arm.position.set(lx + 1.1, 7.1, lz); scene.add(arm);
        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.5, 8), lampM);
        lantern.position.set(lx + 2.3, 7.1, lz); scene.add(lantern);
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), globeM);
        globe.position.set(lx + 2.3, 7.46, lz); scene.add(globe);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 8), lampM);
        cap.position.set(lx + 2.3, 7.86, lz); scene.add(cap);
    });

    // Entrance urns (decorative pots)
    [[-10, 4], [10, 4], [-18, 4], [18, 4]].forEach(([x, z], i) => {
        const sc = i < 2 ? 1.0 : 0.72;
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * sc, 0.7 * sc, 0.4 * sc, 10), stoneMat);
        ped.position.set(x, 0.2 * sc, z); scene.add(ped);
        const ub = new THREE.Mesh(new THREE.CylinderGeometry(0.7 * sc, 0.5 * sc, 1.4 * sc, 12), urnMat);
        ub.position.set(x, 0.9 * sc, z); scene.add(ub);
        const un = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * sc, 0.7 * sc, 0.5 * sc, 12), urnMat);
        un.position.set(x, 1.65 * sc, z); scene.add(un);
        const utop = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * sc, 0.5 * sc, 0.2 * sc, 12), goldMat);
        utop.position.set(x, 1.95 * sc, z); scene.add(utop);
        [-0.7 * sc, 0.7 * sc].forEach(hx => {
            const handle = new THREE.Mesh(new THREE.TorusGeometry(0.38 * sc, 0.07 * sc, 6, 10, Math.PI), goldMat);
            handle.rotation.y = Math.PI / 2; handle.position.set(x + hx, 1.2 * sc, z); scene.add(handle);
        });
        const plant = new THREE.Mesh(new THREE.SphereGeometry(0.72 * sc, 10, 7), foliageM);
        plant.scale.y = 0.82; plant.position.set(x, 2.35 * sc, z); scene.add(plant);
        for (let a = 0; a < 5; a++) {
            const ang = a / 5 * Math.PI * 2;
            const f = new THREE.Mesh(new THREE.SphereGeometry(0.18 * sc, 6, 5), a % 2 === 0 ? fl1 : fl2);
            f.position.set(x + Math.cos(ang) * 0.5 * sc, 2.55 * sc, z + Math.sin(ang) * 0.5 * sc);
            scene.add(f);
        }
    });

    // Stone lion guardians at gate
    const lionMat = new THREE.MeshStandardMaterial({ color: 0xC8B898, roughness: 0.7 });
    [-10, 10].forEach(lx => {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), lionMat);
        body.scale.set(1, 0.8, 1.5); body.position.set(lx, 2.0, -11.0); scene.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), lionMat);
        head.position.set(lx, 2.95, -12.0); scene.add(head);
        const mane = new THREE.Mesh(new THREE.SphereGeometry(0.68, 10, 8), lionMat);
        mane.scale.set(1.05, 1.05, 0.65); mane.position.set(lx, 2.88, -11.8); scene.add(mane);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x101010 });
        [-0.2, 0.2].forEach(ex => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), eyeMat);
            eye.position.set(lx + ex, 3.1, -12.5); scene.add(eye);
        });
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.0), stoneMat);
        plinth.position.set(lx, 0.35, -11.0); scene.add(plinth);
    });
}

function addClouds(scene) {
    const cMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 1, transparent: true, opacity: 0.92 });
    const cMat2 = new THREE.MeshStandardMaterial({ color: 0xF0F4FF, roughness: 1, transparent: true, opacity: 0.78 });
    [
        [50, 70, -85, 1.2], [-55, 62, -95, 1.0], [85, 78, -65, 1.3],
        [-40, 66, -70, 0.95], [20, 58, -105, 1.1], [100, 68, -50, 1.0]
    ].forEach(([cx, cy_, cz, sc]) => {
        [[-3.5, 0, 0, 8], [-1, 1.5, -2.5, 7], [1.5, 0.5, -1, 9], [3.5, 0, 0, 7.5],
        [0, 2.8, -2, 7], [0.5, -0.5, 3.5, 6], [-2, 2, 2, 6]].forEach(([dx, dy, dz, r]) => {
            const m = new THREE.Mesh(new THREE.SphereGeometry((r + Math.random() * 3) * sc, 10, 7),
                Math.random() > 0.3 ? cMat : cMat2);
            m.position.set(cx + dx * 2.8 * sc, cy_ + dy, cz + dz * sc);
            m.scale.y = 0.38 + Math.random() * 0.18;
            scene.add(m);
        });
    });
}
