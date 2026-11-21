import { FALLBACK_FONT_OPTIONS, FONT_OPTIONS } from '../core/config.js';
import { disposeObject3D } from './eratisLogo.js';

const TARGET_CAP_HEIGHT = 1.5;
const COORD_EPS = 1e-5;

function getTHREE() {
  if (typeof window === 'undefined' || !window.THREE) {
    throw new Error('Three.js r128 must be loaded before using TextBuilder.');
  }
  return window.THREE;
}

export function polySignedArea(pts) {
  let area = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return area * 0.5;
}

export function polyBounds(pts) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

function polyPerimeter(pts) {
  let perim = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    perim += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return perim;
}

function pointToSegDistSq(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-14) {
    const ex = px - a.x;
    const ey = py - a.y;
    return ex * ex + ey * ey;
  }
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function windingNumber(px, py, polys) {
  let wn = 0;
  for (let p = 0; p < polys.length; p++) {
    const pts = polys[p];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if (a.y <= py) {
        if (b.y > py) {
          if ((b.x - a.x) * (py - a.y) - (px - a.x) * (b.y - a.y) > 0) wn++;
        }
      } else if (b.y <= py) {
        if ((b.x - a.x) * (py - a.y) - (px - a.x) * (b.y - a.y) < 0) wn--;
      }
    }
  }
  return wn;
}

function getStrictlyInteriorPoint(pts) {
  const area = polySignedArea(pts);
  const sign = area >= 0 ? 1 : -1;
  let bestIdx = 0;
  let bestLen = -1;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > bestLen) {
      bestLen = len;
      bestIdx = i;
    }
  }
  const a = pts[bestIdx];
  const b = pts[(bestIdx + 1) % pts.length];
  const mx = (a.x + b.x) * 0.5;
  const my = (a.y + b.y) * 0.5;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.max(1e-8, Math.hypot(dx, dy));
  const nx = (-dy / len) * sign;
  const ny = (dx / len) * sign;

  let minD = bestLen * 0.25;
  for (let i = 0; i < pts.length; i++) {
    if (i === bestIdx) continue;
    const d = Math.sqrt(pointToSegDistSq(mx, my, pts[i], pts[(i + 1) % pts.length]));
    if (d > 1e-7 && d < minD) minD = d;
  }
  const step = Math.max(1e-6, Math.min(1e-3, minD * 0.3));
  const cand = { x: mx + nx * step, y: my + ny * step };
  if (pointInPoly(cand.x, cand.y, pts)) return cand;
  return { x: mx - nx * step, y: my - ny * step };
}

function cleanClosedPolygon(rawPts) {
  if (!rawPts || rawPts.length < 3) return null;
  const dedup = [];
  for (let i = 0; i < rawPts.length; i++) {
    const pt = rawPts[i];
    if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
    const prev = dedup[dedup.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) > COORD_EPS) {
      dedup.push({ x: pt.x, y: pt.y });
    }
  }
  while (
    dedup.length > 1 &&
    Math.hypot(dedup[0].x - dedup[dedup.length - 1].x, dedup[0].y - dedup[dedup.length - 1].y) <= COORD_EPS
  ) {
    dedup.pop();
  }
  if (dedup.length < 3) return null;

  const pruned = [];
  const n = dedup.length;
  for (let i = 0; i < n; i++) {
    const prev = dedup[(i - 1 + n) % n];
    const curr = dedup[i];
    const next = dedup[(i + 1) % n];
    const ax = curr.x - prev.x;
    const ay = curr.y - prev.y;
    const bx = next.x - curr.x;
    const by = next.y - curr.y;
    const lenA = Math.hypot(ax, ay);
    const lenB = Math.hypot(bx, by);
    if (lenA < COORD_EPS || lenB < COORD_EPS) continue;
    const cross = Math.abs(ax * by - ay * bx) / (lenA * lenB);
    const dot = (ax * bx + ay * by) / (lenA * lenB);

    if (cross < 1e-4 && dot > 0) continue;
    pruned.push(curr);
  }
  if (pruned.length < 3) return null;
  if (Math.abs(polySignedArea(pruned)) < 1e-5) return null;
  return pruned;
}

function segIntersectParams(a, b, c, d) {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const denom = rx * sy - ry * sx;
  const qpx = c.x - a.x;
  const qpy = c.y - a.y;

  if (Math.abs(denom) < 1e-10) {
    const cross = qpx * ry - qpy * rx;
    if (Math.abs(cross) > 1e-6 * Math.max(1, Math.hypot(rx, ry))) return null;
    const rr = rx * rx + ry * ry;
    const ss = sx * sx + sy * sy;
    if (rr < 1e-12 || ss < 1e-12) return null;
    const t0 = (qpx * rx + qpy * ry) / rr;
    const t1 = ((d.x - a.x) * rx + (d.y - a.y) * ry) / rr;
    const u0 = (-qpx * sx - qpy * sy) / ss;
    const u1 = ((b.x - c.x) * sx + (b.y - c.y) * sy) / ss;
    const ts = [];
    const us = [];
    if (t0 > 1e-6 && t0 < 1 - 1e-6) ts.push(t0);
    if (t1 > 1e-6 && t1 < 1 - 1e-6) ts.push(t1);
    if (u0 > 1e-6 && u0 < 1 - 1e-6) us.push(u0);
    if (u1 > 1e-6 && u1 < 1 - 1e-6) us.push(u1);
    if (ts.length > 0 || us.length > 0) return { collinear: true, ts, us };
    return null;
  }

  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * ry - qpy * rx) / denom;
  if (t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) {
    const tEnd = t <= 1e-5 || t >= 1 - 1e-5;
    const uEnd = u <= 1e-5 || u >= 1 - 1e-5;
    if (tEnd && uEnd) return null;
    return {
      collinear: false,
      t: Math.max(0, Math.min(1, t)),
      u: Math.max(0, Math.min(1, u))
    };
  }
  return null;
}

export function hasContourIntersections(polys) {
  const segs = [];
  for (let p = 0; p < polys.length; p++) {
    const pts = polys[p];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      segs.push({
        p,
        i,
        a,
        b,
        minX: Math.min(a.x, b.x),
        maxX: Math.max(a.x, b.x),
        minY: Math.min(a.y, b.y),
        maxY: Math.max(a.y, b.y)
      });
    }
  }

  for (let i = 0; i < segs.length; i++) {
    const s1 = segs[i];
    for (let j = i + 1; j < segs.length; j++) {
      const s2 = segs[j];
      if (
        s1.maxX + COORD_EPS < s2.minX ||
        s2.maxX + COORD_EPS < s1.minX ||
        s1.maxY + COORD_EPS < s2.minY ||
        s2.maxY + COORD_EPS < s1.minY
      ) {
        continue;
      }
      if (s1.p === s2.p) {
        const n = polys[s1.p].length;
        if ((s1.i + 1) % n === s2.i || (s2.i + 1) % n === s1.i) continue;
      }
      if (segIntersectParams(s1.a, s1.b, s2.a, s2.b)) return true;
    }
  }
  return false;
}

