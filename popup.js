/* ── ResumeForge AI — popup.js ── */

// ─── STATE ─────────────────────────────────────────────────────────────────
const state = {
  resumeText: '',
  jdText: '',
  activeJdTab: 'scrape',
  scrapedJD: '',
  apiKey: '',
};

// ─── DOM REFS ───────────────────────────────────────────────────────────────
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
const resultText      = $('resultText');
const analysisCards   = $('analysisCards');
const resultTabs      = document.querySelectorAll('.result-tab');
const resumePane      = $('resumePane');
const analysisPane    = $('analysisPane');

// ─── INIT ───────────────────────────────────────────────────────────────────
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

// ─── SETTINGS TOGGLE ────────────────────────────────────────────────────────
settingsToggle.addEventListener('click', () => {
  apiPanel.classList.toggle('visible');
});

saveKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('gsk_')) {
    apiStatus.textContent = '✗ Groq key must start with gsk_';
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

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragging');
});

uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragging'));

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragging');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
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
  if (!file.name.endsWith('.pdf')) {
    showError('Please upload a PDF file.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError('File too large. Max 10MB.');
    return;
  }

  fileNameEl.textContent = file.name;
  uploadIdle.style.display = 'none';
  uploadSuccess.style.display = 'flex';
  parsedStatus.textContent = 'Parsing PDF...';
  parsedStatus.className = 'parsed-status';

  try {
    const text = await extractPDFText(file);
    if (!text || text.trim().length < 50) {
      throw new Error('Could not extract text. Is this a scanned/image PDF?');
    }
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
  // pdf.mjs sets globalThis.pdfjsLib when loaded as module
  const pdfjs = globalThis.pdfjsLib;
  if (!pdfjs) {
    throw new Error('PDF.js not loaded. Make sure lib/pdf.mjs is present.');
  }

  pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.mjs');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

// ─── JD TABS ─────────────────────────────────────────────────────────────────
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    state.activeJdTab = tab;
    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    scrapeTab.classList.toggle('hidden', tab !== 'scrape');
    pasteTab.classList.toggle('hidden', tab !== 'paste');
  });
});

// ─── JD SCRAPE ───────────────────────────────────────────────────────────────
scrapeBtn.addEventListener('click', async () => {
  scrapeBtn.disabled = true;
  scrapeBtn.querySelector('span').textContent = 'Scraping...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Try injecting content script first (in case it wasn't injected)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    }).catch(() => {}); // ignore if already injected

    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeJD' }, (res) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(res);
      });
    });

    const jd = response?.jd?.trim();
    if (!jd || jd.length < 50) {
      throw new Error('No job description found on this page. Try pasting it manually.');
    }

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

// ─── PASTE JD CHAR COUNT ─────────────────────────────────────────────────────
jdPaste.addEventListener('input', () => {
  charCount.textContent = jdPaste.value.length.toLocaleString();
});

