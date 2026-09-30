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
