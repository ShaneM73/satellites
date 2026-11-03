// Renders an instrument list with the four resolutions.
export function instrumentsHTML(inst, color) {
  if (!inst || !inst.length) return '<p class="tl-note">No Earth-imaging instruments.</p>';
  const c = color ? ` style="--c:${color}"` : '';
  return inst.map(([n, sp, spec, temp, rad]) => `
    <div class="inst"${c}>
      <div class="inst-name">${n}</div>
      <dl>
        <dt>Spatial</dt><dd>${sp}</dd>
        <dt>Spectral</dt><dd>${spec}</dd>
        <dt>Temporal</dt><dd>${temp}</dd>
        <dt>Radiometric</dt><dd>${rad}</dd>
      </dl>
    </div>`).join('');
}
