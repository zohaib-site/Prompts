/**
 * RADIOTV PROMPTS — script.js
 * Search → Card Render → Detail Page → Copy → Toast → Theme
 */

/* ── State ──────────────────────────────────────────────────── */
const state = {
  prompts: [],
  filtered: [],
  searchQuery: '',
};

/* ── DOM Refs ───────────────────────────────────────────────── */
const $ = (s) => document.querySelector(s);
const promptsGrid   = $('#promptsGrid');
const searchInput   = $('#searchInput');
const searchClear   = $('#searchClear');
const resultsCount  = $('#resultsCount');
const noResults     = $('#noResults');
const toastContainer = $('#toastContainer');
const themeToggle   = $('#themeToggle');
const themeToggle2  = $('#themeToggle2');
const siteHeader    = $('#siteHeader');
const detailPage    = $('#detailPage');
const detailBody    = $('#detailBody');
const detailHeaderTitle = $('#detailHeaderTitle');
const detailBackBtn = $('#detailBackBtn');

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadPrompts();
  bindEvents();
});

/* ── Theme ──────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('radiotv-theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('radiotv-theme', theme);
  // Sync both toggle icons
  [themeToggle, themeToggle2].forEach(btn => {
    const icon = btn?.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
}

/* ── Data Loading ───────────────────────────────────────────── */
async function loadPrompts() {
  renderSkeletons(6);
  try {
    const res = await fetch('data/prompts.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.prompts = await res.json();
    state.filtered = [...state.prompts];
    renderAll();
    updateCount();
  } catch (err) {
    console.error('[RadioTV] Failed to load prompts:', err);
    promptsGrid.innerHTML = `
      <div id="noResults" class="visible" style="grid-column:1/-1">
        <div class="no-results-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="no-results-title">Could not load prompts</div>
        <div class="no-results-sub">Make sure <code>data/prompts.json</code> exists.</div>
      </div>`;
    showToast('Failed to load prompts.json', 'error');
  }
}

/* ── Render All Cards ───────────────────────────────────────── */
function renderAll() {
  promptsGrid.innerHTML = '';
  if (state.filtered.length === 0) {
    noResults.classList.add('visible');
    promptsGrid.appendChild(noResults);
    return;
  }
  noResults.classList.remove('visible');
  state.filtered.forEach((prompt, i) => {
    const card = createCard(prompt, i);
    promptsGrid.appendChild(card);
  });
}

/* ── Create Card ────────────────────────────────────────────── */
function createCard(prompt, index) {
  const card = document.createElement('article');
  card.className = 'prompt-card';
  card.setAttribute('role', 'listitem');
  card.style.animationDelay = `${index * 70}ms`;

  const tagsHtml = (prompt.tags || [])
    .slice(0, 5)
    .map(t => `<span class="tag">#${t}</span>`)
    .join('');

  // Short excerpt from prompt text
  const excerpt = (prompt.prompt || '').slice(0, 180).trim();

  card.innerHTML = `
    <div class="card-image-wrapper">
      <img
        src="${escapeHtml(prompt.imageUrl || '')}"
        alt="${escapeHtml(prompt.title)}"
        loading="lazy"
        onerror="this.parentElement.style.display='none'"
      />
      <div class="card-image-overlay"></div>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(prompt.title)}</h3>
      <p class="card-excerpt">${escapeHtml(excerpt)}…</p>
      <div class="card-tags">${tagsHtml}</div>
      <div class="card-read-more">
        Read Full Prompt <i class="fa-solid fa-arrow-right"></i>
      </div>
    </div>`;

  card.addEventListener('click', () => openDetail(prompt));
  return card;
}

/* ── Skeleton Loaders ───────────────────────────────────────── */
function renderSkeletons(count) {
  promptsGrid.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-block" style="height:190px;border-radius:0"></div>
      <div style="padding:22px;display:flex;flex-direction:column;gap:14px">
        <div class="skeleton-block" style="height:22px;width:70%"></div>
        <div class="skeleton-block" style="height:56px"></div>
        <div class="skeleton-block" style="height:28px;width:50%"></div>
      </div>
    </div>`).join('');
}

/* ── Search ─────────────────────────────────────────────────── */
function applyFilters() {
  const q = state.searchQuery.toLowerCase().trim();
  state.filtered = state.prompts.filter(p => {
    if (!q) return true;
    const hay = [p.title, p.category, p.aiModel, ...(p.tags || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
  renderAll();
  updateCount();
}

function updateCount() {
  const total = state.prompts.length;
  const shown = state.filtered.length;
  if (resultsCount) {
    resultsCount.innerHTML = `Showing <strong>${shown}</strong> of <strong>${total}</strong> prompts`;
  }
}

/* ── Detail Page ────────────────────────────────────────────── */
function openDetail(prompt) {
  if (detailHeaderTitle) detailHeaderTitle.textContent = prompt.title;

  const tagsHtml = (prompt.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');

  const stepsHtml = (prompt.usageSteps || []).map((step, i) => `
    <li class="detail-step">
      <div class="detail-step-num">${i + 1}</div>
      <div class="detail-step-text">${escapeHtml(step)}</div>
    </li>`).join('');

  const imgHtml = prompt.imageUrl
    ? `<img src="${escapeHtml(prompt.imageUrl)}" alt="${escapeHtml(prompt.title)}" class="detail-hero-img" onerror="this.style.display='none'" />`
    : '';

  if (detailBody) {
    detailBody.innerHTML = `
      ${imgHtml}
      <h1 class="detail-title">${escapeHtml(prompt.title)}</h1>

      <div class="detail-section-label">The Prompt</div>
      <div class="detail-prompt-box">
        <div class="detail-prompt-text">${escapeHtml(prompt.prompt || '')}</div>
        <button class="detail-copy-btn" id="detailCopyBtn">
          <i class="fa-regular fa-copy"></i>
          <span>Copy Prompt</span>
        </button>
      </div>

      <div class="detail-tags">${tagsHtml}</div>

      <hr class="detail-divider" />

      <div class="detail-section-label">Step-by-Step Usage Guide</div>
      <ul class="detail-steps">${stepsHtml}</ul>
    `;

    const copyBtn = document.getElementById('detailCopyBtn');
    copyBtn?.addEventListener('click', () => copyToClipboard(prompt.prompt || '', copyBtn));
  }

  if (detailPage) {
    detailPage.classList.add('open');
    detailPage.setAttribute('aria-hidden', 'false');
    detailPage.scrollTop = 0;
  }
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  if (detailPage) {
    detailPage.classList.remove('open');
    detailPage.setAttribute('aria-hidden', 'true');
  }
  document.body.style.overflow = '';
}

/* ── Clipboard ──────────────────────────────────────────────── */
async function copyToClipboard(text, btn) {
  const iconEl = btn.querySelector('i');
  const labelEl = btn.querySelector('span');
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    btn.classList.add('copied');
    if (iconEl) iconEl.className = 'fa-solid fa-check';
    if (labelEl) labelEl.textContent = 'Copied!';
    showToast('Prompt copied to clipboard!', 'success');
    setTimeout(() => {
      btn.classList.remove('copied');
      if (iconEl) iconEl.className = 'fa-regular fa-copy';
      if (labelEl) labelEl.textContent = 'Copy Prompt';
    }, 2500);
  } catch (err) {
    showToast('Copy failed — please copy manually.', 'error');
  }
}

/* ── Toast ──────────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  if (!toastContainer) return;
  const icons = { success: 'fa-solid fa-circle-check', error: 'fa-solid fa-circle-xmark' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="toast-icon ${icons[type] || icons.success}"></i><span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exiting');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3000);
}

/* ── Event Bindings ─────────────────────────────────────────── */
function bindEvents() {

  // Sticky header
  window.addEventListener('scroll', () => {
    siteHeader?.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // Theme toggle (header)
  themeToggle?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  // Theme toggle (detail page)
  themeToggle2?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  // Search (debounced)
  let debounce;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounce);
    state.searchQuery = e.target.value;
    searchClear?.classList.toggle('visible', state.searchQuery.length > 0);
    debounce = setTimeout(applyFilters, 220);
  });

  // Clear search
  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    state.searchQuery = '';
    searchClear.classList.remove('visible');
    applyFilters();
    searchInput?.focus();
  });

  // Back button
  detailBackBtn?.addEventListener('click', closeDetail);

  // ESC to close detail
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });
}

/* ── Helpers ─────────────────────────────────────────────────── */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
