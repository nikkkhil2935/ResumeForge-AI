function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderResume(resume) {
  const r = resume || {};
  const contact = [r.contact?.email, r.contact?.phone, r.contact?.location, r.contact?.linkedin, r.contact?.github]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' • ');

  return `
    <div class="paper">
      <div class="header">
        <div class="name">${escapeHtml(r.name || 'Your Name')}</div>
        <div class="title">${escapeHtml(r.title || 'Job Title')}</div>
        <div class="contact">${contact}</div>
      </div>

      ${r.summary ? `<div class="section">
        <div class="section-title">Professional Summary</div>
        <div style="font-size: 11px; color: #111;">${escapeHtml(r.summary)}</div>
      </div>` : ''}

      ${r.experience?.length ? `<div class="section">
        <div class="section-title">Experience</div>
        ${r.experience.map(e => `<div class="entry">
          <div class="entry-header">${escapeHtml(e.title || '')} - ${escapeHtml(e.company || '')}${e.location ? ` • ${escapeHtml(e.location)}` : ''}</div>
          <div class="entry-sub">${escapeHtml(e.duration || '')}</div>
          ${e.bullets?.length ? `<ul class="entry-bullets">${e.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
        </div>`).join('')}
      </div>` : ''}

      ${r.projects?.length ? `<div class="section">
        <div class="section-title">Projects</div>
        ${r.projects.map(p => `<div class="entry">
          <div class="entry-header">${escapeHtml(p.name || '')}${p.tech ? ` • ${escapeHtml(p.tech)}` : ''}</div>
          ${p.bullets?.length ? `<ul class="entry-bullets">${p.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
        </div>`).join('')}
      </div>` : ''}

      ${r.education?.length ? `<div class="section">
        <div class="section-title">Education</div>
        ${r.education.map(e => `<div class="entry">
          <div class="entry-header">${escapeHtml(e.degree || '')}</div>
          <div class="entry-sub">${escapeHtml(e.institution || '')}${e.year ? ` • ${escapeHtml(e.year)}` : ''}${e.grade ? ` • ${escapeHtml(e.grade)}` : ''}</div>
        </div>`).join('')}
      </div>` : ''}

      ${r.skills?.length ? `<div class="section">
        <div class="section-title">Skills</div>
        <div class="skills-grid">
          ${r.skills.map(s => `<div>
            <div class="skill-cat">${escapeHtml(s.category || '')}</div>
            <div>${(s.items || []).map(escapeHtml).join(', ')}</div>
          </div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `;
}

async function initPreview() {
  const root = document.getElementById('root');
  const data = await chrome.storage.local.get(['previewResumeData']);
  const resume = data.previewResumeData;

  if (!resume || Object.keys(resume).length === 0) {
    root.innerHTML = '<div class="empty">No resume data found. Generate resume again and click Preview & Download PDF.</div>';
    return;
  }

  root.innerHTML = renderResume(resume);
}

function wireButtons() {
  const downloadBtn = document.getElementById('downloadPdfBtn');
  const closeBtn = document.getElementById('closeBtn');

  downloadBtn.addEventListener('click', () => {
    window.print();
  });

  closeBtn.addEventListener('click', () => {
    window.close();
    // Fallback in case browser refuses window.close.
    setTimeout(() => {
      if (!window.closed) {
        history.length > 1 ? history.back() : location.assign('about:blank');
      }
    }, 100);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  wireButtons();
  await initPreview();
});
