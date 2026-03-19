/* ── ResumeForge AI — background.js ── */
/* MV3 Service Worker — minimal, handles install event */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ResumeForge AI installed ✓');
  }
});
