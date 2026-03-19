/* ── ResumeForge AI — popup.js ── */

// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
  resumeText: '',
  jdText: '',
  activeJdTab: 'scrape',
  scrapedJD: '',
  apiKey: '',
};
let _lastStructuredResume = null;

// ─── DOM REFS ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const settingsToggle  = $('settingsToggle');
const apiPanel        = $('apiPanel');
const apiKeyInput     = $('apiKey');
const saveKeyBtn      = $('saveKey');
const apiStatus       = $('apiStatus');
const uploadZone      = $('uploadZone');
const resumeFileInput = $('resumeFile');
const uploadIdle      = $('uploadIdle');
const uploadSuccess   = $('uploadSuccess');
const fileNameEl      = $('fileName');
const parsedStatus    = $('parsedStatus');
const removeFileBtn   = $('removeFile');
const tabBtns         = document.querySelectorAll('.tab-btn');
const scrapeTab       = $('scrapeTab');
const pasteTab        = $('pasteTab');
const scrapeBtn       = $('scrapeBtn');
const scrapedResult   = $('scrapedResult');
const scrapedPreview  = $('scrapedPreviewText');
const clearScrapeBtn  = $('clearScrape');
const jdPaste         = $('jdPaste');
const charCount       = $('charCount');
const generateBtn     = $('generateBtn');
const btnContent      = $('btnContent');
const btnLoader       = $('btnLoader');
const errorMsg        = $('errorMsg');
const resultSection   = $('resultSection');
const atsBadge        = $('atsBadge');
const copyBtn         = $('copyBtn');
const exportPdfBtn    = $('exportPdfBtn');
const resultText      = $('resultText');
const analysisCards   = $('analysisCards');
const resultTabs      = document.querySelectorAll('.result-tab');
const resumePane      = $('resumePane');
const analysisPane    = $('analysisPane');

// ─── INIT ────────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get(['apiKey']);
  if (stored.apiKey) {
    state.apiKey = stored.apiKey;
    apiKeyInput.value = stored.apiKey;
    apiStatus.textContent = '✓ API key saved';
    apiStatus.className = 'api-status ok';
  }
}
init();

// ─── SETTINGS ────────────────────────────────────────────────────────────────
settingsToggle.addEventListener('click', () => apiPanel.classList.toggle('visible'));

saveKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    apiStatus.textContent = '✗ Enter an API key';
    apiStatus.className = 'api-status err';
    return;
  }
  state.apiKey = key;
  await chrome.storage.local.set({ apiKey: key });
  apiStatus.textContent = '✓ API key saved';
  apiStatus.className = 'api-status ok';
});

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────
uploadZone.addEventListener('click', (e) => {
  if (e.target === removeFileBtn || removeFileBtn.contains(e.target)) return;
  resumeFileInput.click();
});
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragging'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragging'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragging');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
resumeFileInput.addEventListener('change', () => {
  if (resumeFileInput.files[0]) handleFile(resumeFileInput.files[0]);
});
removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  state.resumeText = '';
  resumeFileInput.value = '';
  uploadIdle.style.display = 'flex';
  uploadSuccess.style.display = 'none';
});

async function handleFile(file) {
  if (!file.name.endsWith('.pdf')) { showError('Please upload a PDF file.'); return; }
  if (file.size > 10 * 1024 * 1024) { showError('File too large. Max 10MB.'); return; }

  fileNameEl.textContent = file.name;
  uploadIdle.style.display = 'none';
  uploadSuccess.style.display = 'flex';
  parsedStatus.textContent = 'Parsing PDF...';
  parsedStatus.className = 'parsed-status';

  try {
    const text = await extractPDFText(file);
    if (!text || text.trim().length < 50) throw new Error('Could not extract text. Is this a scanned PDF?');
    state.resumeText = text.trim();
    parsedStatus.textContent = `✓ Parsed — ${state.resumeText.length.toLocaleString()} characters`;
    parsedStatus.className = 'parsed-status ok';
  } catch (err) {
    parsedStatus.textContent = `✗ ${err.message}`;
    parsedStatus.className = 'parsed-status err';
    state.resumeText = '';
  }
}

async function extractPDFText(file) {
  const pdfjs = globalThis.pdfjsLib;
  if (!pdfjs) throw new Error('PDF.js not loaded. Add lib/pdf.mjs and lib/pdf.worker.mjs');

  pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.mjs');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return fullText;
}

