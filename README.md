<div align="center">

<img src="https://img.shields.io/badge/ResumeForge-AI-FF4D26?style=for-the-badge&logo=googlechrome&logoColor=white" />

# ResumeForge AI

**A Chrome Extension that tailors your resume to any job description in seconds.**  
Powered by Groq + LLaMA 3.3 70B. Beat the ATS. Land more interviews.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

</div>

---

## ✨ Features

- 📄 **Upload resume PDF** — parsed locally in-browser via PDF.js
- 🔍 **Auto-scrape JD** from LinkedIn, Naukri, Internshala, Indeed, Glassdoor
- ✍️ **Paste JD manually** — works with any job posting
- ⚡ **AI tailoring in ~3 seconds** — Groq's blazing fast LLaMA 3.3 70B
- 📊 **ATS score** — 0–100% with reasoning
- 🔑 **Keyword injection** — exact JD keywords woven in naturally
- 📋 **Analysis tab** — see every change made + missing skills
- 📥 **Export as PDF** — clean print-ready resume with one click
- 🔒 **100% private** — no server, API key stored locally only

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/nikkkhil2935/resumeforge-ai.git
cd resumeforge-ai
```

### 2. Add PDF.js (required — not included due to file size)
```
1. Go to: https://github.com/mozilla/pdf.js/releases/latest
2. Download: pdfjs-X.X.X-dist.zip → unzip it
3. Copy into lib/:
   build/pdf.mjs        → lib/pdf.mjs
   build/pdf.worker.mjs → lib/pdf.worker.mjs
```

### 3. Load in Chrome
```
chrome://extensions → Enable Developer Mode → Load Unpacked → select this folder
```

### 4. Add your free Groq API key
```
⚙ icon in popup → paste gsk_... key → Save
Get one free at: https://console.groq.com
```

---

## 🔑 How It Works

```
📄 Resume PDF  ──► PDF.js (local) ──► Plain Text
🌐 Job Page    ──► content.js scraper ──► JD Text
                              │
                              ▼
               Groq API — LLaMA 3.3 70B
                              │
                              ▼
        Tailored Resume + ATS Score + Analysis
                              │
                   📥 Export PDF  |  📋 Copy
```

---

## 🌐 Supported Job Sites

| Site | Auto-Scrape |
|---|---|
| LinkedIn Jobs | ✅ |
| Naukri | ✅ |
| Internshala | ✅ |
| Indeed | ✅ |
| Glassdoor | ✅ |
| Wellfound / AngelList | ✅ |
| Any other site | ✅ (generic fallback) |

---

## 📁 Project Structure

```
resumeforge-ai/
├── manifest.json         # Chrome Extension MV3 config
├── popup.html            # Extension popup UI
├── popup.js              # Core logic (PDF parse, Groq API, PDF export)
├── styles.css            # Dark premium UI styles
├── content.js            # JD scraper injected into job pages
├── background.js         # MV3 service worker
├── lib/
│   ├── pdf.mjs           # ← Add manually (PDF.js build)
│   └── pdf.worker.mjs    # ← Add manually (PDF.js build)
├── LICENSE
├── CONTRIBUTING.md
└── README.md
```

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

Good first issues: more job site scrapers, DOCX export, resume diff view, multi-resume profiles.

---

## 🔒 Privacy

Your resume and API key never touch any third-party server. All AI calls go directly from your browser to Groq's API. Key stored in `chrome.storage.local` only.

---

## 📄 License

[MIT](./LICENSE) © 2026 [Nikhil Patil](https://github.com/nikkkhil2935)

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/nikkkhil2935">Nikhil Patil</a><br/>
  <sub>If this helped you land a job, drop a ⭐!</sub>
</div>
