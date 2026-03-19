# Contributing to ResumeForge AI

Thanks for your interest in contributing! This is a solo-built open source project, and all contributions are welcome.

---

## 🐛 Reporting Bugs

1. Go to [Issues](../../issues) → click **New Issue**
2. Use the title format: `[BUG] short description`
3. Include:
   - What you expected vs what happened
   - Chrome version + OS
   - Steps to reproduce
   - Screenshot if possible

---

## 💡 Suggesting Features

1. Open an [Issue](../../issues) with title: `[FEATURE] short description`
2. Describe the use case — why would it help users?
3. If you want to build it yourself, say so and we'll assign it to you

**Good feature ideas:**
- Support for more job sites (Wellfound, Greenhouse, Lever, Workday)
- Multiple resume profiles (store resume A/B)
- Resume diff view (before vs after changes highlighted)
- Export as DOCX
- ATS score history tracker

---

## 🛠 Making Code Changes

### Setup
```bash
git clone https://github.com/nikkkhil2935/resumeforge-ai.git
cd resumeforge-ai

# Add PDF.js manually (see README)
# Copy pdf.mjs + pdf.worker.mjs into lib/

# Load extension:
# chrome://extensions → Developer Mode → Load Unpacked → select this folder
```

### Branch naming
```
feat/add-docx-export
fix/naukri-scraper-broken
chore/update-readme
```

### PR checklist
- [ ] Tested in Chrome with Developer Mode
- [ ] No API keys or secrets committed
- [ ] PDF.js files NOT committed (they're in .gitignore)
- [ ] README updated if new setup steps are needed
- [ ] PR title is clear: `feat: add DOCX export button`

---

## 📁 Codebase Overview

| File | Role |
|---|---|
| `manifest.json` | Chrome Extension MV3 config |
| `popup.html` | UI layout |
| `popup.js` | All logic — PDF parse, Groq API, PDF export |
| `styles.css` | Dark UI styles |
| `content.js` | JD scraper injected into job pages |
| `background.js` | Service worker (minimal) |

---

## 🤝 Code of Conduct

- Be respectful and constructive
- No spam PRs
- Give credit if you use someone else's code

---

Built with ❤️ by [Nikhil Patil](https://github.com/nikkkhil2935)
