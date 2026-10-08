(() => {
  const viewer = document.querySelector('#figure-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;

  const image = viewer.querySelector('#viewer-image');
  const title = viewer.querySelector('#figure-viewer-title');
  const viewport = viewer.querySelector('.viewer-viewport');
  const level = viewer.querySelector('#zoom-level');
  const zoomIn = viewer.querySelector('[data-zoom-in]');
  const zoomOut = viewer.querySelector('[data-zoom-out]');
  let zoom = 1;
  let trigger = null;

  function renderZoom() {
    image.style.width = `${Math.round(viewport.clientWidth * zoom)}px`;
    level.textContent = `${Math.round(zoom * 100)}%`;
    zoomOut.disabled = zoom <= 1;
    zoomIn.disabled = zoom >= 3;
  }

  function changeZoom(next) {
    zoom = Math.min(3, Math.max(1, next));
    renderZoom();
  }

  document.querySelectorAll('[data-figure]').forEach(link => {
    link.addEventListener('click', event => {
      // Preserve native open-in-new-tab behavior and the no-JS image fallback.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      title.textContent = link.dataset.figure;
      image.alt = link.querySelector('img').alt;
      image.src = link.href;
      zoom = 1;
      viewer.showModal();
      document.body.classList.add('figure-open');
      viewport.scrollTop = 0;
      viewport.scrollLeft = 0;
      renderZoom();
    });
  });

  zoomIn.addEventListener('click', () => changeZoom(zoom + 0.5));
  zoomOut.addEventListener('click', () => changeZoom(zoom - 0.5));
  viewer.querySelector('[data-zoom-fit]').addEventListener('click', () => {
    changeZoom(1);
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
  });
  viewer.querySelector('[data-close-viewer]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const rect = viewer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('figure-open');
    trigger?.focus();
  });
  window.addEventListener('resize', () => {
    if (viewer.open) renderZoom();
  });
})();