// ─── JD TABS ─────────────────────────────────────────────────────────────────
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    state.activeJdTab = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    scrapeTab.classList.toggle('hidden', btn.dataset.tab !== 'scrape');
    pasteTab.classList.toggle('hidden', btn.dataset.tab !== 'paste');
  });
});

// ─── SCRAPE JD ───────────────────────────────────────────────────────────────
scrapeBtn.addEventListener('click', async () => {
  scrapeBtn.disabled = true;
  scrapeBtn.querySelector('span').textContent = 'Scraping...';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => {});

    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeJD' }, (res) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(res);
      });
    });

    const jd = response?.jd?.trim();
    if (!jd || jd.length < 50) throw new Error('No JD found on this page. Try pasting manually.');

    state.scrapedJD = jd;
    scrapedPreview.textContent = jd;
    scrapedResult.style.display = 'block';
  } catch (err) {
    showError(err.message);
  } finally {
    scrapeBtn.disabled = false;
    scrapeBtn.querySelector('span').textContent = 'Scrape Job Description';
  }
});

clearScrapeBtn.addEventListener('click', () => {
  state.scrapedJD = '';
  scrapedResult.style.display = 'none';
});

jdPaste.addEventListener('input', () => {
  charCount.textContent = jdPaste.value.length.toLocaleString();
});

