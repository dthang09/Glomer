// js/ui.js — HUD helpers
export function setRoomLabel(name) {
    document.getElementById('room-label').textContent = name || '';
}
export function showTooltip(text) {
    const t = document.getElementById('tooltip');
    t.textContent = text;
    t.classList.remove('hidden');
}
export function hideTooltip() {
    document.getElementById('tooltip').classList.add('hidden');
}
export function setActiveRoomBtn(roomId) {
    document.querySelectorAll('.room-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.room === roomId);
    });
}
export function setLoadingProgress(pct) {
    document.getElementById('loading-progress').style.width = pct + '%';
}
export function hideLoading(cb) {
    const el = document.getElementById('loading');
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; if (cb) cb(); }, 900);
}
export function showEnterPrompt() {
    document.getElementById('enter-prompt').classList.remove('hidden');
}
export function hideEnterPrompt() {
    document.getElementById('enter-prompt').classList.add('hidden');
}
export function showHUD() {
    document.getElementById('hud').classList.remove('hidden');
}
export function hideHUD() {
    document.getElementById('hud').classList.add('hidden');
}
