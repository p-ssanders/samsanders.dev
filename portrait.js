// A decorative, on-demand ASCII lens. The image remains the accessible content.
(() => {
  const portrait = document.querySelector('.portrait');
  const photo = portrait?.querySelector('img');
  if (!photo) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const theme = matchMedia('(prefers-color-scheme: dark)');
  const canvas = document.createElement('canvas');
  const artwork = document.createElement('canvas');
  const sample = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const ink = artwork.getContext('2d');
  const sampler = sample.getContext('2d', { willReadFrequently: true });
  if (!context || !ink || !sampler) return;
  canvas.setAttribute('aria-hidden', 'true');

  let size = 0;
  let ready = false;
  let frame = 0;
  let opacity = 0;
  let target = 0;
  let previous = 0;
  let x = 0;
  let y = 0;
  const enabled = () => !motion.matches && pointer.matches;

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    target = opacity = 0;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function prepare() {
    reset();
    ready = false;
    if (!enabled() || !photo.complete || !photo.naturalWidth) return;

    // Match the image's content box and object-fit: cover / center 10% crop.
    size = photo.clientWidth - 2;
    if (size <= 0) return;
    const scale = Math.max(size / photo.naturalWidth, size / photo.naturalHeight);
    const columns = Math.round(size / 3.5);
    const rows = Math.round(size / 5);
    sample.width = columns;
    sample.height = rows;
    // Scale the WHOLE image into the destination and let the canvas crop it.
    // srcset density-corrects naturalWidth/Height, but drawImage's source
    // rectangle uses bitmap pixels. Mixing them zooms and shifts the face.
    const width = photo.naturalWidth * scale * columns / size;
    const height = photo.naturalHeight * scale * rows / size;
    sampler.drawImage(photo, (columns - width) * 0.5, (rows - height) * 0.1,
      width, height);

    let pixels;
    try {
      pixels = sampler.getImageData(0, 0, columns, rows).data;
    } catch {
      return; // A failed enhancement must never obscure the photograph.
    }

    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = artwork.width = Math.round(size * ratio);
    canvas.height = artwork.height = Math.round(size * ratio);
    const styles = getComputedStyle(document.documentElement);
    ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    ink.fillStyle = styles.getPropertyValue('--color-background').trim();
    ink.fillRect(0, 0, size, size);
    ink.fillStyle = styles.getPropertyValue('--color-accent').trim();
    ink.font = '6px ui-monospace, Menlo, Consolas, monospace';
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    // Measure the glyphs rather than assuming equal steps in a character ramp.
    // Rounder forms avoid horizontal bars across the brows; calibrated coverage
    // preserves the small tonal differences between skin, eyes, and teeth.
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = Math.ceil(size / columns * ratio);
    glyphCanvas.height = Math.ceil(size / rows * ratio);
    const glyphContext = glyphCanvas.getContext('2d');
    if (!glyphContext) return;
    glyphContext.scale(ratio, ratio);
    glyphContext.font = ink.font;
    glyphContext.textAlign = 'center';
    glyphContext.textBaseline = 'middle';
    const glyphs = Array.from('.,:;iloO08#%@', character => {
      glyphContext.clearRect(0, 0, glyphCanvas.width / ratio, glyphCanvas.height / ratio);
      glyphContext.fillText(character, glyphCanvas.width / ratio / 2,
        glyphCanvas.height / ratio / 2);
      const data = glyphContext.getImageData(0, 0, glyphCanvas.width, glyphCanvas.height).data;
      let coverage = 0;
      for (let i = 3; i < data.length; i += 4) coverage += data[i] / 255;
      return { character, coverage: coverage / (data.length / 4) };
    }).filter(glyph => glyph.coverage > 0).sort((a, b) => a.coverage - b.coverage);
    if (!glyphs.length) return;
    const maximumCoverage = glyphs[glyphs.length - 1].coverage;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const offset = (row * columns + column) * 4;
        const luminance = (pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152
          + pixels[offset + 2] * 0.0722) / 255;
        const density = (theme.matches ? luminance : 1 - luminance)
          * pixels[offset + 3] / 255;
        if (density === 0) continue;
        const coverage = density * maximumCoverage;
        const glyph = glyphs.find(glyph => glyph.coverage >= coverage)
          || glyphs[glyphs.length - 1];
        ink.globalAlpha = coverage / glyph.coverage;
        ink.fillText(glyph.character, (column + 0.5) * size / columns,
          (row + 0.5) * size / rows);
      }
    }
    if (!canvas.isConnected) portrait.append(canvas);
    ready = true;
  }

  function draw(now) {
    frame = 0;
    const elapsed = Math.min(now - previous, 40);
    previous = now;
    const step = elapsed / (target ? 140 : 220);
    opacity = target ? Math.min(1, opacity + step) : Math.max(0, opacity - step);
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (opacity > 0) {
      context.globalCompositeOperation = 'source-over';
      context.drawImage(artwork, 0, 0);
      const ratio = canvas.width / size;
      const radius = Math.min(size * 0.27, 100) * ratio;
      const mask = context.createRadialGradient(x * ratio, y * ratio, radius * 0.5,
        x * ratio, y * ratio, radius);
      mask.addColorStop(0, `rgba(0,0,0,${opacity})`);
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      context.globalCompositeOperation = 'destination-in';
      context.fillStyle = mask;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'source-over';
    }
    if (opacity !== target) frame = requestAnimationFrame(draw);
  }

  function schedule() {
    if (frame) return;
    previous = performance.now();
    frame = requestAnimationFrame(draw);
  }

  portrait.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType === 'touch') return;
    if (!ready) prepare();
    if (!ready) return;
    const bounds = canvas.getBoundingClientRect();
    x = event.clientX - bounds.left;
    y = event.clientY - bounds.top;
    target = Math.hypot(x - size / 2, y - size / 2) < size / 2 ? 1 : 0;
    schedule();
  });
  const leave = () => { target = 0; if (ready) schedule(); };
  portrait.addEventListener('pointerleave', leave);
  portrait.addEventListener('pointercancel', leave);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  photo.addEventListener('load', () => { ready = false; reset(); });
  new ResizeObserver(() => { ready = false; reset(); }).observe(photo);
  [motion, pointer, theme].forEach(query => query.addEventListener('change', () => {
    ready = false;
    reset();
  }));
})();