// ─── GENERATE ────────────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  hideError();

  if (!state.apiKey) {
    showError('Please add your free Gemini API key (⚙ icon). Get one at aistudio.google.com');
    apiPanel.classList.add('visible');
    return;
  }
  if (!state.resumeText) {
    showError('Please upload your resume PDF first.');
    return;
  }

  const jd = state.activeJdTab === 'scrape' ? state.scrapedJD : jdPaste.value.trim();
  if (!jd || jd.length < 30) {
    showError('Please provide a job description (scrape or paste).');
    return;
  }

  state.jdText = jd;
  setLoading(true);
  resultSection.classList.add('hidden');

  try {
    const result = await callGeminiAPI(state.resumeText, state.jdText, state.apiKey);
    displayResult(result);
  } catch (err) {
    showError(`API Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

// ─── GEMINI API CALL ─────────────────────────────────────────────────────────
async function callGeminiAPI(resume, jd, apiKey) {
  const prompt = `You are an expert ATS resume optimizer and senior technical recruiter.

Your job: tailor the given resume for the job description to maximize ATS score.

━━━ STRICT RULES ━━━
1. NEVER fabricate, invent, or add experience/skills/credentials not in the original resume
2. You MAY rephrase bullets to mirror JD language — but only when factually true
3. Inject exact JD keywords naturally into bullets, summary, and skills
4. Quantify achievements where original is vague ("improved performance" → "improved API response time by 40%")
5. Match the exact job title from JD in the title field
6. Reorder sections/bullets — most relevant to JD first
7. Keep ALL sections present in original (don't drop education, projects, etc.)
8. ATS rules: no tables, no columns, no special unicode chars in bullets

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON object. No markdown. No backticks. No text outside JSON.

{
  "ats_score": <integer 0-100>,
  "score_reasoning": "<1-2 sentences explaining the score>",
  "key_changes": ["<specific change made>", "<specific change made>", "<specific change made>", "<specific change made>", "<specific change made>"],
  "matched_keywords": ["<exact keyword from JD now in resume>", "<kw2>", "<kw3>", "<kw4>", "<kw5>", "<kw6>"],
  "missing_skills": ["<skill required in JD but genuinely absent from resume>"],
  "resume": {
    "name": "<full name from resume>",
    "title": "<target job title matching JD terminology>",
    "contact": {
      "email": "<email or empty string>",
      "phone": "<phone or empty string>",
      "location": "<city, state or empty string>",
      "linkedin": "<full linkedin URL or empty string>",
      "github": "<full github URL or empty string>",
      "portfolio": "<portfolio URL or empty string>"
    },
    "summary": "<2-3 sentence professional summary. Lead with years of experience and core skills matching JD. End with value proposition.>",
    "experience": [
      {
        "title": "<exact job title>",
        "company": "<company name>",
        "location": "<city, country or Remote>",
        "duration": "<e.g. Jun 2023 – Present>",
        "bullets": [
          "<strong action verb + what you did + result/impact with metric>",
          "<bullet 2>",
          "<bullet 3>"
        ]
      }
    ],
    "projects": [
      {
        "name": "<project name>",
        "tech": "<comma-separated tech stack>",
        "link": "<live URL or GitHub URL or empty string>",
        "bullets": [
          "<what you built + tech used + impact>",
          "<bullet 2>"
        ]
      }
    ],
    "education": [
      {
        "degree": "<full degree name e.g. B.E. Information Technology>",
        "institution": "<full university name>",
        "location": "<city or empty string>",
        "year": "<e.g. 2022 – 2026>",
        "grade": "<CGPA X.XX or XX% or empty string>"
      }
    ],
    "skills": [
      { "category": "Languages", "items": ["<skill1>", "<skill2>"] },
      { "category": "Frameworks & Libraries", "items": ["<skill1>", "<skill2>"] },
      { "category": "Databases", "items": ["<skill1>"] },
      { "category": "Cloud & DevOps", "items": ["<skill1>"] },
      { "category": "Tools", "items": ["<skill1>"] }
    ],
    "certifications": ["<cert name + issuer + year if available>"],
    "achievements": ["<hackathon/award/recognition with context>"]
  }
}

━━━ INPUT ━━━

RESUME:
${resume}

JOB DESCRIPTION:
${jd}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${response.status}`;
    if (response.status === 400) throw new Error(`API Error: ${msg}`);
    if (response.status === 401) throw new Error('Unauthorized: Check your API key');
    if (response.status === 429) throw new Error('Rate limit hit. Wait 60 seconds and try again.');
    throw new Error(`API Error: ${msg}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Model returned invalid JSON. Try again.');
  }
}

// ─── DISPLAY RESULT ──────────────────────────────────────────────────────────
function displayResult(result) {
  _lastStructuredResume = result;

  const score = result.ats_score ?? 0;
  atsBadge.textContent = `ATS: ${score}%`;
  atsBadge.className = 'ats-badge ' + (score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low');

  const r = result.resume;
  if (r) {
    const lines = [];
    if (r.name) lines.push(r.name);
    if (r.title) lines.push(r.title);
    const c = r.contact || {};
    const contactParts = [c.email, c.phone, c.location, c.linkedin, c.github, c.portfolio].filter(Boolean);
    if (contactParts.length) lines.push(contactParts.join('  |  '));
    lines.push('');
    if (r.summary) { lines.push('── SUMMARY ──'); lines.push(r.summary); lines.push(''); }
    if (r.experience?.length) {
      lines.push('── EXPERIENCE ──');
      r.experience.forEach(e => {
        lines.push(`${e.title} — ${e.company}${e.location ? ', ' + e.location : ''}  |  ${e.duration}`);
        e.bullets?.forEach(b => lines.push(`• ${b}`));
        lines.push('');
      });
    }
    if (r.projects?.length) {
      lines.push('── PROJECTS ──');
      r.projects.forEach(p => {
        lines.push(`${p.name}  [${p.tech}]`);
        p.bullets?.forEach(b => lines.push(`• ${b}`));
        lines.push('');
      });
    }
    if (r.skills?.length) {
      lines.push('── SKILLS ──');
      r.skills.forEach(s => lines.push(`${s.category}: ${s.items?.join(', ')}`));
      lines.push('');
    }
    if (r.education?.length) {
      lines.push('── EDUCATION ──');
      r.education.forEach(e => lines.push(`${e.degree} — ${e.institution}  |  ${e.year}  |  ${e.grade}`));
      lines.push('');
    }
    if (r.certifications?.length) { lines.push('── CERTIFICATIONS ──'); r.certifications.forEach(c => lines.push(`• ${c}`)); lines.push(''); }
    if (r.achievements?.length) { lines.push('── ACHIEVEMENTS ──'); r.achievements.forEach(a => lines.push(`• ${a}`)); }
    resultText.textContent = lines.join('\n');
  } else {
    resultText.textContent = 'No resume data returned. Try again.';
  }

  analysisCards.innerHTML = '';
  if (result.key_changes?.length) analysisCards.appendChild(createCard('✦ Key Changes Made', 'green', result.key_changes, 'list'));
  if (result.matched_keywords?.length) analysisCards.appendChild(createCard('⚡ Injected Keywords', 'orange', result.matched_keywords, 'chips'));
  if (result.missing_skills?.length) analysisCards.appendChild(createCard('⚠ Skills to Acquire', 'yellow', result.missing_skills, 'list'));
  if (result.score_reasoning) {
    const card = document.createElement('div');
    card.className = 'analysis-card';
    card.innerHTML = `<div class="card-title" style="color:var(--text2)">📊 Score Reasoning</div><p style="font-size:12px;color:var(--text2);line-height:1.5">${result.score_reasoning}</p>`;
    analysisCards.appendChild(card);
  }

  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth' });
}

function createCard(title, color, items, type) {
  const card = document.createElement('div');
  card.className = 'analysis-card';
  const titleEl = document.createElement('div');
  titleEl.className = `card-title ${color}`;
  titleEl.textContent = title;
  card.appendChild(titleEl);

  if (type === 'list') {
    const ul = document.createElement('ul');
    ul.className = 'card-list';
    items.forEach(item => { const li = document.createElement('li'); li.textContent = item; ul.appendChild(li); });
    card.appendChild(ul);
  } else if (type === 'chips') {
    const chips = document.createElement('div');
    chips.className = 'keyword-chips';
    items.forEach(kw => { const chip = document.createElement('span'); chip.className = 'keyword-chip'; chip.textContent = kw; chips.appendChild(chip); });
    card.appendChild(chips);
  }
  return card;
}

// ─── RESULT TABS ─────────────────────────────────────────────────────────────
resultTabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.rtab;
    resultTabs.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    resumePane.classList.toggle('hidden', tab !== 'resume');
    analysisPane.classList.toggle('hidden', tab !== 'analysis');
  });
});

