/**
 * RADIOTV PROMPTS HUB — script.js
 * SPA Engine: Fetch → Render → Search/Filter → Copy → Lightbox → Theme
 */

/* ── State ──────────────────────────────────────────────────── */
const state = {
  prompts: [],          // All fetched prompts
  filtered: [],         // Currently displayed prompts
  activeFilter: 'All',  // Current category filter
  searchQuery: '',      // Current search query
};

/* ── DOM Refs ───────────────────────────────────────────────── */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const promptsGrid  = $('#promptsGrid');
const searchInput  = $('#searchInput');
const searchClear  = $('#searchClear');
const filterPills  = $$('.pill');
const resultsCount = $('#resultsCount');
const noResults    = $('#noResults');
const toastContainer = $('#toastContainer');
const lightboxModal  = $('#lightboxModal');
const lightboxImg    = $('#lightboxImg');
const themeToggle    = $('#themeToggle');
const siteHeader     = $('#siteHeader');

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
  const icon = themeToggle?.querySelector('i');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

/* ── Data Loading ───────────────────────────────────────────── */
async function loadPrompts() {
  // Show skeleton loaders while fetching
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
        <div class="no-results-sub">Make sure <code>data/prompts.json</code> exists and you're running via a local server.</div>
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

/* ── Create a Single Prompt Card ────────────────────────────── */
function createCard(prompt, index) {
  const card = document.createElement('div');
  card.className = 'prompt-card';
  card.dataset.id = prompt.id;
  card.style.animationDelay = `${index * 60}ms`;

  const tagsHtml = (prompt.tags || [])
    .slice(0, 4)
    .map(t => `<span class="tag">#${t}</span>`)
    .join('');

  const stepsHtml = (prompt.usageSteps || [])
    .map((step, i) => `
      <li class="step-item">
        <span class="step-number">${i + 1}</span>
        <span class="step-text">${escapeHtml(step)}</span>
      </li>`
    ).join('');

  // Encode prompt text for data attribute (to avoid HTML injection)
  const promptEncoded = encodeURIComponent(prompt.prompt || '');

  card.innerHTML = `
    <!-- Image -->
    <div class="card-image-wrapper" data-img="${escapeHtml(prompt.imageUrl || '')}">
      <img
        src="${escapeHtml(prompt.imageUrl || 'https://via.placeholder.com/800x450?text=No+Image')}"
        alt="${escapeHtml(prompt.title)}"
        loading="lazy"
        onerror="this.src='https://via.placeholder.com/800x450?text=No+Image'"
      />
      <div class="card-image-overlay"></div>
      <div class="image-expand-hint"><i class="fa-solid fa-expand"></i></div>
    </div>

    <!-- Body -->
    <div class="card-body">

      <!-- Header -->
      <div class="card-header">
        <div class="card-badges">
          <span class="badge badge-category">
            <i class="fa-solid ${getCategoryIcon(prompt.category)}"></i>
            ${escapeHtml(prompt.category)}
          </span>
          <span class="badge badge-model">
            <i class="fa-solid fa-robot"></i>
            ${escapeHtml(prompt.aiModel)}
          </span>
          <span class="badge badge-difficulty">${escapeHtml(prompt.difficulty)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(prompt.title)}</h3>
      </div>

      <!-- Prompt Display Box -->
      <div class="prompt-display">
        <div class="prompt-text" id="pt-${prompt.id}">${escapeHtml(prompt.prompt)}</div>
        <div class="prompt-actions">
          <button class="btn-copy" data-prompt="${promptEncoded}" data-card-id="${prompt.id}">
            <i class="fa-regular fa-copy"></i>
            <span>Copy Prompt</span>
          </button>
          <button class="btn-expand" title="Expand prompt" data-target="pt-${prompt.id}">
            <i class="fa-solid fa-expand-alt"></i>
          </button>
        </div>
      </div>

      <!-- Tags -->
      <div class="card-tags">${tagsHtml}</div>

      <!-- Accordion Usage Guide -->
      <div class="accordion">
        <button class="accordion-trigger" aria-expanded="false">
          <span class="trigger-left">
            <i class="fa-solid fa-list-check"></i>
            Step-by-Step Usage Guide
          </span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="accordion-body">
          <ul class="steps-list">${stepsHtml}</ul>
        </div>
      </div>

    </div>`;

  return card;
}

/* ── Skeletons while loading ────────────────────────────────── */
function renderSkeletons(count) {
  promptsGrid.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-block" style="height:180px;border-radius:0"></div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div class="skeleton-block" style="height:20px;width:60%"></div>
        <div class="skeleton-block" style="height:24px;width:80%"></div>
        <div class="skeleton-block" style="height:80px"></div>
        <div class="skeleton-block" style="height:38px"></div>
      </div>
    </div>`).join('');
}

/* ── Search & Filter Logic ──────────────────────────────────── */
function applyFilters() {
  const q = state.searchQuery.toLowerCase().trim();
  const cat = state.activeFilter;

  state.filtered = state.prompts.filter(p => {
    // Category filter
    const catMatch = cat === 'All' || p.category === cat;

    // Search: title, category, tags, aiModel
    const haystack = [
      p.title,
      p.category,
      p.aiModel,
      ...(p.tags || []),
    ].join(' ').toLowerCase();
    const searchMatch = !q || haystack.includes(q);

    return catMatch && searchMatch;
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

/* ── Event Bindings ─────────────────────────────────────────── */
function bindEvents() {

  /* -- Scroll: sticky header -- */
  window.addEventListener('scroll', () => {
    if (siteHeader) {
      siteHeader.classList.toggle('scrolled', window.scrollY > 60);
    }
  }, { passive: true });

  /* -- Theme toggle -- */
  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* -- Search input (debounced) -- */
  let searchDebounce;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    state.searchQuery = e.target.value;
    searchClear?.classList.toggle('visible', state.searchQuery.length > 0);
    searchDebounce = setTimeout(applyFilters, 220);
  });

  /* -- Search clear -- */
  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    state.searchQuery = '';
    searchClear.classList.remove('visible');
    applyFilters();
    searchInput?.focus();
  });

  /* -- Filter pills -- */
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.dataset.filter || 'All';
      applyFilters();
    });
  });

  /* -- Delegated events on grid -- */
  promptsGrid.addEventListener('click', (e) => {

    // Copy button
    const copyBtn = e.target.closest('.btn-copy');
    if (copyBtn) {
      const encoded = copyBtn.dataset.prompt;
      const text = decodeURIComponent(encoded);
      copyToClipboard(text, copyBtn);
      return;
    }

    // Expand/collapse prompt text
    const expandBtn = e.target.closest('.btn-expand');
    if (expandBtn) {
      const targetId = expandBtn.dataset.target;
      const textEl = document.getElementById(targetId);
      if (textEl) {
        const isExpanded = textEl.classList.toggle('expanded');
        const icon = expandBtn.querySelector('i');
        icon.className = isExpanded ? 'fa-solid fa-compress-alt' : 'fa-solid fa-expand-alt';
        expandBtn.title = isExpanded ? 'Collapse prompt' : 'Expand prompt';
      }
      return;
    }

    // Accordion
    const trigger = e.target.closest('.accordion-trigger');
    if (trigger) {
      const body = trigger.nextElementSibling;
      const isOpen = body.classList.toggle('open');
      trigger.classList.toggle('open', isOpen);
      trigger.setAttribute('aria-expanded', String(isOpen));
      return;
    }

    // Image click → lightbox
    const imgWrapper = e.target.closest('.card-image-wrapper');
    if (imgWrapper) {
      const imgSrc = imgWrapper.dataset.img;
      if (imgSrc && lightboxModal && lightboxImg) {
        lightboxImg.src = imgSrc;
        lightboxModal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
      return;
    }
  });

  /* -- Lightbox close -- */
  const lightboxClose = $('#lightboxClose');
  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxModal?.addEventListener('click', (e) => {
    if (e.target === lightboxModal) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

function closeLightbox() {
  lightboxModal?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Clipboard API ──────────────────────────────────────────── */
async function copyToClipboard(text, btn) {
  const iconEl = btn.querySelector('i');
  const labelEl = btn.querySelector('span');

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-HTTPS / older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    // Success animation
    btn.classList.add('copied');
    if (iconEl) iconEl.className = 'fa-solid fa-check';
    if (labelEl) labelEl.textContent = 'Copied!';

    showToast('Prompt copied to clipboard!', 'success');

    // Reset after 2.5s
    setTimeout(() => {
      btn.classList.remove('copied');
      if (iconEl) iconEl.className = 'fa-regular fa-copy';
      if (labelEl) labelEl.textContent = 'Copy Prompt';
    }, 2500);

  } catch (err) {
    console.error('[RadioTV] Copy failed:', err);
    showToast('Copy failed — please copy manually.', 'error');
  }
}

/* ── Toast Notifications ────────────────────────────────────── */
function showToast(message, type = 'success') {
  if (!toastContainer) return;

  const icons = {
    success: 'fa-solid fa-circle-check',
    error:   'fa-solid fa-circle-xmark',
    info:    'fa-solid fa-circle-info',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="toast-icon ${icons[type] || icons.info}"></i>
    <span>${escapeHtml(message)}</span>`;

  toastContainer.appendChild(toast);

  // Auto-dismiss after 3s
  setTimeout(() => {
    toast.classList.add('exiting');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3000);
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

function getCategoryIcon(category) {
  const map = {
    'Scripts':    'fa-scroll',
    'Thumbnails': 'fa-image',
    'Titles':     'fa-heading',
    'SEO':        'fa-magnifying-glass-chart',
  };
  return map[category] || 'fa-wand-magic-sparkles';
}
