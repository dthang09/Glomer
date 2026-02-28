// js/flipcard.js
// ══════════════════════════════════════════════════════════
//  Flip card overlay — image front + editable description back
// ══════════════════════════════════════════════════════════
import { saveExhibit } from './firebase-db.js';
import { updateExhibitImage } from './exhibits.js';

let currentSlotId = null;
let currentData = {};  // { imageURL, imageDataURL, title, description }
let flipped = false;
let pendingImageDataURL = null;

// DOM refs
const overlay = () => document.getElementById('flip-overlay');
const cardInner = () => document.getElementById('card-inner');
const exhibitImg = () => document.getElementById('exhibit-img');
const uploadZone = () => document.getElementById('upload-zone');
const fileInput = () => document.getElementById('file-input');
const titleInput = () => document.getElementById('exhibit-title-input');
const dlBtn = () => document.getElementById('btn-download');
const slotLabel = () => document.getElementById('slot-id-display');
const descText = () => document.getElementById('description-text');
const backTitle = () => document.getElementById('back-exhibit-title');
const saveStatus = () => document.getElementById('save-status');
const labelUpload = () => document.getElementById('label-upload');

export function initFlipCard() {
    document.getElementById('btn-close').addEventListener('click', hideFlipCard);
    document.getElementById('btn-close-back').addEventListener('click', hideFlipCard);
    document.getElementById('btn-flip-to-back').addEventListener('click', () => flip(true));
    document.getElementById('btn-flip-to-front').addEventListener('click', () => flip(false));
    document.getElementById('btn-download').addEventListener('click', downloadImage);
    document.getElementById('btn-save').addEventListener('click', saveDescription);
    fileInput().addEventListener('change', onFileSelected);

    // Drag-and-drop
    const imgContainer = document.getElementById('image-container');
    imgContainer.addEventListener('dragover', e => { e.preventDefault(); imgContainer.classList.add('drag-over'); });
    imgContainer.addEventListener('dragleave', () => imgContainer.classList.remove('drag-over'));
    imgContainer.addEventListener('drop', e => {
        e.preventDefault(); imgContainer.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) processFile(file);
    });

    // Click on upload zone label area
    uploadZone().addEventListener('click', () => fileInput().click());

    // ESC to close
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !overlay().classList.contains('hidden')) hideFlipCard();
    });

    // Backdrop click to close
    document.getElementById('flip-backdrop').addEventListener('click', hideFlipCard);
}

export function showFlipCard(slotId, data) {
    currentSlotId = slotId;
    currentData = data || {};
    flipped = false;
    pendingImageDataURL = null;

    // Reset card to front
    cardInner().classList.remove('flipped');

    // Populate title
    titleInput().value = currentData.title || '';
    backTitle().textContent = currentData.title || 'Mô tả hiện vật';

    // Slot identifier
    slotLabel().textContent = `Vị trí: ${slotId}`;

    // Populate image (prefer URL, then dataURL)
    const imgSrc = currentData.imageURL || currentData.imageDataURL;
    if (imgSrc) {
        showImage(imgSrc);
    } else {
        showUploadZone();
    }

    // Populate description
    descText().value = currentData.description || '';

    // Download button visibility
    dlBtn().classList.toggle('hidden', !imgSrc);

    // Show overlay
    overlay().classList.remove('hidden');
    overlay().style.animation = 'fade-in 0.25s ease';

    // Update upload label text
    labelUpload().innerHTML = imgSrc ? '📁 Đổi ảnh' : '📁 Tải ảnh lên';
}

export function hideFlipCard() {
    overlay().classList.add('hidden');
    currentSlotId = null;
    saveStatus().textContent = '';
    // Clear file input
    fileInput().value = '';
}

function flip(toBack) {
    flipped = toBack;
    cardInner().classList.toggle('flipped', toBack);
    if (toBack) {
        backTitle().textContent = titleInput().value || 'Mô tả hiện vật';
    }
}

function showImage(src) {
    exhibitImg().src = src;
    exhibitImg().classList.remove('hidden');
    uploadZone().classList.add('hidden');
}

function showUploadZone() {
    exhibitImg().src = '';
    exhibitImg().classList.add('hidden');
    uploadZone().classList.remove('hidden');
}

function onFileSelected(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
}

function processFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataURL = e.target.result;
        pendingImageDataURL = dataURL;
        showImage(dataURL);
        dlBtn().classList.remove('hidden');
        labelUpload().innerHTML = '📁 Đổi ảnh';
        saveStatus().textContent = '⚠ Chưa lưu — nhấn Lưu để xác nhận';
    };
    reader.readAsDataURL(file);
}

async function saveDescription() {
    if (!currentSlotId) return;

    const title = titleInput().value.trim();
    const description = descText().value.trim();
    const imageDataURL = pendingImageDataURL || null;

    saveStatus().textContent = '⏳ Đang lưu...';

    try {
        const result = await saveExhibit(currentSlotId, {
            imageDataURL,
            title,
            description
        });

        if (result.imageURL || imageDataURL) {
            const src = result.imageURL || imageDataURL;
            updateExhibitImage(currentSlotId, result.imageURL, imageDataURL);
            currentData = { ...currentData, imageURL: result.imageURL || imageDataURL, title, description };
            showImage(src);
            dlBtn().classList.remove('hidden');
        }

        saveStatus().textContent = '✓ Đã lưu!';
        backTitle().textContent = title || 'Mô tả hiện vật';
        pendingImageDataURL = null;
        setTimeout(() => { saveStatus().textContent = ''; }, 2500);
    } catch (err) {
        saveStatus().textContent = '✕ Lỗi khi lưu';
        console.error('[Glomer] save error:', err);
    }
}

function downloadImage() {
    const src = exhibitImg().src || currentData.imageURL || currentData.imageDataURL;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `glomer_${currentSlotId || 'exhibit'}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