export function planarNonZeroUnion(polys) {
  const segs = [];
  for (let p = 0; p < polys.length; p++) {
    const pts = polys[p];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (Math.hypot(b.x - a.x, b.y - a.y) < 1e-6) continue;
      segs.push({
        a,
        b,
        minX: Math.min(a.x, b.x),
        maxX: Math.max(a.x, b.x),
        minY: Math.min(a.y, b.y),
        maxY: Math.max(a.y, b.y),
        splits: [0, 1]
      });
    }
  }

  if (segs.length === 0 || segs.length > 1400) {
    return polys;
  }

  for (let i = 0; i < segs.length; i++) {
    const s1 = segs[i];
    for (let j = i + 1; j < segs.length; j++) {
      const s2 = segs[j];
      if (
        s1.maxX + 1e-4 < s2.minX ||
        s2.maxX + 1e-4 < s1.minX ||
        s1.maxY + 1e-4 < s2.minY ||
        s2.maxY + 1e-4 < s1.minY
      ) {
        continue;
      }
      const hit = segIntersectParams(s1.a, s1.b, s2.a, s2.b);
      if (!hit) continue;
      if (hit.collinear) {
        for (let k = 0; k < hit.ts.length; k++) s1.splits.push(hit.ts[k]);
        for (let k = 0; k < hit.us.length; k++) s2.splits.push(hit.us[k]);
      } else {
        if (hit.t > 1e-6 && hit.t < 1 - 1e-6) s1.splits.push(hit.t);
        if (hit.u > 1e-6 && hit.u < 1 - 1e-6) s2.splits.push(hit.u);
      }
    }
  }

  const SNAP = 1e-4;
  const vertGrid = new Map();
  const verts = [];

  function getVert(x, y) {
    const kx = Math.round(x / SNAP);
    const ky = Math.round(y / SNAP);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = vertGrid.get(`${kx + dx},${ky + dy}`);
        if (!bucket) continue;
        for (let bi = 0; bi < bucket.length; bi++) {
          const id = bucket[bi];
          if (Math.hypot(verts[id].x - x, verts[id].y - y) < SNAP * 1.4) {
            return id;
          }
        }
      }
    }
    const id = verts.length;
    verts.push({ x, y });
    const key = `${kx},${ky}`;
    let bucket = vertGrid.get(key);
    if (!bucket) {
      bucket = [];
      vertGrid.set(key, bucket);
    }
    bucket.push(id);
    return id;
  }

  const edgeSet = new Set();
  const atomicEdges = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    s.splits.sort((a, b) => a - b);
    const uniq = [s.splits[0]];
    for (let k = 1; k < s.splits.length; k++) {
      if (s.splits[k] - uniq[uniq.length - 1] > 1e-6) uniq.push(s.splits[k]);
    }
    for (let k = 0; k < uniq.length - 1; k++) {
      const t0 = uniq[k];
      const t1 = uniq[k + 1];
      const u = getVert(s.a.x + (s.b.x - s.a.x) * t0, s.a.y + (s.b.y - s.a.y) * t0);
      const v = getVert(s.a.x + (s.b.x - s.a.x) * t1, s.a.y + (s.b.y - s.a.y) * t1);
      if (u === v) continue;
      const key = u < v ? `${u}:${v}` : `${v}:${u}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const pu = verts[u];
        const pv = verts[v];
        atomicEdges.push({
          u,
          v,
          minX: Math.min(pu.x, pv.x),
          maxX: Math.max(pu.x, pv.x),
          minY: Math.min(pu.y, pv.y),
          maxY: Math.max(pu.y, pv.y)
        });
      }
    }
  }

  const outEdges = new Map();
  const directed = [];
  for (let ei = 0; ei < atomicEdges.length; ei++) {
    const ae = atomicEdges[ei];
    const pu = verts[ae.u];
    const pv = verts[ae.v];
    const dx = pv.x - pu.x;
    const dy = pv.y - pu.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;

    const mx = (pu.x + pv.x) * 0.5;
    const my = (pu.y + pv.y) * 0.5;
    const nx = -dy / len;
    const ny = dx / len;

    let minDistSq = 1e-4;
    for (let ej = 0; ej < atomicEdges.length; ej++) {
      if (ej === ei) continue;
      const oe = atomicEdges[ej];
      if (mx + 0.02 < oe.minX || mx - 0.02 > oe.maxX || my + 0.02 < oe.minY || my - 0.02 > oe.maxY) continue;
      const dSq = pointToSegDistSq(mx, my, verts[oe.u], verts[oe.v]);
      if (dSq > 1e-14 && dSq < minDistSq) minDistSq = dSq;
    }
    const probe = Math.max(1e-7, Math.min(1e-3, Math.sqrt(minDistSq) * 0.35));

    const leftFilled = windingNumber(mx + nx * probe, my + ny * probe, polys) !== 0;
    const rightFilled = windingNumber(mx - nx * probe, my - ny * probe, polys) !== 0;
    if (leftFilled === rightFilled) continue;

    const from = leftFilled ? ae.u : ae.v;
    const to = leftFilled ? ae.v : ae.u;
    const eIdx = directed.length;
    directed.push({
      from,
      to,
      used: false,
      angle: Math.atan2(verts[to].y - verts[from].y, verts[to].x - verts[from].x)
    });
    let list = outEdges.get(from);
    if (!list) {
      list = [];
      outEdges.set(from, list);
    }
    list.push(eIdx);
  }

  const loops = [];
  for (let i = 0; i < directed.length; i++) {
    if (directed[i].used) continue;
    const loop = [];
    let currIdx = i;
    let guard = 0;
    const startVert = directed[i].from;
    while (currIdx !== -1 && !directed[currIdx].used && guard++ < directed.length + 2) {
      const e = directed[currIdx];
      e.used = true;
      loop.push(verts[e.from]);
      if (e.to === startVert && loop.length >= 3) break;
      const candidates = (outEdges.get(e.to) || []).filter((idx) => !directed[idx].used);
      if (candidates.length === 0) break;
      if (candidates.length === 1) {
        currIdx = candidates[0];
      } else {
        const backAngle = Math.atan2(verts[e.from].y - verts[e.to].y, verts[e.from].x - verts[e.to].x);
        let best = candidates[0];
        let bestDelta = Infinity;
        for (let ci = 0; ci < candidates.length; ci++) {
          const cIdx = candidates[ci];
          let delta = directed[cIdx].angle - backAngle;
          while (delta <= 0) delta += Math.PI * 2;
          while (delta > Math.PI * 2) delta -= Math.PI * 2;
          if (delta < bestDelta) {
            bestDelta = delta;
            best = cIdx;
          }
        }
        currIdx = best;
      }
    }
    const cleaned = cleanClosedPolygon(loop);
    if (cleaned && Math.abs(polySignedArea(cleaned)) > 1e-4) {
      loops.push(cleaned);
    }
  }

  return loops.length > 0 ? loops : polys;
}

export function buildContainmentShapes(loops) {
  const items = [];
  for (let i = 0; i < loops.length; i++) {
    const cleaned = cleanClosedPolygon(loops[i]);
    if (!cleaned) continue;
    const area = polySignedArea(cleaned);
    const absArea = Math.abs(area);
    if (absArea < 1e-4) continue;
    items.push({
      pts: cleaned,
      area,
      absArea,
      bounds: polyBounds(cleaned),
      interiorPt: getStrictlyInteriorPoint(cleaned),
      parent: -1,
      depth: 0
    });
  }

  items.sort((a, b) => b.absArea - a.absArea);

  for (let i = 0; i < items.length; i++) {
    const child = items[i];
    const tp = child.interiorPt;
    let bestParent = -1;
    for (let j = i - 1; j >= 0; j--) {
      const cand = items[j];
      if (
        tp.x < cand.bounds.minX ||
        tp.x > cand.bounds.maxX ||
        tp.y < cand.bounds.minY ||
        tp.y > cand.bounds.maxY
      ) {
        continue;
      }
      if (pointInPoly(tp.x, tp.y, cand.pts)) {
        bestParent = j;
        break;
      }
    }
    child.parent = bestParent;
    child.depth = bestParent === -1 ? 0 : items[bestParent].depth + 1;
  }

  const solids = [];
  const solidByIdx = new Map();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.depth % 2 === 0) {
      const outer = it.area < 0 ? [...it.pts].reverse() : it.pts;
      const solid = { outer, holes: [] };
      solids.push(solid);
      solidByIdx.set(i, solid);
    }
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.depth % 2 === 1 && solidByIdx.has(it.parent)) {
      const hole = it.area > 0 ? [...it.pts].reverse() : it.pts;
      solidByIdx.get(it.parent).holes.push(hole);
    }
  }

  return solids;
}

export function commandsToPolygons(commands, scale = 1) {
  const subs = [];
  let cur = [];
  let px = 0;
  let py = 0;

  const finalize = () => {
    const cleaned = cleanClosedPolygon(cur);
    if (cleaned) subs.push(cleaned);
    cur = [];
  };

  for (let i = 0; i < commands.length; i++) {
    const c = commands[i];
    if (c.type === 'M') {
      if (cur.length > 0) finalize();
      px = c.x * scale;
      py = c.y * scale;
      cur = [{ x: px, y: py }];
    } else if (c.type === 'L') {
      const x = c.x * scale;
      const y = c.y * scale;
      if (Math.hypot(x - px, y - py) > COORD_EPS) cur.push({ x, y });
      px = x;
      py = y;
    } else if (c.type === 'Q') {
      const x1 = c.x1 * scale;
      const y1 = c.y1 * scale;
      const x = c.x * scale;
      const y = c.y * scale;
      const ctrlLen = Math.hypot(x1 - px, y1 - py) + Math.hypot(x - x1, y - y1);
      const chordLen = Math.hypot(x - px, y - py);
      const bend = Math.max(0, ctrlLen - chordLen);
      const steps = Math.max(3, Math.min(18, Math.ceil(ctrlLen * 10 + bend * 28)));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const u = 1 - t;
        const qx = u * u * px + 2 * u * t * x1 + t * t * x;
        const qy = u * u * py + 2 * u * t * y1 + t * t * y;
        const prev = cur[cur.length - 1];
        if (!prev || Math.hypot(qx - prev.x, qy - prev.y) > COORD_EPS) {
          cur.push({ x: qx, y: qy });
        }
      }
      px = x;
      py = y;
    } else if (c.type === 'C') {
      const x1 = c.x1 * scale;
      const y1 = c.y1 * scale;
      const x2 = c.x2 * scale;
      const y2 = c.y2 * scale;
      const x = c.x * scale;
      const y = c.y * scale;
      const ctrlLen =
        Math.hypot(x1 - px, y1 - py) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x - x2, y - y2);
      const chordLen = Math.hypot(x - px, y - py);
      const bend = Math.max(0, ctrlLen - chordLen);
      const steps = Math.max(4, Math.min(20, Math.ceil(ctrlLen * 10 + bend * 28)));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const u = 1 - t;
        const bx = u * u * u * px + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x;
        const by = u * u * u * py + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y;
        const prev = cur[cur.length - 1];
        if (!prev || Math.hypot(bx - prev.x, by - prev.y) > COORD_EPS) {
          cur.push({ x: bx, y: by });
        }
      }
      px = x;
      py = y;
    } else if (c.type === 'Z') {
      if (cur.length > 0) finalize();
    }
  }
  if (cur.length > 0) finalize();

  return subs;
}

export function parseTypefaceOutlineCommands(oStr) {
  const tokens = (oStr || '').trim().split(/\s+/);
  const commands = [];
  let i = 0;
  let hasOpen = false;

  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'm') {
      if (hasOpen) commands.push({ type: 'Z' });
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        commands.push({ type: 'M', x, y });
        hasOpen = true;
      }
    } else if (cmd === 'l') {
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        commands.push({ type: 'L', x, y });
      }
    } else if (cmd === 'q') {

      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      const x1 = Number(tokens[i++]);
      const y1 = Number(tokens[i++]);
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(x1) && Number.isFinite(y1)) {
        commands.push({ type: 'Q', x1, y1, x, y });
      }
    } else if (cmd === 'b') {

      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      const x1 = Number(tokens[i++]);
      const y1 = Number(tokens[i++]);
      const x2 = Number(tokens[i++]);
      const y2 = Number(tokens[i++]);
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(x1) &&
        Number.isFinite(y1) &&
        Number.isFinite(x2) &&
        Number.isFinite(y2)
      ) {
        commands.push({ type: 'C', x1, y1, x2, y2, x, y });
      }
    }
  }
  if (hasOpen) commands.push({ type: 'Z' });
  return commands;
}

export function computeSafeBevelSize(solids, requestedBevelSize) {
  const req = Math.max(0, Number(requestedBevelSize) || 0);
  if (req <= 0.002 || !solids || solids.length === 0) return 0;

  let maxAllowed = req;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    let netArea = Math.abs(polySignedArea(s.outer));
    let totalPerim = polyPerimeter(s.outer);

    for (let h = 0; h < s.holes.length; h++) {
      const hole = s.holes[h];
      netArea -= Math.abs(polySignedArea(hole));
      totalPerim += polyPerimeter(hole);
      const hb = polyBounds(hole);
      const minHoleSpan = Math.min(hb.maxX - hb.minX, hb.maxY - hb.minY);
      if (minHoleSpan > 0) {
        maxAllowed = Math.min(maxAllowed, minHoleSpan * 0.24);
      }
    }

    if (netArea > 1e-5 && totalPerim > 1e-4) {

      const estStroke = (2 * netArea) / totalPerim;
      maxAllowed = Math.min(maxAllowed, estStroke * 0.28);
    }
  }

  return Math.max(0, Math.min(req, maxAllowed));
}

function lookupCoverageIndex(coverage, glyphId) {
  if (!coverage) return -1;
  if (coverage.format === 1 && Array.isArray(coverage.glyphs)) {
    return coverage.glyphs.indexOf(glyphId);
  }
  if (coverage.format === 2 && Array.isArray(coverage.ranges)) {
    for (let i = 0; i < coverage.ranges.length; i++) {
      const r = coverage.ranges[i];
      if (glyphId >= r.start && glyphId <= r.end) {
        return r.index + (glyphId - r.start);
      }
    }
  }
  return -1;
}

function lookupClassDef(classDef, glyphId) {
  if (!classDef) return 0;
  if (classDef.format === 1) {
    const offset = glyphId - classDef.startGlyph;
    if (offset >= 0 && Array.isArray(classDef.classes) && offset < classDef.classes.length) {
      return classDef.classes[offset] || 0;
    }
    return 0;
  }
  if (classDef.format === 2 && Array.isArray(classDef.ranges)) {
    for (let i = 0; i < classDef.ranges.length; i++) {
      const r = classDef.ranges[i];
      if (glyphId >= r.start && glyphId <= r.end) {
        return r.classId || 0;
      }
    }
  }
  return 0;
}

export function getOpenTypeKerning(otFont, prevGlyph, currGlyph) {
  if (!otFont || !prevGlyph || !currGlyph) return 0;

  if (typeof otFont.getKerningValue === 'function') {
    try {
      const val = otFont.getKerningValue(prevGlyph, currGlyph);
      if (Number.isFinite(val) && val !== 0) return val;
    } catch (_) {}
  }

  const gpos = otFont.tables && otFont.tables.gpos;
  if (!gpos || !Array.isArray(gpos.lookups)) return 0;

  const leftId = prevGlyph.index;
  const rightId = currGlyph.index;
  if (!Number.isInteger(leftId) || !Number.isInteger(rightId)) return 0;

  for (let li = 0; li < gpos.lookups.length; li++) {
    const lookup = gpos.lookups[li];
    if (!lookup || lookup.lookupType !== 2 || !Array.isArray(lookup.subtables)) continue;

    for (let si = 0; si < lookup.subtables.length; si++) {
      const sub = lookup.subtables[si];
      if (!sub || !sub.coverage) continue;
      const covIdx = lookupCoverageIndex(sub.coverage, leftId);
      if (covIdx < 0) continue;

      if (sub.posFormat === 1 && Array.isArray(sub.pairSets)) {
        const pairSet = sub.pairSets[covIdx];
        if (!Array.isArray(pairSet)) continue;
        for (let pi = 0; pi < pairSet.length; pi++) {
          const pair = pairSet[pi];
          if (pair.secondGlyph === rightId && pair.value1 && Number.isFinite(pair.value1.xAdvance)) {
            return pair.value1.xAdvance;
          }
        }
      } else if (sub.posFormat === 2 && Array.isArray(sub.classRecords)) {
        const c1 = lookupClassDef(sub.classDef1, leftId);
        const c2 = lookupClassDef(sub.classDef2, rightId);
        const row = sub.classRecords[c1];
        const rec = row && row[c2];
        if (rec && rec.value1 && Number.isFinite(rec.value1.xAdvance)) {
          return rec.value1.xAdvance;
        }
      }
    }
  }

  return 0;
}

export function convertOpenTypeToThreeFont(otFont) {
  const round = Math.round;
  const unitsPerEm = otFont.unitsPerEm || 1000;
  const scale = 1000 / unitsPerEm;
  const glyphs = {};
  const glyphMap = otFont.glyphs && otFont.glyphs.glyphs ? otFont.glyphs.glyphs : {};

  for (const key of Object.keys(glyphMap)) {
    const glyph = glyphMap[key];
    if (!glyph) continue;
    const unicodes =
      Array.isArray(glyph.unicodes) && glyph.unicodes.length > 0
        ? glyph.unicodes
        : glyph.unicode !== undefined
          ? [glyph.unicode]
          : [];
    if (unicodes.length === 0) continue;

    const rawCommands = glyph.path && Array.isArray(glyph.path.commands) ? glyph.path.commands : [];
    const parts = [];
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    for (let i = 0; i < rawCommands.length; i++) {
      const cmd = rawCommands[i];
      if (cmd.type === 'M') {
        startX = round(cmd.x * scale);
        startY = round(cmd.y * scale);
        lastX = startX;
        lastY = startY;
        parts.push(`m ${startX} ${startY}`);
      } else if (cmd.type === 'L') {
        lastX = round(cmd.x * scale);
        lastY = round(cmd.y * scale);
        parts.push(`l ${lastX} ${lastY}`);
      } else if (cmd.type === 'Q') {
        lastX = round(cmd.x * scale);
        lastY = round(cmd.y * scale);

        parts.push(`q ${lastX} ${lastY} ${round(cmd.x1 * scale)} ${round(cmd.y1 * scale)}`);
      } else if (cmd.type === 'C') {
        lastX = round(cmd.x * scale);
        lastY = round(cmd.y * scale);

        parts.push(
          `b ${lastX} ${lastY} ${round(cmd.x1 * scale)} ${round(cmd.y1 * scale)} ${round(cmd.x2 * scale)} ${round(cmd.y2 * scale)}`
        );
      } else if (cmd.type === 'Z') {
        if (lastX !== startX || lastY !== startY) {
          parts.push(`l ${startX} ${startY}`);
          lastX = startX;
          lastY = startY;
        }
      }
    }

    const token = {
      ha: round((glyph.advanceWidth || unitsPerEm * 0.5) * scale),
      x_min: round((glyph.xMin || 0) * scale),
      x_max: round((glyph.xMax || glyph.advanceWidth || 500) * scale),
      o: parts.join(' ') + (parts.length > 0 ? ' ' : '')
    };

    for (const code of unicodes) {
      try {
        glyphs[String.fromCodePoint(code)] = token;
      } catch (_) {}
    }
  }

  const head = otFont.tables && otFont.tables.head ? otFont.tables.head : {};
  const post = otFont.tables && otFont.tables.post ? otFont.tables.post : {};
  const familyName =
    (otFont.names &&
      otFont.names.fontFamily &&
      (otFont.names.fontFamily.en || Object.values(otFont.names.fontFamily)[0])) ||
    'Custom3DFont';

  const typefaceData = {
    glyphs,
    familyName,
    ascender: round((otFont.ascender || 800) * scale),
    descender: round((otFont.descender || -200) * scale),
    underlinePosition: round((post.underlinePosition || -100) * scale),
    underlineThickness: round((post.underlineThickness || 50) * scale),
    boundingBox: {
      xMin: round((head.xMin || 0) * scale),
      yMin: round((head.yMin || -200) * scale),
      xMax: round((head.xMax || 1000) * scale),
      yMax: round((head.yMax || 1000) * scale)
    },
    resolution: 1000,
    original_font_information: (otFont.tables && otFont.tables.name) || {}
  };

  if (typeof window !== 'undefined' && window.THREE && window.THREE.Font) {
    return new window.THREE.Font(typefaceData);
  }
  return { data: typefaceData };
}

function measureNormalizedFontMetrics(fontRecord) {
  const capSamples = ['H', 'E', 'M', 'I', 'O', 'A'];
  let capHeight = 0;

  for (let i = 0; i < capSamples.length; i++) {
    const ch = capSamples[i];
    const cmds = getRawGlyphCommands(fontRecord, ch);
    if (!cmds || cmds.length === 0) continue;
    const polys = commandsToPolygons(cmds, 1);
    if (polys.length === 0) continue;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let p = 0; p < polys.length; p++) {
      const b = polyBounds(polys[p]);
      if (b.minY < minY) minY = b.minY;
      if (b.maxY > maxY) maxY = b.maxY;
    }
    const h = maxY - Math.max(0, minY);
    if (Number.isFinite(h) && h > 10) {
      capHeight = h;
      break;
    }
  }

  const unitsPerEm =
    fontRecord.kind === 'opentype'
      ? fontRecord.otFont.unitsPerEm || 1000
      : fontRecord.data.resolution || 1000;

  if (!Number.isFinite(capHeight) || capHeight <= 10) {
    const asc =
      fontRecord.kind === 'opentype'
        ? fontRecord.otFont.ascender || unitsPerEm * 0.8
        : fontRecord.data.ascender || unitsPerEm * 0.8;
    capHeight = Math.max(unitsPerEm * 0.5, asc * 0.82);
  }

  const scale = TARGET_CAP_HEIGHT / capHeight;

  let spaceAdvance = unitsPerEm * 0.36;
  if (fontRecord.kind === 'opentype') {
    const spIdx = fontRecord.otFont.charToGlyphIndex(' ');
    if (spIdx > 0) {
      const spGlyph = fontRecord.otFont.glyphs.get(spIdx);
      if (spGlyph && Number.isFinite(spGlyph.advanceWidth) && spGlyph.advanceWidth > 0) {
        spaceAdvance = spGlyph.advanceWidth;
      }
    }
  } else if (fontRecord.data.glyphs && fontRecord.data.glyphs[' ']) {
    const ha = fontRecord.data.glyphs[' '].ha;
    if (Number.isFinite(ha) && ha > 0) spaceAdvance = ha;
  }

  fontRecord.unitsPerEm = unitsPerEm;
  fontRecord.capHeight = capHeight;
  fontRecord.scale = scale;
  fontRecord.spaceAdvance = spaceAdvance;
  return fontRecord;
}

export function createNormalizedOpenTypeFont(id, label, otFont, meta = {}) {
  return measureNormalizedFontMetrics({
    id,
    label,
    kind: 'opentype',
    category: meta.category || 'sans',
    weight: meta.weight || 'bold',
    otFont
  });
}

export function createNormalizedTypefaceFont(id, label, typefaceData, meta = {}) {
  const data = typefaceData && typefaceData.data ? typefaceData.data : typefaceData;
  return measureNormalizedFontMetrics({
    id,
    label,
    kind: 'typeface',
    category: meta.category || 'sans',
    weight: meta.weight || 'bold',
    data
  });
}

export function hasNativeGlyph(fontRecord, ch) {
  if (!fontRecord || !ch) return false;
  if (fontRecord.kind === 'opentype') {
    const idx = fontRecord.otFont.charToGlyphIndex(ch);
    if (!idx || idx <= 0) return false;
    const glyph = fontRecord.otFont.glyphs.get(idx);
    return Boolean(glyph && glyph.path && Array.isArray(glyph.path.commands) && glyph.path.commands.length > 0);
  }
  const g = fontRecord.data && fontRecord.data.glyphs ? fontRecord.data.glyphs[ch] : null;
  return Boolean(g && typeof g.o === 'string' && g.o.trim().length > 0);
}

function getRawGlyphCommands(fontRecord, ch) {
  if (!fontRecord || !ch) return null;
  if (fontRecord.kind === 'opentype') {
    const idx = fontRecord.otFont.charToGlyphIndex(ch);
    if (!idx || idx <= 0) return null;
    const glyph = fontRecord.otFont.glyphs.get(idx);
    if (!glyph || !glyph.path || !Array.isArray(glyph.path.commands) || glyph.path.commands.length === 0) {
      return null;
    }
    return glyph.path.commands;
  }
  const g = fontRecord.data && fontRecord.data.glyphs ? fontRecord.data.glyphs[ch] : null;
  if (!g || typeof g.o !== 'string' || !g.o.trim()) return null;
  return parseTypefaceOutlineCommands(g.o);
}

function getGlyphAdvanceAndHandle(fontRecord, ch) {
  if (fontRecord.kind === 'opentype') {
    const idx = fontRecord.otFont.charToGlyphIndex(ch);
    const glyph = idx > 0 ? fontRecord.otFont.glyphs.get(idx) : null;
    const adv =
      glyph && Number.isFinite(glyph.advanceWidth) && glyph.advanceWidth > 0
        ? glyph.advanceWidth
        : fontRecord.unitsPerEm * 0.55;
    return { advance: adv, otGlyph: glyph };
  }
  const g = fontRecord.data && fontRecord.data.glyphs ? fontRecord.data.glyphs[ch] : null;
  const adv = g && Number.isFinite(g.ha) && g.ha > 0 ? g.ha : fontRecord.unitsPerEm * 0.55;
  return { advance: adv, otGlyph: null };
}

function validateExtrudedGeometry(geo, solids, maxBevel) {
  if (!geo || !geo.attributes || !geo.attributes.position) return false;
  const pos = geo.attributes.position.array;
  if (!pos || pos.length < 9) return false;
  for (let i = 0; i < pos.length; i++) {
    if (!Number.isFinite(pos[i])) return false;
  }
  if (geo.attributes.normal) {
    const norm = geo.attributes.normal.array;
    for (let i = 0; i < norm.length; i++) {
      if (!Number.isFinite(norm[i])) return false;
    }
  }

  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  if (!bb) return false;

  let sMinX = Infinity;
  let sMaxX = -Infinity;
  let sMinY = Infinity;
  let sMaxY = -Infinity;
  for (let i = 0; i < solids.length; i++) {
    const b = polyBounds(solids[i].outer);
    if (b.minX < sMinX) sMinX = b.minX;
    if (b.maxX > sMaxX) sMaxX = b.maxX;
    if (b.minY < sMinY) sMinY = b.minY;
    if (b.maxY > sMaxY) sMaxY = b.maxY;
  }

  const shapeW = Math.max(0.1, sMaxX - sMinX);
  const shapeH = Math.max(0.1, sMaxY - sMinY);
  const pad = Math.max(0.35, maxBevel * 4.5);
  if (
    bb.min.x < sMinX - pad - shapeW * 0.5 ||
    bb.max.x > sMaxX + pad + shapeW * 0.5 ||
    bb.min.y < sMinY - pad - shapeH * 0.5 ||
    bb.max.y > sMaxY + pad + shapeH * 0.5
  ) {
    return false;
  }
  return true;
}

function solidsToThreeShapes(solids) {
  const THREE = getTHREE();
  const threeShapes = [];
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (!s.outer || s.outer.length < 3) continue;
    const shape = new THREE.Shape(s.outer.map((p) => new THREE.Vector2(p.x, p.y)));
    for (let h = 0; h < s.holes.length; h++) {
      const holePts = s.holes[h];
      if (!holePts || holePts.length < 3) continue;
      shape.holes.push(new THREE.Path(holePts.map((p) => new THREE.Vector2(p.x, p.y))));
    }
    threeShapes.push(shape);
  }
  return threeShapes;
}

export class TextBuilder {
  constructor() {
    this.group = new (getTHREE().Group)();
    this.group.name = 'custom-3d-text';
    this.fontCache = new Map();
    this.glyphShapeCache = new Map();
    this.customFonts = [];
    this.deletedBuiltinIds = new Set();
    this.loadingPromises = new Map();
    this.lastBuildReport = {
      fontLabel: '',
      missingChars: [],
      fallbackChars: [],
      fallbackFontLabel: '',
      geometryWarnings: []
    };
    this._buildCounter = 0;
    this._customCounter = 0;
  }

  getGroup() {
    return this.group;
  }

  getLastBuildReport() {
    return this.lastBuildReport;
  }

  getAvailableFonts() {
    const builtins = FONT_OPTIONS.filter((f) => !this.deletedBuiltinIds.has(f.id));
    return [...this.customFonts, ...builtins];
  }

  getCustomFonts() {
    return [...this.customFonts];
  }

  hasDeletedBuiltins() {
    return this.deletedBuiltinIds.size > 0;
  }

  static isSupportedFontFile(file) {
    if (!file) return false;
    return /\.(ttf|otf|woff|typeface\.json)$/i.test(file.name || '');
  }

  async loadCustomFontFile(file) {
    if (!file) {
      throw new Error('No font file provided.');
    }
    const fileName = file.name || 'CustomFont.ttf';
    if (/\.woff2$/i.test(fileName)) {
      throw new Error('WOFF2 (Brotli) is not supported directly. Please upload .TTF, .OTF, .WOFF, or .typeface.json.');
    }

    const cleanBase =
      fileName
        .replace(/\.typeface\.json$/i, '')
        .replace(/\.(ttf|otf|woff|json)$/i, '')
        .trim() || 'Custom Font';

    const customId = `custom_font_${++this._customCounter}_${Date.now()}`;
    let normalized = null;

    if (/\.json$/i.test(fileName)) {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        throw new Error(`Invalid JSON font file: ${err.message}`);
      }
      if (!parsed || typeof parsed !== 'object' || !parsed.glyphs || Object.keys(parsed.glyphs).length === 0) {
        throw new Error('JSON file is not a valid Three.js typeface font (missing "glyphs").');
      }
      normalized = createNormalizedTypefaceFont(customId, cleanBase, parsed, {
        category: /serif/i.test(cleanBase) ? 'serif' : 'sans',
        weight: /regular|light|thin/i.test(cleanBase) ? 'regular' : 'bold'
      });
    } else if (/\.(ttf|otf|woff)$/i.test(fileName)) {
      if (typeof window === 'undefined' || !window.opentype || typeof window.opentype.parse !== 'function') {
        throw new Error('OpenType parser is not loaded. Check internet connection for opentype.js.');
      }
      const buffer = await file.arrayBuffer();
      let otFont;
      try {
        otFont = window.opentype.parse(buffer);
      } catch (err) {
        throw new Error(`Could not parse font binary (${err.message}). Ensure it is a valid .TTF, .OTF, or .WOFF file.`);
      }
      if (!otFont || !otFont.glyphs || otFont.glyphs.length === 0) {
        throw new Error('Uploaded font contains no readable glyphs.');
      }
      const familyName =
        (otFont.names &&
          otFont.names.fontFamily &&
          (otFont.names.fontFamily.en || Object.values(otFont.names.fontFamily)[0])) ||
        cleanBase;
      const weightClass = otFont.tables && otFont.tables.os2 ? otFont.tables.os2.usWeightClass : 700;
      const category = /serif|garamond|times|georgia|cinzel|playfair|merriweather/i.test(`${familyName} ${cleanBase}`)
        ? 'serif'
        : 'sans';
      const weight = weightClass && weightClass < 550 ? 'regular' : 'bold';

      normalized = createNormalizedOpenTypeFont(customId, cleanBase, otFont, { category, weight });
    } else {
      throw new Error('Unsupported font format. Please upload .TTF, .OTF, .WOFF, or .typeface.json.');
    }

    const customEntry = {
      id: customId,
      label: `★ ${cleanBase}`,
      custom: true,
      category: normalized.category,
      weight: normalized.weight
    };

    this.fontCache.set(customId, normalized);
    this.customFonts.unshift(customEntry);
    return customEntry;
  }

  deleteFont(fontId) {
    const available = this.getAvailableFonts();
    if (available.length <= 1) {
      throw new Error('At least one font must remain in the catalog.');
    }

    const customIdx = this.customFonts.findIndex((f) => f.id === fontId);
    let removedLabel = fontId;

    if (customIdx !== -1) {
      removedLabel = this.customFonts[customIdx].label;
      this.customFonts.splice(customIdx, 1);
      this.fontCache.delete(fontId);
      this._evictGlyphCacheForFont(fontId);
    } else {
      const builtin = FONT_OPTIONS.find((f) => f.id === fontId);
      if (!builtin) {
        throw new Error('Font not found in catalog.');
      }
      removedLabel = builtin.label;
      this.deletedBuiltinIds.add(fontId);
    }

    const remaining = this.getAvailableFonts();
    return {
      removedId: fontId,
      removedLabel,
      nextFontId: remaining[0].id
    };
  }

  restoreDefaultFonts() {
    this.deletedBuiltinIds.clear();
    return this.getAvailableFonts();
  }

  _evictGlyphCacheForFont(fontId) {
    const prefix = `${fontId}::`;
    for (const key of this.glyphShapeCache.keys()) {
      if (key.startsWith(prefix)) this.glyphShapeCache.delete(key);
    }
  }

  async _loadFontDescriptor(option) {
    if (this.fontCache.has(option.id)) {
      return this.fontCache.get(option.id);
    }
    if (this.loadingPromises.has(option.id)) {
      return this.loadingPromises.get(option.id);
    }

    const promise = (async () => {
      let lastError = null;
      for (const url of option.urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          if (option.format === 'ttf' || /\.(ttf|otf|woff)(\?.*)?$/i.test(url)) {
            if (typeof window === 'undefined' || !window.opentype || typeof window.opentype.parse !== 'function') {
              throw new Error('opentype.js is required to parse TTF/OTF/WOFF fonts.');
            }
            const buf = await res.arrayBuffer();
            const otFont = window.opentype.parse(buf);
            const normalized = createNormalizedOpenTypeFont(option.id, option.label, otFont, option);
            this.fontCache.set(option.id, normalized);
            return normalized;
          } else {
            const rawJson = await res.json();
            const normalized = createNormalizedTypefaceFont(option.id, option.label, rawJson, option);
            this.fontCache.set(option.id, normalized);
            return normalized;
          }
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError || new Error(`Failed to load font: ${option.label}`);
    })();

    this.loadingPromises.set(option.id, promise);
    try {
      return await promise;
    } finally {
      this.loadingPromises.delete(option.id);
    }
  }

  async loadFont(fontId) {
    if (this.fontCache.has(fontId)) {
      return this.fontCache.get(fontId);
    }
    const option = FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[0];
    return this._loadFontDescriptor(option);
  }

  async _loadFallbackChain(primaryFont) {
    const order =
      primaryFont && primaryFont.category === 'serif'
        ? [FALLBACK_FONT_OPTIONS.serifBold, FALLBACK_FONT_OPTIONS.sansBold, FALLBACK_FONT_OPTIONS.sansRegular]
        : primaryFont && primaryFont.weight === 'regular'
          ? [FALLBACK_FONT_OPTIONS.sansRegular, FALLBACK_FONT_OPTIONS.sansBold, FALLBACK_FONT_OPTIONS.serifBold]
          : [FALLBACK_FONT_OPTIONS.sansBold, FALLBACK_FONT_OPTIONS.sansRegular, FALLBACK_FONT_OPTIONS.serifBold];

    const loaded = [];
    for (let i = 0; i < order.length; i++) {
      try {
        const fb = await this._loadFontDescriptor(order[i]);
        if (fb) loaded.push(fb);
      } catch (_) {

      }
    }
    return loaded;
  }

  _getResolvedGlyph(fontRecord, ch) {
    const cacheKey = `${fontRecord.id}::${ch}`;
    if (this.glyphShapeCache.has(cacheKey)) {
      return this.glyphShapeCache.get(cacheKey);
    }

    const cmds = getRawGlyphCommands(fontRecord, ch);
    if (!cmds || cmds.length === 0) {
      this.glyphShapeCache.set(cacheKey, null);
      return null;
    }

    const rawPolys = commandsToPolygons(cmds, fontRecord.scale);
    if (rawPolys.length === 0) {
      this.glyphShapeCache.set(cacheKey, null);
      return null;
    }

    const resolvedPolys = hasContourIntersections(rawPolys) ? planarNonZeroUnion(rawPolys) : rawPolys;
    const solids = buildContainmentShapes(resolvedPolys);
    if (solids.length === 0) {
      this.glyphShapeCache.set(cacheKey, null);
      return null;
    }

    const { advance, otGlyph } = getGlyphAdvanceAndHandle(fontRecord, ch);
    const record = {
      solids,
      advanceWorld: advance * fontRecord.scale,
      otGlyph,
      fontRecord
    };
    this.glyphShapeCache.set(cacheKey, record);
    return record;
  }

  async build(textConfig, material, onNotify = null) {
    const THREE = getTHREE();
    const requestId = ++this._buildCounter;

    const rawInput = (textConfig.value || 'ERATIS').trim() || 'ERATIS';

    const normalizedText = rawInput.normalize('NFC');
    const fontId = textConfig.font || 'helvetiker_bold';
    const letterSpacing = Number.isFinite(textConfig.letterSpacing) ? textConfig.letterSpacing : 0.14;
    const italicSlant = Number.isFinite(textConfig.italicSlant) ? textConfig.italicSlant : 0.24;
    const depth = Math.max(0.05, Number(textConfig.depth) || 0.56);
    const bevelSize = Math.max(0, Number(textConfig.bevelSize) || 0.08);
    const bevelThickness = Math.max(0, Number(textConfig.bevelThickness) || 0.12);

    let primaryFont = null;
    try {
      primaryFont = await this.loadFont(fontId);
    } catch (err) {
      if (typeof onNotify === 'function') {
        onNotify(`Font "${fontId}" could not be loaded (${err.message}). Falling back to Helvetiker Bold.`, 'warning');
      }
      try {
        primaryFont = await this.loadFont('helvetiker_bold');
      } catch (_) {
        return false;
      }
    }

    if (requestId !== this._buildCounter) return false;

    const lines = normalizedText.split('\n').slice(0, 3);

    let needsFallback = false;
    for (let li = 0; li < lines.length && !needsFallback; li++) {
      const chars = Array.from(lines[li]);
      for (let ci = 0; ci < chars.length; ci++) {
        const ch = chars[ci];
        if (/\s/.test(ch)) continue;
        if (!hasNativeGlyph(primaryFont, ch)) {
          needsFallback = true;
          break;
        }
      }
    }

    const fallbackFonts = needsFallback ? await this._loadFallbackChain(primaryFont) : [];
    if (requestId !== this._buildCounter) return false;

    this._clearChildren(material);

    const lineHeight = TARGET_CAP_HEIGHT * 1.42;
    const spaceAdvanceWorld = primaryFont.spaceAdvance * primaryFont.scale;
    const container = new THREE.Group();
    const shearMatrix = new THREE.Matrix4().set(
      1, italicSlant, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );

    const missingSet = new Set();
    const fallbackSet = new Set();
    const fallbackLabels = new Set();
    const geometryWarnings = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineGroup = new THREE.Group();
      const chars = Array.from(lines[lineIndex]);
      let cursorX = 0;
      let prevResolved = null;

      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (/\s/.test(ch)) {
          cursorX += spaceAdvanceWorld + letterSpacing;
          prevResolved = null;
          continue;
        }

        let chosenFont = hasNativeGlyph(primaryFont, ch) ? primaryFont : null;

        if (!chosenFont) {
          for (let fi = 0; fi < fallbackFonts.length; fi++) {
            if (hasNativeGlyph(fallbackFonts[fi], ch)) {
              chosenFont = fallbackFonts[fi];
              fallbackSet.add(ch);
              fallbackLabels.add(chosenFont.label.replace(/\s*\(Unicode Fallback\)$/i, ''));
              break;
            }
          }
        }

        if (!chosenFont) {
          missingSet.add(ch);
          prevResolved = null;
          continue;
        }

        const resolved = this._getResolvedGlyph(chosenFont, ch);
        if (!resolved || !resolved.solids || resolved.solids.length === 0) {
          missingSet.add(ch);
          prevResolved = null;
          continue;
        }

        if (
          prevResolved &&
          prevResolved.fontRecord === chosenFont &&
          chosenFont.kind === 'opentype' &&
          prevResolved.otGlyph &&
          resolved.otGlyph
        ) {
          const kernUnits = getOpenTypeKerning(chosenFont.otFont, prevResolved.otGlyph, resolved.otGlyph);
          if (kernUnits !== 0) {
            cursorX += kernUnits * chosenFont.scale;
          }
        }

        const safeBevelSize = computeSafeBevelSize(resolved.solids, bevelSize);
        const bevelRatio = bevelSize > 0.002 ? safeBevelSize / bevelSize : 0;
        const safeBevelThickness = bevelThickness * Math.max(0.35, bevelRatio);
        const useBevel = safeBevelSize > 0.002 && safeBevelThickness > 0.002;

        const threeShapes = solidsToThreeShapes(resolved.solids);
        if (threeShapes.length === 0) {
          missingSet.add(ch);
          prevResolved = null;
          continue;
        }

        let geo = null;
        if (useBevel) {
          try {
            const candidate = new THREE.ExtrudeGeometry(threeShapes, {
              depth,
              curveSegments: 1,
              bevelEnabled: true,
              bevelThickness: safeBevelThickness,
              bevelSize: safeBevelSize,
              bevelOffset: 0,
              bevelSegments: 4
            });
            if (validateExtrudedGeometry(candidate, resolved.solids, safeBevelSize)) {
              geo = candidate;
            } else {
              candidate.dispose();
              geometryWarnings.push(`"${ch}" bevel clamped off to preserve clean contour.`);
            }
          } catch (_) {
            geometryWarnings.push(`"${ch}" bevel fallback applied.`);
          }
        }

        if (!geo) {
          try {
            const flatGeo = new THREE.ExtrudeGeometry(threeShapes, {
              depth,
              curveSegments: 1,
              bevelEnabled: false
            });
            if (validateExtrudedGeometry(flatGeo, resolved.solids, 0)) {
              geo = flatGeo;
            } else {
              flatGeo.dispose();
              geometryWarnings.push(`Skipped invalid geometry for "${ch}".`);
              prevResolved = null;
              continue;
            }
          } catch (_) {
            geometryWarnings.push(`Failed to triangulate "${ch}".`);
            prevResolved = null;
            continue;
          }
        }

        geo.translate(0, 0, -depth * 0.5);

        if (Math.abs(italicSlant) > 0.001) {
          geo.applyMatrix4(shearMatrix);
          geo.computeVertexNormals();
        }

        const mesh = new THREE.Mesh(geo, material);
        mesh.position.x = cursorX;
        mesh.userData.isStudioMaterialTarget = true;
        lineGroup.add(mesh);

        cursorX += resolved.advanceWorld + letterSpacing;
        prevResolved = resolved;
      }

      const lineBox = new THREE.Box3().setFromObject(lineGroup);
      if (!lineBox.isEmpty()) {
        const lineCenterX = (lineBox.min.x + lineBox.max.x) * 0.5;
        lineGroup.position.x = -lineCenterX;
      }
      lineGroup.position.y = -lineIndex * lineHeight;
      container.add(lineGroup);
    }

    const totalBox = new THREE.Box3().setFromObject(container);
    if (!totalBox.isEmpty()) {
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      totalBox.getCenter(center);
      totalBox.getSize(size);
      container.position.set(-center.x, -center.y, -center.z);

      const maxAllowedWidth = 10.8;
      const maxAllowedHeight = 4.2;
      let fitScale = 1.0;
      if (size.x > maxAllowedWidth) {
        fitScale = Math.min(fitScale, maxAllowedWidth / size.x);
      }
      if (size.y > maxAllowedHeight) {
        fitScale = Math.min(fitScale, maxAllowedHeight / size.y);
      }
      this.group.scale.setScalar(fitScale);
    } else {
      this.group.scale.setScalar(1.0);
    }

    this.group.add(container);

    const missingChars = Array.from(missingSet);
    const fallbackChars = Array.from(fallbackSet);
    const fallbackFontLabel = Array.from(fallbackLabels).join(', ');

    this.lastBuildReport = {
      fontLabel: primaryFont.label,
      missingChars,
      fallbackChars,
      fallbackFontLabel,
      geometryWarnings
    };

    if (missingChars.length > 0 && typeof onNotify === 'function') {
      onNotify(
        `No 3D glyph found in "${primaryFont.label}" or Unicode fallback fonts for: ${missingChars.join(' ')}`,
        'warning'
      );
    }

    return true;
  }

  applyMaterial(material) {
    this.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = material;
      }
    });
  }

  _clearChildren(sharedMaterial = null) {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      disposeObject3D(child, {
        skipMaterials: sharedMaterial ? new Set([sharedMaterial]) : null,
        disposeTextures: false
      });
      this.group.remove(child);
    }
  }

  dispose(sharedMaterials = null) {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      disposeObject3D(child, {
        skipMaterials: sharedMaterials,
        disposeTextures: false
      });
      this.group.remove(child);
    }
    this.fontCache.clear();
    this.glyphShapeCache.clear();
    this.customFonts = [];
    this.deletedBuiltinIds.clear();
    this.loadingPromises.clear();
  }
}