// ─── GENERATE ────────────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  hideError();

  // Validation
  if (!state.apiKey) {
    showError('Please add your Groq API key (⚙ icon).');
    apiPanel.classList.add('visible');
    return;
  }
  if (!state.resumeText) {
    showError('Please upload your resume PDF first.');
    return;
  }

  const jd = state.activeJdTab === 'scrape'
    ? state.scrapedJD
    : jdPaste.value.trim();

  if (!jd || jd.length < 30) {
    showError('Please provide a job description (scrape or paste).');
    return;
  }

  state.jdText = jd;
  setLoading(true);
  resultSection.classList.add('hidden');

  try {
    const result = await callClaudeAPI(state.resumeText, state.jdText, state.apiKey);
    displayResult(result);
  } catch (err) {
    showError(`API Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

// ─── GROQ API CALL ───────────────────────────────────────────────────────────
async function callClaudeAPI(resume, jd, apiKey) {
  const systemPrompt = `You are an expert ATS resume optimizer and senior technical recruiter with 10+ years of experience. 
Your job is to tailor a resume to maximize its ATS (Applicant Tracking System) score for a specific job description.

RULES:
1. NEVER fabricate experience, skills, or credentials not present in the original resume
2. Rephrase bullet points to mirror JD language exactly where truthful
3. Reorder sections and bullets to prioritize the most relevant experience
4. Inject exact keywords from the JD naturally
5. Quantify achievements with numbers wherever the original has vague language
6. Match the exact job title terminology from the JD in the summary/objective
7. Remove or de-emphasize irrelevant content
8. Keep formatting clean and ATS-friendly (no tables, columns, or special chars)

Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON.

JSON format:
{
  "ats_score": <number 0-100>,
  "tailored_resume": "<full tailored resume as plain text with newlines as \\n>",
  "key_changes": ["<change 1>", "<change 2>", "<change 3>", "<change 4>", "<change 5>"],
  "matched_keywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>", "<kw6>"],
  "missing_skills": ["<skill not in resume but required in JD>"],
  "score_reasoning": "<1-2 sentence explanation of the ATS score>"
}`;

  const userPrompt = `ORIGINAL RESUME:
${resume}

---

JOB DESCRIPTION:
${jd}

---

Tailor this resume for the job description above. Return JSON only.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt  },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content || '';

  // Strip any accidental markdown fences
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Model returned invalid JSON. Try again.');
  }
}

// ─── DISPLAY RESULT ──────────────────────────────────────────────────────────
function displayResult(result) {
  // ATS Badge
  const score = result.ats_score ?? 0;
  atsBadge.textContent = `ATS: ${score}%`;
  atsBadge.className = 'ats-badge ' + (score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low');

  // Resume text
  const resume = (result.tailored_resume || '').replace(/\\n/g, '\n');
  resultText.textContent = resume;

  // Analysis cards
  analysisCards.innerHTML = '';

  // Key changes
  if (result.key_changes?.length) {
    analysisCards.appendChild(createCard('✦ Key Changes Made', 'green', result.key_changes, 'list'));
  }

  // Matched keywords
  if (result.matched_keywords?.length) {
    analysisCards.appendChild(createCard('⚡ Injected Keywords', 'orange', result.matched_keywords, 'chips'));
  }

  // Missing skills
  if (result.missing_skills?.length) {
    analysisCards.appendChild(createCard('⚠ Skills to Acquire', 'yellow', result.missing_skills, 'list'));
  }

  // Score reasoning
  if (result.score_reasoning) {
    const card = document.createElement('div');
    card.className = 'analysis-card';
    card.innerHTML = `
      <div class="card-title" style="color: var(--text2)">📊 Score Reasoning</div>
      <p style="font-size:12px; color: var(--text2); line-height:1.5">${result.score_reasoning}</p>
    `;
    analysisCards.appendChild(card);
  }

  // Show result
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
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    card.appendChild(ul);
  } else if (type === 'chips') {
    const chips = document.createElement('div');
    chips.className = 'keyword-chips';
    items.forEach((kw) => {
      const chip = document.createElement('span');
      chip.className = 'keyword-chip';
      chip.textContent = kw;
      chips.appendChild(chip);
    });
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
  } catch {
    copyBtn.textContent = 'Copy failed';
  }
});

// ─── EXPORT PDF ──────────────────────────────────────────────────────────────
const exportPdfBtn = $('exportPdfBtn');

