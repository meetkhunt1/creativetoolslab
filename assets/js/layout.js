// /assets/js/layout.js

// Bump this when you change header/footer files to invalidate the cache.
const CTL_LAYOUT_VER = 'v1.0.0';
const cacheKey = (url) => `ctl:${CTL_LAYOUT_VER}:${url}`;

/**
 * Inject a partial with "instant paint" using sessionStorage.
 * - If cached HTML exists, we paint immediately (no flash), then revalidate.
 * - If not, we fetch and paint once ready.
 *
 * Resolves as soon as content is in the DOM (either from cache or after fetch),
 * so the rest of boot() can safely wire events right away.
 */
const inject = (sel, url) =>
  new Promise(async (resolve) => {
    const mount = document.querySelector(sel);
    if (!mount) return resolve();

    const key = cacheKey(url);
    const cached = sessionStorage.getItem(key);

    // 1) Instant paint from cache (if present)
    let resolved = false;
    if (cached) {
      mount.innerHTML = cached;
      resolved = true;
      resolve(); // allow wiring immediately
    }

    // 2) Revalidate / or first-time fetch
    try {
      const res = await fetch(`${url}?v=${CTL_LAYOUT_VER}`, { cache: 'no-cache', credentials: 'same-origin' });
      const html = await res.text();

      // If content changed or there was no cache, update DOM + cache
      if (!cached || html !== cached) {
        mount.innerHTML = html;
        sessionStorage.setItem(key, html);
        if (!resolved) {
          resolved = true;
          resolve();
        }
      } else if (!resolved) {
        resolved = true;
        resolve();
      }
    } catch (e) {
      console.error('Partial load failed:', url, e);
      if (!resolved) resolve();
    }
  });

async function boot() {
  // Inject header/footer (instant paint if cached)
  await Promise.all([
    inject('#ctl-global-header', '/partials/header.html'),
    inject('#ctl-global-footer', '/partials/footer.html'),
  ]);

  // ---- Your existing wiring below (unchanged) ----
  // DESKTOP MEGA MENU
  const trigger = document.querySelector('.ctl-nav__btn');
  const panel   = document.getElementById('ctl-mega-tools');
  if (trigger && panel) {
    let open = false;
    const onKeydown = (e) => { if (e.key === 'Escape') { closeMenu(); trigger.focus(); } };
    const onDocClick = (e) => { if (!panel.contains(e.target) && !trigger.contains(e.target)) closeMenu(); };

    const openMenu = () => {
      if (open) return;
      open = true;
      trigger.setAttribute('aria-expanded', 'true');
      panel.classList.add('is-open');
      panel.removeAttribute('inert');
      panel.focus();
      document.addEventListener('keydown', onKeydown);
      document.addEventListener('click', onDocClick);
    };
    const closeMenu = () => {
      if (!open) return;
      open = false;
      trigger.setAttribute('aria-expanded', 'false');
      panel.classList.remove('is-open');
      panel.setAttribute('inert', '');
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('click', onDocClick);
    };

    trigger.addEventListener('click', () => (open ? closeMenu() : openMenu()));

    let hoverTimer;
    const enter = () => { clearTimeout(hoverTimer); openMenu(); };
    const leave = () => { hoverTimer = setTimeout(closeMenu, 150); };
    trigger.addEventListener('mouseenter', enter);
    trigger.addEventListener('mouseleave', leave);
    panel.addEventListener('mouseenter', enter);
    panel.addEventListener('mouseleave', leave);

    panel.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '0'));
  }

  // MOBILE DRAWER (unchanged from your last working version)
  const drawer   = document.getElementById('ctl-mobile-drawer');
  const backdrop = document.getElementById('ctl-backdrop');
  const burger   = document.querySelector('.ctl-hamburger');
  const closeBtn = drawer ? drawer.querySelector('.ctl-drawer-close') : null;

  if (drawer && drawer.parentNode !== document.body) document.body.appendChild(drawer);
  if (backdrop && backdrop.parentNode !== document.body) document.body.appendChild(backdrop);

  // Closed by default
  if (drawer && backdrop) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('is-open');
    backdrop.hidden = true;
  }

  const lockScroll = (lock) => {
    document.documentElement.classList.toggle('ctl-lock', lock);
    document.body.classList.toggle('ctl-lock', lock);
  };

  const onEsc = (e) => { if (e.key === 'Escape') closeDrawer(); };

  const openDrawer = () => {
    if (!drawer || !backdrop || !burger) return;
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add('is-open');
    backdrop.hidden = false;
    backdrop.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    lockScroll(true);
    drawer.focus();
    document.addEventListener('keydown', onEsc);
  };

  const closeDrawer = () => {
    if (!drawer || !backdrop || !burger) return;
    burger.focus();
    burger.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    lockScroll(false);
    setTimeout(() => {
      drawer.setAttribute('aria-hidden', 'true');
      backdrop.hidden = true;
    }, 250);
    document.removeEventListener('keydown', onEsc);
  };

  burger   && burger.addEventListener('click', openDrawer);
  closeBtn && closeBtn.addEventListener('click', closeDrawer);
  backdrop && backdrop.addEventListener('click', closeDrawer);

  const accBtn   = document.querySelector('.ctl-accordion__btn');
  const accPanel = document.getElementById('ctl-acc-tools');
  if (accBtn && accPanel) {
    accBtn.addEventListener('click', () => {
      const expanded = accBtn.getAttribute('aria-expanded') === 'true';
      accBtn.setAttribute('aria-expanded', String(!expanded));
      accPanel.hidden = expanded;
    });
  }
}

boot();
