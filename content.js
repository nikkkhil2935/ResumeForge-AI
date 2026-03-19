/* ── ResumeForge AI — content.js ── */

if (typeof window.__resumeforgeInjected === 'undefined') {
  window.__resumeforgeInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapeJD') {
      sendResponse({ jd: scrapeJobDescription() });
    }
    return true;
  });

  function scrapeJobDescription() {
    const host = window.location.hostname;

    // LinkedIn
    if (host.includes('linkedin.com')) {
      for (const sel of ['.jobs-description__content', '.jobs-description-content__text', '.description__text']) {
        const el = document.querySelector(sel);
        if (el?.innerText?.trim().length > 100) return el.innerText.trim();
      }
    }

    // Naukri
    if (host.includes('naukri.com')) {
      for (const sel of ['.job-desc', '.dang-inner-html', '[class*="job-description"]']) {
        const el = document.querySelector(sel);
        if (el?.innerText?.trim().length > 100) return el.innerText.trim();
      }
    }

    // Internshala
    if (host.includes('internshala.com')) {
      for (const sel of ['.internship_details', '#about-internship', '.container-heading + div']) {
        const el = document.querySelector(sel);
        if (el?.innerText?.trim().length > 100) return el.innerText.trim();
      }
    }

    // Indeed
    if (host.includes('indeed.com')) {
      const el = document.querySelector('#jobDescriptionText');
      if (el?.innerText?.trim().length > 100) return el.innerText.trim();
    }

    // Glassdoor
    if (host.includes('glassdoor.com')) {
      const el = document.querySelector('[data-test="jobDescriptionContainer"], [class*="JobDescription"]');
      if (el?.innerText?.trim().length > 100) return el.innerText.trim();
    }

    // Generic fallback — find largest text block
    const candidates = [...document.querySelectorAll('article, section, main, [class*="description"], [class*="job"], [id*="description"]')]
      .filter(el => {
        const cls = (el.className + el.id).toLowerCase();
        return !/nav|menu|header|footer|sidebar|ad|cookie/.test(cls) && el.innerText?.trim().length > 200;
      })
      .sort((a, b) => b.innerText.length - a.innerText.length);

    if (candidates.length) return candidates[0].innerText.trim().slice(0, 8000);
    return document.body.innerText.trim().slice(0, 6000);
  }
}
