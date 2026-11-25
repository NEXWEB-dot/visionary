/* ==========================================================================
   Visionary Marketing Solutions — Interactive Behavior & Scroll Fallbacks
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Sticky Header Scroll State & Active Nav Link Highlighting
     ------------------------------------------------------------------------ */
  const header = document.getElementById('site-header');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  function syncHeaderState() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  window.addEventListener('scroll', syncHeaderState, { passive: true });
  syncHeaderState();

  if (sections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const activeId = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === activeId);
          });
        }
      },
      { rootMargin: '-40% 0px -50% 0px' }
    );
    sections.forEach((sec) => navObserver.observe(sec));
  }

  /* ------------------------------------------------------------------------
     2. Mobile Navigation Drawer (<dialog> + scroll-snap swipe + fallbacks)
     ------------------------------------------------------------------------ */
  const drawer = document.getElementById('mobile-drawer');
  const openDrawerBtn = document.getElementById('drawer-open');
  const closeDrawerBtn = document.getElementById('drawer-close');

  if (drawer && openDrawerBtn && closeDrawerBtn) {
    const scroller = drawer.querySelector('.drawer-scroller');
    const sheet = drawer.querySelector('.drawer-sheet');

    async function openDrawer() {
      drawer.showModal();

      if (!CSS.supports('scroll-initial-target', 'nearest')) {
        scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'instant' });
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        );
      }

      scroller.scrollTo({ left: 0, behavior: 'auto' });
    }

    function closeDrawer() {
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'auto' });
    }

    function onDrawerOpened() {
      openDrawerBtn.setAttribute('aria-expanded', 'true');
    }

    function onDrawerClosed() {
      if (drawer.open) drawer.close();
      openDrawerBtn.setAttribute('aria-expanded', 'false');
    }

    const visibleThreshold = Math.min(0.02, 1 / Math.max(window.innerWidth, 320));
    const drawerObserver = new IntersectionObserver(
      (entries) => {
        const latest = entries.at(-1);
        if (!latest || !drawer.open) return;
        if (latest.intersectionRatio < visibleThreshold) onDrawerClosed();
        if (latest.intersectionRatio >= 0.98) onDrawerOpened();
      },
      { root: drawer, threshold: [visibleThreshold, 0.98] }
    );
    drawerObserver.observe(sheet);

    if (!CSS.supports('animation-timeline: scroll()')) {
      scroller.addEventListener('scroll', () => {
        const width = Math.max(sheet.offsetWidth, 1);
        const ratio = Math.max(0, Math.min(1, 1 - scroller.scrollLeft / width));
        drawer.style.setProperty('--drawer-backdrop', ratio.toFixed(3));
      }, { passive: true });
    }

    openDrawerBtn.addEventListener('click', openDrawer);
    closeDrawerBtn.addEventListener('click', closeDrawer);

    drawer.addEventListener('click', (event) => {
      if (!sheet.contains(event.target)) closeDrawer();
    });

    drawer.addEventListener('cancel', (event) => {
      if (event.cancelable) {
        event.preventDefault();
        closeDrawer();
      }
    });

    drawer.querySelectorAll('a, [data-open-modal]').forEach((el) => {
      el.addEventListener('click', () => {
        onDrawerClosed();
      });
    });
  }

  /* ------------------------------------------------------------------------
     3. Strategy Call Modal (<dialog> + closedby="any" fallback)
     ------------------------------------------------------------------------ */
  const modal = document.getElementById('strategy-modal');
  const modalClose = document.getElementById('modal-close');
  const modalService = document.getElementById('modal-service');
  const modalTriggers = document.querySelectorAll('[data-open-modal]');

  if (modal && modalClose) {
    modalTriggers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const requestedService = btn.getAttribute('data-open-modal');
        if (modalService && requestedService) {
          const hasOption = Array.from(modalService.options).some(
            (opt) => opt.value === requestedService
          );
          if (hasOption) modalService.value = requestedService;
        }
        modal.showModal();
      });
    });

    modalClose.addEventListener('click', () => modal.close());

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e) => {
        const r = modal.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      modal.addEventListener('pointerdown', (e) => {
        pressedOutside = isOutside(e);
      });
      modal.addEventListener('pointerup', (e) => {
        if (pressedOutside && isOutside(e)) modal.close();
      });
    }
  }

  /* ------------------------------------------------------------------------
     4. Scroll-Driven Progress, Masked Text Pull-Up & Section Reveals
     ------------------------------------------------------------------------ */
  const motionQuery = matchMedia('(prefers-reduced-motion: no-preference)');
  const prefersMotion = motionQuery.matches;
  const supportsScrollTimeline = CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)');

  const progressEl = document.getElementById('scroll-progress');
  if (progressEl && prefersMotion && !supportsScrollTimeline) {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressEl.style.transform = `scaleX(${ratio})`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  if (prefersMotion) {
    document.documentElement.classList.add('has-motion');

    // Sibling-index fallback for staggered animations/transitions
    if (!CSS.supports('animation-delay: calc(sibling-index() * 0.1s)')) {
      document.querySelectorAll('.stagger-children').forEach((parent) => {
        Array.from(parent.children).forEach((child, idx) => {
          child.style.setProperty('--sibling-index', String(idx + 1));
        });
      });
    }

    const animatedTargets = Array.from(
      document.querySelectorAll('[data-animate]:not([data-animate="hero"])')
    );

    // Sequence masked text pull-up indices inside each animated block
    animatedTargets.forEach((target) => {
      let pullCounter = 0;
      target.querySelectorAll('.pull-up').forEach((el) => {
        if (el.closest('[data-animate]') !== target) return;
        el.style.setProperty('--pull-index', String(Math.min(pullCounter, 5)));
        pullCounter += 1;
      });
    });

    const pendingTargets = new Set(animatedTargets);

    const revealTarget = (el, obs) => {
      el.classList.add('is-inview');
      pendingTargets.delete(el);
      if (obs) obs.unobserve(el);
    };

    const sweepPassedTargets = (obs) => {
      const cutoff = window.innerHeight * 0.96;
      for (const el of pendingTargets) {
        if (el.getBoundingClientRect().top < cutoff) {
          revealTarget(el, obs);
        }
      }
      if (pendingTargets.size === 0) {
        window.removeEventListener('scroll', onScrollSweep);
      }
    };

    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        let triggered = false;
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight * 0.96) {
            revealTarget(entry.target, obs);
            triggered = true;
          }
        }
        if (triggered && pendingTargets.size > 0) {
          sweepPassedTargets(obs);
        }
      },
      { threshold: 0.04, rootMargin: '0px 0px -30px 0px' }
    );

    const onScrollSweep = () => sweepPassedTargets(revealObserver);
    window.addEventListener('scroll', onScrollSweep, { passive: true });

    animatedTargets.forEach((el) => revealObserver.observe(el));
  }

  motionQuery.addEventListener('change', (event) => {
    document.documentElement.classList.toggle('has-motion', event.matches);
  });

  /* ------------------------------------------------------------------------
     5. Interactive Growth Engine Tabs
     ------------------------------------------------------------------------ */
  const channelData = {
    meta: {
      roas: '5.4x',
      cadence: '7 Days',
      title: 'Meta Ads Acquisition & Retargeting Matrix',
      desc: 'Paired with Conversion API deduplication, 6 fresh creative variations per week, and automated dynamic catalog retargeting.',
      bullets: [
        'Hook-rate & thumbstop diagnostics every 72 hours',
        'Segmented prospecting vs. warm retargeting budgets',
        'Direct sync with Shopify & CRM purchase events'
      ],
      service: 'Meta Ads'
    },
    ppc: {
      roas: '4.8x',
      cadence: '48 Hrs',
      title: 'High-Intent Google Search & Shopping Capture',
      desc: 'Precision keyword sculpting, Performance Max asset segmentation, and dedicated conversion-aligned landing pages.',
      bullets: [
        'Aggressive negative-keyword waste elimination',
        'Shopping feed title & margin-tier bid rules',
        'Full server-side conversion value tracking'
      ],
      service: 'Pay Per Click Advertising'
    },
    ecomm: {
      roas: '+44%',
      cadence: '14 Days',
      title: 'Storefront CRO & Automated Retention Flows',
      desc: 'Speed-tuned product pages, friction-free checkout upsells, and automated post-purchase lifecycle sequences.',
      bullets: [
        'Sub-2-second mobile product page optimization',
        'Cart recovery & tiered bundle AOV boosters',
        'Seamless Meta & Google Merchant product feeds'
      ],
      service: 'E-Commerce Solutions'
    },
    app: {
      roas: '61%',
      cadence: '2 Weeks',
      title: 'Mobile App Build & Day-30 Retention Engine',
      desc: 'Cross-platform iOS and Android apps built with fast onboarding, event telemetry, and re-engagement triggers.',
      bullets: [
        'Smooth 3-step onboarding for higher activation',
        'Deep-linked paid install attribution tracking',
        'Modular scalable API & cloud architecture'
      ],
      service: 'App Development'
    }
  };

  const tabButtons = document.querySelectorAll('.channel-tab');
  const channelDisplay = document.getElementById('channel-display');
  const simRoas = document.getElementById('sim-roas');
  const simCadence = document.getElementById('sim-cadence');
  const simTitle = document.getElementById('sim-title');
  const simDesc = document.getElementById('sim-desc');
  const simList = document.getElementById('sim-list');
  const simCta = document.getElementById('sim-cta');

  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      const key = tab.dataset.channel;
      const data = channelData[key];
      if (!data) return;

      tabButtons.forEach((btn) => {
        const isCurrent = btn === tab;
        btn.classList.toggle('is-active', isCurrent);
        btn.setAttribute('aria-selected', String(isCurrent));
      });

      if (simRoas) simRoas.textContent = data.roas;
      if (simCadence) simCadence.textContent = data.cadence;
      if (simTitle) simTitle.textContent = data.title;
      if (simDesc) simDesc.textContent = data.desc;
      if (simList) {
        simList.replaceChildren(
          ...data.bullets.map((text) => {
            const li = document.createElement('li');
            li.textContent = text;
            return li;
          })
        );
      }
      if (simCta) simCta.setAttribute('data-open-modal', data.service);

      if (channelDisplay && prefersMotion) {
        channelDisplay.classList.remove('is-switching');
        void channelDisplay.offsetWidth;
        channelDisplay.classList.add('is-switching');
      }
    });
  });

  /* ------------------------------------------------------------------------
     6. Accessible FAQ Accordion
     ------------------------------------------------------------------------ */
  const faqTriggers = document.querySelectorAll('.faq-trigger');
  faqTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      const panelId = trigger.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      trigger.setAttribute('aria-expanded', String(!isExpanded));
      if (panel) panel.hidden = isExpanded;
    });
  });

  /* ------------------------------------------------------------------------
     7. Demo Form Validation & Confirmation Feedback
     ------------------------------------------------------------------------ */
  function attachFormHandler(formId, statusId, successTemplate) {
    const form = document.getElementById(formId);
    const status = document.getElementById(statusId);
    if (!form || !status) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      status.classList.remove('is-error');

      if (!form.checkValidity()) {
        status.classList.add('is-error');
        status.textContent = 'Please enter your name and a valid email address.';
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const service = String(data.get('service') || 'growth');
      status.textContent = successTemplate(name, service);
      form.reset();
    });
  }

  attachFormHandler(
    'contact-form',
    'contact-status',
    (name, service) => `Thanks ${name}! Your demo ${service} audit request is logged—our team will reach out shortly.`
  );

  attachFormHandler(
    'modal-form',
    'modal-status',
    (name, service) => `Confirmed for ${name}: Demo strategy session queued for ${service}.`
  );
})();
