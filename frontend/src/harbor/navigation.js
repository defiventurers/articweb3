// All supplied asset roots are upright, unscaled and placed by translation.
export function worldBoxes(boxes, offset) {
  return boxes.filter(box => box.kind !== "floor").map(({name, center, size}) => ({
    name, x: center[0] + offset.x, y: center[1] + offset.y, z: center[2] + offset.z,
    rx: size[0] / 2, ry: size[1] / 2, rz: size[2] / 2
  }));
}

function overlaps(box, x, z, radius) {
  return Math.abs(x - box.x) < box.rx + radius && Math.abs(z - box.z) < box.rz + radius;
}

export function canWalk(layout, x, z, radius = .38) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !layout.onLand(x, z, radius)) return false;
  return !layout.solids.some(box => box.y - box.ry < 1.85 && overlaps(box, x, z, radius));
}

export function walk(layout, p, dx, dz) {
  const steps = Math.ceil(Math.hypot(dx, dz) / .16);
  for (let i = 0; i < steps; i++) {
    if (canWalk(layout, p.x + dx / steps, p.z)) p.x += dx / steps;
    if (canWalk(layout, p.x, p.z + dz / steps)) p.z += dz / steps;
  }
}

export function nearby(layout, p) {
  let closest = null, distance = Infinity;
  for (const site of layout.sites) {
    const d = Math.hypot(site.x - p.x, site.z - p.z);
    if (d <= site.range && d < distance) { closest = site.id; distance = d; }
  }
  return closest;
}

export function cameraBlocked(layout, x, y, z) {
  return layout.cameraBoxes.some(box => overlaps(box, x, z, .19) && Math.abs(y - box.y) < box.ry + .19);
}