// ─── COPY BUTTON ─────────────────────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  const text = resultText.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = '✓ Copied!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch { copyBtn.textContent = 'Copy failed'; }
});

// ─── EXPORT PDF ──────────────────────────────────────────────────────────────
exportPdfBtn.addEventListener('click', () => {
  if (!_lastStructuredResume) return;
  const html = buildPrintHTML(_lastStructuredResume);
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  chrome.tabs.create({ url }, (tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.addEventListener('load', () => setTimeout(() => window.print(), 900)),
    });
  });
});

// ─── PDF HTML BUILDER ────────────────────────────────────────────────────────
function buildPrintHTML(resumeData) {
  const r = resumeData?.resume;
  if (!r) return '<html><body><p>No resume data.</p></body></html>';

  const c = r.contact || {};
  const contactItems = [
    c.email     ? `<a href="mailto:${c.email}">${c.email}</a>` : '',
    c.phone     ? c.phone : '',
    c.location  ? c.location : '',
    c.linkedin  ? `<a href="${c.linkedin}">LinkedIn</a>` : '',
    c.github    ? `<a href="${c.github}">GitHub</a>` : '',
    c.portfolio ? `<a href="${c.portfolio}">Portfolio</a>` : '',
  ].filter(Boolean);

  const expHTML = (r.experience || []).map(e => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-left">
          <span class="entry-title">${e.title || ''}</span>
          <span class="entry-sub">${[e.company, e.location].filter(Boolean).join(', ')}</span>
        </div>
        <div class="entry-right">${e.duration || ''}</div>
      </div>
      <ul class="bullets">${(e.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
    </div>`).join('');

  const projHTML = (r.projects || []).map(p => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-left">
          <span class="entry-title">${p.name || ''}${p.link ? ` <a href="${p.link}" class="proj-link">↗</a>` : ''}</span>
          ${p.tech ? `<span class="entry-tech">${p.tech}</span>` : ''}
        </div>
      </div>
      <ul class="bullets">${(p.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
    </div>`).join('');

  const eduHTML = (r.education || []).map(e => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-left">
          <span class="entry-title">${e.degree || ''}</span>
          <span class="entry-sub">${[e.institution, e.location].filter(Boolean).join(', ')}</span>
        </div>
        <div class="entry-right">${[e.year, e.grade].filter(Boolean).join('  |  ')}</div>
      </div>
    </div>`).join('');

  const skillsHTML = (r.skills || []).map(s => `
    <div class="skill-row">
      <span class="skill-cat">${s.category}:</span>
      <span class="skill-items">${(s.items || []).join(', ')}</span>
    </div>`).join('');

  const certsHTML = (r.certifications || []).map(c => `<li>${c}</li>`).join('');
  const achHTML   = (r.achievements   || []).map(a => `<li>${a}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${r.name || 'Resume'} — ResumeForge AI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      background: #fff;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm 18mm;
      line-height: 1.45;
    }

    .resume-header { text-align:center; margin-bottom:14px; }
    .resume-name { font-size:22pt; font-weight:700; letter-spacing:-0.5px; color:#111; line-height:1.1; }
    .resume-title { font-size:11pt; font-weight:500; color:#555; margin-top:3px; margin-bottom:8px; }
    .contact-line { font-size:9pt; color:#555; display:flex; flex-wrap:wrap; justify-content:center; gap:4px 14px; }
    .contact-line a { color:#555; text-decoration:none; }

    .divider { border:none; border-top:1.5px solid #CC3300; margin:10px 0 12px; }

    .section { margin-bottom:14px; }
    .section-title {
      font-size:9pt; font-weight:700; text-transform:uppercase;
      letter-spacing:0.12em; color:#CC3300;
      border-bottom:1px solid #CC3300; padding-bottom:2px; margin-bottom:8px;
    }

    .summary-text { font-size:10pt; color:#333; line-height:1.55; }

    .entry { margin-bottom:9px; }
    .entry-header { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:3px; }
    .entry-left { display:flex; flex-direction:column; gap:1px; }
    .entry-title { font-size:10.5pt; font-weight:700; color:#111; }
    .entry-sub { font-size:9.5pt; color:#555; font-style:italic; }
    .entry-tech { font-size:9pt; color:#777; }
    .entry-right { font-size:9.5pt; color:#555; white-space:nowrap; text-align:right; flex-shrink:0; }
    .proj-link { font-size:9pt; color:#CC3300; text-decoration:none; margin-left:4px; }

    .bullets { list-style:none; padding-left:12px; }
    .bullets li { position:relative; padding-left:12px; font-size:9.5pt; color:#333; line-height:1.45; margin-bottom:2px; }
    .bullets li::before { content:'▪'; position:absolute; left:0; color:#CC3300; font-size:8pt; top:1px; }

    .skill-row { display:flex; gap:6px; margin-bottom:3px; font-size:9.5pt; line-height:1.4; }
    .skill-cat { font-weight:700; color:#111; white-space:nowrap; min-width:90px; }
    .skill-items { color:#333; }

    .toolbar {
      position:fixed; top:0; left:0; right:0; background:#111;
      padding:10px 20px; display:flex; align-items:center;
      justify-content:space-between; z-index:999;
      box-shadow:0 2px 16px rgba(0,0,0,0.4);
    }
    .toolbar-title { color:#fff; font-size:13px; font-weight:600; }
    .toolbar-title span { color:#FF4D26; }
    .toolbar-btns { display:flex; gap:10px; }
    .btn-save { background:#FF4D26; color:#fff; border:none; border-radius:6px; padding:7px 18px; font-size:12px; font-weight:700; cursor:pointer; }
    .btn-save:hover { opacity:0.88; }
    .btn-close { background:#222; color:#bbb; border:1px solid #333; border-radius:6px; padding:7px 14px; font-size:12px; cursor:pointer; }
    .screen-offset { height:52px; }

    @media print {
      .toolbar, .screen-offset { display:none; }
      body { padding:14mm 12mm; }
      @page { size:A4; margin:12mm 10mm; }
      .section, .entry { page-break-inside:avoid; }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <div class="toolbar-title">ResumeForge <span>AI</span></div>
    <div class="toolbar-btns">
      <button class="btn-close" onclick="window.close()">✕ Close</button>
      <button class="btn-save" onclick="window.print()">⬇ Save as PDF</button>
    </div>
  </div>
  <div class="screen-offset"></div>

  <div class="resume-header">
    <div class="resume-name">${r.name || ''}</div>
    ${r.title ? `<div class="resume-title">${r.title}</div>` : ''}
    <div class="contact-line">${contactItems.join('<span>·</span>')}</div>
  </div>
  <hr class="divider"/>

  ${r.summary ? `<div class="section"><div class="section-title">Professional Summary</div><p class="summary-text">${r.summary}</p></div>` : ''}
  ${expHTML   ? `<div class="section"><div class="section-title">Experience</div>${expHTML}</div>` : ''}
  ${projHTML  ? `<div class="section"><div class="section-title">Projects</div>${projHTML}</div>` : ''}
  ${skillsHTML? `<div class="section"><div class="section-title">Technical Skills</div>${skillsHTML}</div>` : ''}
  ${eduHTML   ? `<div class="section"><div class="section-title">Education</div>${eduHTML}</div>` : ''}
  ${certsHTML ? `<div class="section"><div class="section-title">Certifications</div><ul class="bullets">${certsHTML}</ul></div>` : ''}
  ${achHTML   ? `<div class="section"><div class="section-title">Achievements</div><ul class="bullets">${achHTML}</ul></div>` : ''}

</body>
</html>`;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function setLoading(on) {
  generateBtn.disabled = on;
  btnContent.style.display = on ? 'none' : 'flex';
  btnLoader.classList.toggle('hidden', !on);
}
function showError(msg) { errorMsg.textContent = msg; errorMsg.classList.remove('hidden'); }
function hideError() { errorMsg.classList.add('hidden'); errorMsg.textContent = ''; }