exportPdfBtn.addEventListener('click', async () => {
  const text = resultText.textContent.trim();
  if (!text) return;

  try {
    exportPdfBtn.disabled = true;
    await generatePDF(text, state.resumeText);
    exportPdfBtn.textContent = '✓ Downloaded';
    setTimeout(() => {
      exportPdfBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Export PDF`;
      exportPdfBtn.disabled = false;
    }, 1500);
  } catch (err) {
    exportPdfBtn.disabled = false;
    showError('PDF generation failed: ' + err.message);
  }
});

async function generatePDF(resumeText, originalResumeText = '') {
  try {
    await generatePDFWithJsPDF(resumeText);
    return;
  } catch {
    // Fall through to print preview fallback.
  }

  // Fallback: open formatted preview page and use browser "Save as PDF".
  const printHtml = buildPrintHTML(resumeText, originalResumeText);
  const printBlob = new Blob([printHtml], { type: 'text/html' });
  const printUrl = URL.createObjectURL(printBlob);
  const printWindow = window.open(printUrl, '_blank');

  // Best layout fidelity: render resume HTML and let browser save to PDF.
  if (printWindow) {
    // Release Blob memory once the opened page has had time to load.
    setTimeout(() => URL.revokeObjectURL(printUrl), 60_000);
    return;
  }

  // Fallback for popup-blocked environments.
  await generatePDFWithJsPDF(resumeText);
}

async function generatePDFWithJsPDF(resumeText) {
  // Load jsPDF UMD bundle only when it isn't already available.
  if (!window.jspdf?.jsPDF) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('lib/jspdf.umd.min.js');
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load jsPDF library.'));
    });
  }

  const JsPDFClass = window.jspdf?.jsPDF;
  if (!JsPDFClass) {
    throw new Error('jsPDF library is unavailable.');
  }

  const doc = new JsPDFClass();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const lineHeight = 6;
  let y = 40;

  const lines = resumeText.split('\n');

  // Title/Name
  doc.setFontSize(20);
  doc.text(lines[0] || 'Resume', margin, y);
  y += 20;

  // Body
  doc.setFontSize(12);
  for (let i = 1; i < lines.length && y < pageHeight - 40; i++) {
    const line = lines[i].trim();
    if (line) {
      const split = doc.splitTextToSize(line, pageWidth - 2 * margin);
      doc.text(split, margin, y);
      y += split.length * lineHeight;
    }
    
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 40;
    }
  }

  const pdfBlob = doc.output('blob');
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'Tailored_Resume.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 10_000);
}


function buildPrintHTML(resumeText, originalResumeText = '') {
  // Parse resume text into sections for clean formatting
  const lines = resumeText.split('\n').filter(l => l.trim());
  const originalLines = originalResumeText.split('\n').filter(l => l.trim());
  const hasDenseOriginal = originalLines.length > 30;

  const formattedLines = lines.map(line => {
    const trimmed = line.trim();

    // Detect section headers (ALL CAPS or Title Case short lines)
    if (
      trimmed.length > 2 && trimmed.length < 40 &&
      (trimmed === trimmed.toUpperCase() ||
       /^(Experience|Education|Skills|Projects|Summary|Objective|Certifications|Awards|Languages|Contact|Publications|Volunteer)/i.test(trimmed))
    ) {
      return `<h2>${trimmed}</h2>`;
    }

    // Detect bullet points
    if (/^[•\-\*▪◦]/.test(trimmed)) {
      return `<li>${trimmed.replace(/^[•\-\*▪◦]\s*/, '')}</li>`;
    }

    // Detect name (first line, usually)
    if (lines.indexOf(line) === 0 && trimmed.length < 50) {
      return `<h1>${trimmed}</h1>`;
    }

    // Detect contact info line (has @ or phone pattern)
    if (/[@|•|linkedin|github|\+91|\d{10}]/i.test(trimmed) && trimmed.length < 120) {
      return `<p class="contact">${trimmed}</p>`;
    }

    // Job title / company lines (bold short lines)
    if (trimmed.length < 80 && !trimmed.endsWith('.')) {
      return `<p class="subtitle">${trimmed}</p>`;
    }

    return `<p>${trimmed}</p>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tailored Resume — ResumeForge AI</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    /* ── BASE ── */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --accent: #CC3300;
      --text: #1a1a1a;
      --text2: #444;
      --border: #ddd;
      --bg: #ffffff;
    }

    body {
      font-family: 'Inter', 'Times New Roman', serif;
      font-size: ${hasDenseOriginal ? '10pt' : '10.5pt'};
      color: var(--text);
      background: var(--bg);
      max-width: 780px;
      margin: 0 auto;
      padding: ${hasDenseOriginal ? '30px 44px' : '36px 48px'};
      line-height: 1.55;
    }

    /* ── TYPOGRAPHY ── */
    h1 {
      font-size: 22pt;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }

    h2 {
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--accent);
      border-bottom: 1.5px solid var(--accent);
      padding-bottom: 3px;
      margin: 18px 0 8px;
    }

    p { margin-bottom: 3px; color: var(--text2); }

    p.contact {
      font-size: 9.5pt;
      color: #666;
      margin-bottom: 2px;
    }

    p.subtitle {
      font-size: 10pt;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 2px;
    }

    li {
      font-size: 10pt;
      color: var(--text2);
      margin-left: 16px;
      margin-bottom: 3px;
      list-style-type: disc;
    }

    /* ── WATERMARK ── */
    .watermark {
      position: fixed;
      bottom: 12px;
      right: 16px;
      font-size: 7.5pt;
      color: #bbb;
      font-family: 'Inter', sans-serif;
    }

    /* ── PRINT ── */
    @media print {
      body { padding: 20px 32px; }
      @page {
        size: A4;
        margin: 16mm 14mm;
      }
      h2 { break-after: avoid; }
      h1 { break-after: avoid; }
      .watermark { display: block; }
      .no-print { display: none; }
    }

    /* ── SCREEN TOOLBAR ── */
    .toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #1a1a1a;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 100;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    }

    .toolbar-title {
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
    }

    .toolbar-title span { color: #FF4D26; }

    .toolbar-btns { display: flex; gap: 10px; }

    .btn-print {
      background: #FF4D26;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 7px 18px;
      font-size: 12px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-print:hover { opacity: 0.85; }

    .btn-close {
      background: #2a2a2a;
      color: #ccc;
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
    }

    .resume-body { padding-top: 52px; }

    @media print {
      .toolbar { display: none; }
      .resume-body { padding-top: 0; }
    }
  </style>
</head>
<body>

  <div class="toolbar no-print">
    <div class="toolbar-title">ResumeForge <span>AI</span> — Tailored Resume</div>
    <div class="toolbar-btns">
      <button class="btn-close" onclick="window.close()">✕ Close</button>
      <button class="btn-print" onclick="window.print()">
        ⬇ Save as PDF
      </button>
    </div>
  </div>

  <div class="resume-body">
    ${formattedLines}
  </div>

  <div class="watermark">Generated by ResumeForge AI</div>

  <script>
    // Convert loose <li> tags into proper <ul> wrappers
    document.querySelectorAll('li').forEach(li => {
      if (li.previousElementSibling?.tagName !== 'UL' && li.parentElement?.tagName !== 'UL') {
        const ul = document.createElement('ul');
        li.parentNode.insertBefore(ul, li);
        ul.appendChild(li);
        // Grab following siblings that are also li
        while (ul.nextElementSibling && ul.nextElementSibling.tagName === 'LI') {
          ul.appendChild(ul.nextElementSibling);
        }
      }
    });

    // Auto-open print dialog once content is rendered.
    window.addEventListener('load', () => {
      setTimeout(() => {
        try {
          window.focus();
          window.print();
        } catch {
          // User can still click the Save as PDF button manually.
        }
      }, 300);
    });
  <\/script>

</body>
</html>`;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function setLoading(on) {
  generateBtn.disabled = on;
  btnContent.style.display = on ? 'none' : 'flex';
  btnLoader.classList.toggle('hidden', !on);
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function hideError() {
  errorMsg.classList.add('hidden');
  errorMsg.textContent = '';
}
