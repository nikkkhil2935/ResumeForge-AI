/* ── ResumeForge AI — content.js ── */
/* Injected into every page to scrape job descriptions */

// Guard against double injection
if (typeof window.__resumeforgeInjected === 'undefined') {
  window.__resumeforgeInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapeJD') {
      const jd = scrapeJobDescription();
      sendResponse({ jd });
    }
    return true; // keep message channel open for async
  });

  function scrapeJobDescription() {
    const host = window.location.hostname;

    // ── LinkedIn Jobs ──────────────────────────────────────────
    if (host.includes('linkedin.com')) {
      const selectors = [
        '.jobs-description__content',
        '.jobs-description-content__text',
        '.job-view-layout .description',
        '[class*="job-description"]',
        '.description__text',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 100) return el.innerText.trim();
      }
    }

    // ── Naukri ────────────────────────────────────────────────
    if (host.includes('naukri.com')) {
      const selectors = [
        '.job-desc',
        '.dang-inner-html',
        '[class*="job-description"]',
        '.jd-header-title + div',
        '[data-testid="job-description"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 100) return el.innerText.trim();
      }
    }

    // ── Internshala ───────────────────────────────────────────
    if (host.includes('internshala.com')) {
      const selectors = [
        '.internship_details',
        '.about_company_text_container',
        '#about-internship',
        '.container-heading + div',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 100) return el.innerText.trim();
      }
    }

    // ── Indeed ────────────────────────────────────────────────
    if (host.includes('indeed.com')) {
      const selectors = [
        '#jobDescriptionText',
        '.jobsearch-jobDescriptionText',
        '[class*="jobDescription"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 100) return el.innerText.trim();
      }
    }

    // ── Glassdoor ─────────────────────────────────────────────
    if (host.includes('glassdoor.com')) {
      const selectors = [
        '[class*="JobDescription"]',
        '.desc',
        '[data-test="jobDescriptionContainer"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 100) return el.innerText.trim();
      }
    }

    // ── Wellfound / AngelList ──────────────────────────────────
    if (host.includes('wellfound.com') || host.includes('angel.co')) {
      const selectors = [
        '[class*="job-description"]',
        '[class*="jobDescription"]',
        '.styles_description__',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 100) return el.innerText.trim();
      }
    }

    // ── GENERIC FALLBACK ──────────────────────────────────────
    // Find the largest text-rich block on the page
    const candidates = [
      ...document.querySelectorAll('article, section, [class*="description"], [class*="job"], [class*="content"], [id*="description"], [id*="job"], main, .main'),
    ];

    // Score each candidate by text length, excluding nav/header/footer
    const scored = candidates
      .filter((el) => {
        const tag = el.tagName.toLowerCase();
        const cls = (el.className || '').toLowerCase();
        const id  = (el.id || '').toLowerCase();
        // Exclude nav, header, footer elements
        if (['nav', 'header', 'footer'].includes(tag)) return false;
        if (/nav|menu|header|footer|sidebar|ad|cookie|modal/.test(cls + id)) return false;
        return el.innerText.trim().length > 200;
      })
      .map((el) => ({ el, len: el.innerText.trim().length }))
      .sort((a, b) => b.len - a.len);

    if (scored.length > 0) {
      // Return top candidate but cap at 8000 chars to avoid sending entire page
      return scored[0].el.innerText.trim().slice(0, 8000);
    }

    // Last resort: body text
    return document.body.innerText.trim().slice(0, 6000);
  }
}