(() => {
  const resetVideos = new Map();
  document.querySelectorAll('[data-video-demo]').forEach(demo => {
    const video = demo.querySelector('[data-demo-video]');
    const cover = demo.querySelector('[data-demo-cover]');
    const reveal = demo.querySelector('[data-reveal-video]');
    const hide = demo.querySelector('[data-hide-video]');
    const loadState = demo.querySelector('[data-video-load-state]');
    const status = demo.querySelector('[data-video-status]');
    const retry = demo.querySelector('[data-retry-video]');
    if (!video || !cover || !reveal || !hide || !loadState || !status || !retry) return;

    let revealed = false;
    let loading = false;
    let slowTimer;
    const isActive = () => revealed && video.hasAttribute('src');
    const clearLoading = () => {
      clearTimeout(slowTimer);
      slowTimer = undefined;
      loading = false;
    };
    const showStatus = (message, canRetry = false) => {
      status.textContent = message;
      retry.hidden = !canRetry;
      loadState.hidden = !message;
    };
    const showLoading = () => {
      if (!isActive() || video.error || loading) return;
      loading = true;
      showStatus('Loading video…');
      // A slow request is not a failed video. Let the viewer choose when to retry.
      slowTimer = setTimeout(() => {
        if (isActive() && loading && !video.error) {
          showStatus('This is taking longer than expected. Try Play or retry loading.', true);
        }
      }, 12000);
    };
    const showReady = () => {
      if (!isActive() || video.error || video.readyState < 2) return;
      clearLoading();
      showStatus(video.paused ? 'Ready — press play.' : '');
    };

    const reset = () => {
      revealed = false;
      clearLoading();
      cover.hidden = false;
      video.pause();
      video.hidden = true;
      video.preload = 'none';
      if (video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
      hide.hidden = true;
      showStatus('');
      reveal.setAttribute('aria-expanded', 'false');
    };
    resetVideos.set(demo, reset);

    const loadVideo = () => {
      clearLoading();
      video.pause();
      video.muted = true;
      // Fetch immediately after consent, while leaving playback to the viewer.
      video.preload = 'auto';
      if (!video.hasAttribute('src')) video.src = video.dataset.videoSrc;
      video.load();
      showLoading();
      video.focus();
    };

    reveal.disabled = false;
    reveal.addEventListener('click', () => {
      // Only the active example can remain revealed.
      resetVideos.forEach((resetOther, other) => {
        if (other !== demo) resetOther();
      });
      revealed = true;
      cover.hidden = true;
      video.hidden = false;
      hide.hidden = false;
      reveal.setAttribute('aria-expanded', 'true');
      loadVideo();
    });

    retry.addEventListener('click', () => {
      if (isActive()) loadVideo();
    });
    hide.addEventListener('click', () => {
      reset();
      reveal.focus();
    });

    ['loadeddata', 'canplay', 'pause', 'ended'].forEach(event => {
      video.addEventListener(event, showReady);
    });
    ['waiting', 'stalled'].forEach(event => {
      video.addEventListener(event, () => {
        if (video.readyState < 2 || (!video.paused && video.readyState < 3)) showLoading();
      });
    });
    video.addEventListener('playing', () => {
      if (!isActive() || video.error || video.paused) return;
      clearLoading();
      showStatus('');
    });
    video.addEventListener('error', () => {
      // Ignore events queued by a source that has since been hidden or reset.
      if (!isActive() || !video.error) return;
      clearLoading();
      showStatus('The video could not be loaded. Please retry.', true);
    });
  });

  const tabList = document.querySelector('[data-demo-tabs]');
  if (!tabList) return;
  const tabs = [...tabList.querySelectorAll('[data-demo-tab]')];
  const panels = [...document.querySelectorAll('[data-demo-panel]')];
  if (!tabs.length || tabs.length !== panels.length) return;

  const resetPanel = panel => {
    panel.querySelectorAll('[data-video-demo]').forEach(demo => resetVideos.get(demo)?.());
  };

  panels.forEach(panel => {
    const chooser = panel.querySelector('[data-demo-choices]');
    if (!chooser) return;
    const choices = [...chooser.querySelectorAll('[data-demo-choice]')];
    const demos = [...panel.querySelectorAll('[data-video-demo]')];
    const selectExample = choice => {
      choices.forEach(button => button.setAttribute('aria-pressed', String(button === choice)));
      demos.forEach(demo => {
        const selected = demo.id === choice.dataset.demoChoice;
        if (!selected) resetVideos.get(demo)?.();
        demo.hidden = !selected;
      });
    };
    choices.forEach(choice => choice.addEventListener('click', () => selectExample(choice)));
    selectExample(choices[0]);
    chooser.hidden = false;
  });

  const selectGroup = tab => {
    tabs.forEach(button => {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => {
      const selected = panel.id === tab.getAttribute('aria-controls');
      if (!selected) resetPanel(panel);
      panel.hidden = !selected;
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectGroup(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectGroup(tabs[next]);
      tabs[next].focus();
    });
  });

  panels.forEach((panel, index) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabs[index].id);
    panel.tabIndex = 0;
  });
  selectGroup(tabs[0]);
  tabList.hidden = false;
})();

(() => {
  const button = document.querySelector('[data-copy-bibtex]');
  const code = document.querySelector('#bibtex-code');
  const status = document.querySelector('[data-copy-status]');
  if (!button || !code || !status) return;

  let resetTimer;
  button.addEventListener('click', async () => {
    const text = code.textContent.trim();
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      // Fall back to the legacy copy command when clipboard access is unavailable.
    }

    if (!copied) {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      try { copied = document.execCommand('copy'); } catch { /* Continue to manual selection. */ }
      field.remove();
      button.focus();
    }

    if (!copied) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    button.textContent = copied ? 'Copied!' : 'Copy failed';
    status.textContent = copied ? 'BibTeX copied to clipboard.' : 'BibTeX selected. Copy it manually.';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      button.textContent = 'Copy BibTeX';
      status.textContent = '';
    }, 2500);
  });
})();
