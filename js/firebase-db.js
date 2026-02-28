// js/firebase-db.js
// ══════════════════════════════════════════════════════════
//  Firebase Firestore + Storage operations for Glomer
//  Falls back to localStorage when DEMO_MODE is true
// ══════════════════════════════════════════════════════════

import { FIREBASE_CONFIG, DEMO_MODE } from './config.js';

let db = null;
let storage = null;

export function initFirebase() {
    if (DEMO_MODE) {
        console.log('[Glomer] Demo mode: using localStorage (no Firebase)');
        return;
    }
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        db = firebase.firestore();
        storage = firebase.storage();
        console.log('[Glomer] Firebase connected.');
    } catch (e) {
        console.warn('[Glomer] Firebase init failed, falling back to localStorage:', e);
    }
}

// ─── Load all exhibits (one-time) ───────────────────────
export async function loadAllExhibits() {
    if (!db) return loadAllLocal();
    try {
        const snap = await db.collection('exhibits').get();
        const data = {};
        snap.forEach(doc => { data[doc.id] = doc.data(); });
        return data;
    } catch (e) { return loadAllLocal(); }
}

// ─── Subscribe to real-time updates ─────────────────────
export function subscribeToExhibits(callback) {
    if (!db) {
        // Demo mode: poll localStorage every 5s (just for testing)
        callback(loadAllLocal());
        return () => { };
    }
    const unsub = db.collection('exhibits').onSnapshot(snap => {
        const data = {};
        snap.forEach(doc => { data[doc.id] = doc.data(); });
        callback(data);
    });
    return unsub;
}

// ─── Save exhibit (image + metadata) ────────────────────
export async function saveExhibit(slotId, { imageDataURL, title, description }) {
    const payload = { title: title || '', description: description || '', updatedAt: Date.now() };

    if (!db) {
        // localStorage demo mode
        const existing = getLocal(slotId) || {};
        saveLocal(slotId, { ...existing, ...payload, imageDataURL: imageDataURL || existing.imageDataURL });
        return { imageURL: imageDataURL || existing.imageDataURL };
    }

    try {
        let imageURL = null;

        if (imageDataURL) {
            // Upload image to Firebase Storage
            const ref = storage.ref(`exhibits/${slotId}/image`);
            const blob = dataURLToBlob(imageDataURL);
            await ref.put(blob);
            imageURL = await ref.getDownloadURL();
        } else {
            // Keep existing imageURL if any
            const existing = await db.collection('exhibits').doc(slotId).get();
            if (existing.exists) imageURL = existing.data().imageURL || null;
        }

        await db.collection('exhibits').doc(slotId).set({ ...payload, imageURL }, { merge: true });
        return { imageURL };
    } catch (e) {
        console.error('[Glomer] saveExhibit error:', e);
        // Fallback to local
        saveLocal(slotId, { ...payload, imageDataURL });
        return { imageURL: imageDataURL };
    }
}

// ─── Delete exhibit ──────────────────────────────────────
export async function deleteExhibit(slotId) {
    if (!db) { localStorage.removeItem(`glomer_${slotId}`); return; }
    try {
        await db.collection('exhibits').doc(slotId).delete();
        try { await storage.ref(`exhibits/${slotId}/image`).delete(); } catch (_) { }
    } catch (e) { console.error(e); }
}

// ─── localStorage helpers ────────────────────────────────
function saveLocal(slotId, data) {
    localStorage.setItem(`glomer_${slotId}`, JSON.stringify(data));
}
function getLocal(slotId) {
    try { return JSON.parse(localStorage.getItem(`glomer_${slotId}`)); } catch { return null; }
}
function loadAllLocal() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('glomer_')) {
            const slotId = key.replace('glomer_', '');
            try { data[slotId] = JSON.parse(localStorage.getItem(key)); } catch (_) { }
        }
    }
    return data;
}

// ─── Utility: dataURL → Blob ─────────────────────────────
function dataURLToBlob(dataURL) {
    const [header, data] = dataURL.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
}
