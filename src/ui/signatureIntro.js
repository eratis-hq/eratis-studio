import { APP_INFO } from '../core/config.js';

const FALLBACK_ERATIS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="145 40 755 275" fill="none">
  <defs>
    <linearGradient id="eratis-chrome-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="45%" stop-color="#E2E6EE" />
      <stop offset="55%" stop-color="#9CA2AE" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>
    <filter id="eratis-nib-glow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="4.2" result="blur1" />
      <feGaussianBlur stdDeviation="10" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <path id="sig-stroke-1" data-signature-stroke="sig-stroke-1" data-duration="820" data-pause="45" d="M 422 104 Q 455 92 469.5 85.5 Q 484 79 491.5 74.0 Q 499 69 495.5 65.0 Q 492 61 478.5 61.0 Q 465 61 440.0 65.5 Q 415 70 382.5 81.5 Q 350 93 317.5 109.0 Q 285 125 260.5 139.5 Q 236 154 232.0 159.5 Q 228 165 235.0 167.5 Q 242 170 266.0 167.0 Q 290 164 322.5 157.0 Q 355 150 384.5 145.5 Q 414 141 392.0 150.5 Q 370 160 337.5 176.0 Q 305 192 270.0 212.5 Q 235 233 207.5 250.5 Q 180 268 171.5 277.0 Q 163 286 168.5 290.0 Q 174 294 194.5 291.0 Q 215 288 245.0 277.5 Q 275 267 310.0 251.5 Q 345 236 375.0 221.5 L 435 191" stroke="url(#eratis-chrome-stroke)" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path id="sig-stroke-2" data-signature-stroke="sig-stroke-2" data-duration="230" data-pause="25" d="M 460 166 Q 436 196 424.0 212.0 Q 412 228 423.5 213.0 Q 435 198 443.5 189.5 Q 452 181 463.5 178.0 L 498 174" stroke="url(#eratis-chrome-stroke)" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path id="sig-stroke-3" data-signature-stroke="sig-stroke-3" data-duration="260" data-pause="25" d="M 544 164 Q 518 169 505.0 177.5 Q 492 186 489.0 191.5 Q 486 197 494.0 196.5 Q 502 196 524.5 181.0 Q 547 166 540.5 178.0 Q 534 190 544.0 186.0 L 585 153" stroke="url(#eratis-chrome-stroke)" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path id="sig-stroke-4" data-signature-stroke="sig-stroke-4" data-duration="260" data-pause="25" d="M 657 65 Q 628 98 613.0 117.0 Q 598 136 587.5 152.0 Q 577 168 576.0 175.5 Q 575 183 583.5 181.0 L 625 155" stroke="url(#eratis-chrome-stroke)" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path id="sig-stroke-5" data-signature-stroke="sig-stroke-5" data-duration="150" data-pause="20" d="M 642 147 Q 625 165 621.0 170.5 Q 617 176 624.5 176.0 L 664 156" stroke="url(#eratis-chrome-stroke)" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path id="sig-stroke-6" data-signature-stroke="sig-stroke-6" data-duration="90" data-pause="25" d="M 644 133 L 662 124" stroke="#FFFFFF" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path id="sig-stroke-7" data-signature-stroke="sig-stroke-7" data-duration="220" data-pause="35" d="M 701 136 Q 682 141 675.5 145.0 Q 669 149 673.5 153.0 Q 678 157 687.0 161.5 Q 696 166 694.0 171.0 L 650 184" stroke="url(#eratis-chrome-stroke)" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path id="sig-stroke-8" data-signature-stroke="sig-stroke-8" data-duration="170" data-pause="40" d="M 544 132 Q 598 120 624.0 114.5 L 698 99" stroke="url(#eratis-chrome-stroke)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path id="sig-stroke-9" data-signature-stroke="sig-stroke-9" data-duration="460" data-pause="50" d="M 318 281 Q 380 256 417.5 245.0 Q 455 234 497.5 224.0 Q 540 214 587.5 203.5 Q 635 193 685.0 183.5 Q 735 174 775.0 168.5 L 878 157" stroke="url(#eratis-chrome-stroke)" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path id="sig-stroke-10" data-signature-stroke="sig-stroke-10" data-duration="210" data-pause="0" data-flare-trigger="0.45" d="M 838 126 Q 818 154 806.5 170.0 L 768 227" stroke="url(#eratis-chrome-stroke)" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <g id="sig-star-flare" class="sig-star-flare" style="opacity: 0; transform-origin: 808px 167px;">
    <circle cx="808" cy="167" r="3.4" fill="#FFFFFF" filter="url(#eratis-nib-glow)" />
  </g>
  <g id="sig-pen-tip" style="opacity: 0; pointer-events: none;" filter="url(#eratis-nib-glow)">
    <circle cx="0" cy="0" r="8" fill="rgba(255, 255, 255, 0.4)" />
    <circle cx="0" cy="0" r="3.2" fill="#FFFFFF" />
  </g>
</svg>`;

export function sanitizeSvgMarkup(rawSvg) {
  if (typeof rawSvg !== 'string' || !rawSvg.trim()) {
    throw new Error('SVG content is empty.');
  }
  const cleaned = rawSvg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');

  const svgMatch = cleaned.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) {
    throw new Error('File does not contain a valid <svg> root element.');
  }
  return svgMatch[0];
}

function easeCalligraphicStroke(t) {
  const u = Math.max(0, Math.min(1, t));
  return u < 0.5 ? 2.2 * u * u : 1 - Math.pow(-2 * u + 2, 2.15) / 2;
}

export class SignatureIntro {
  constructor({ onReveal, onNotify }) {
    this.onReveal = onReveal || (() => {});
    this.onNotify = onNotify || (() => {});

    this.overlay = null;
    this.svgHost = null;
    this.sweepEl = null;

    this.defaultSvgMarkup = null;
    this.customSvgMarkup = null;
    this.customSvgName = '';

    this.isActive = false;
    this._rafId = null;
    this._timers = [];
    this._buildOverlay();
  }

  _buildOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'signature-intro';
    overlay.className = 'signature-intro hidden';
    overlay.innerHTML = `
      <div class="signature-stage">
        <div class="signature-svg-host" id="signature-svg-host"></div>
        <div class="signature-caption">
          <span class="signature-caption-line"></span>
          <span>ERATIS — INTERACTIVE 3D IDENTITY STUDIO</span>
          <span class="signature-caption-line"></span>
        </div>
      </div>
      <div class="signature-light-sweep" id="signature-light-sweep"></div>
      <button type="button" class="skip-intro-btn" id="btn-skip-intro" title="Skip Intro (Esc)">
        <svg class="skip-intro-icon" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path class="skip-chev-1" d="M 3.8 4.8 L 8.2 9 L 3.8 13.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <path class="skip-chev-2" d="M 8.8 4.8 L 13.2 9 L 8.8 13.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="14.6" y1="5.0" x2="14.6" y2="13.0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <span class="skip-intro-label">SKIP INTRO</span>
        <kbd class="skip-intro-kbd">ESC</kbd>
      </button>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.svgHost = overlay.querySelector('#signature-svg-host');
    this.sweepEl = overlay.querySelector('#signature-light-sweep');

    const skipBtn = overlay.querySelector('#btn-skip-intro');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.skip());
    }
  }

  async _getActiveSvgMarkup() {
    if (this.customSvgMarkup) {
      return this.customSvgMarkup;
    }
    if (this.defaultSvgMarkup) {
      return this.defaultSvgMarkup;
    }
    if (typeof window !== 'undefined' && window.__ERATIS_DEFAULT_SIGNATURE_SVG__) {
      this.defaultSvgMarkup = window.__ERATIS_DEFAULT_SIGNATURE_SVG__;
      return this.defaultSvgMarkup;
    }

    try {
      const response = await fetch(APP_INFO.signatureAssetPath, { cache: 'no-cache' });
      if (response.ok) {
        const text = await response.text();
        this.defaultSvgMarkup = sanitizeSvgMarkup(text);
        return this.defaultSvgMarkup;
      }
    } catch (_) {

    }

    this.defaultSvgMarkup = FALLBACK_ERATIS_SVG;
    return this.defaultSvgMarkup;
  }

  _clearTimers() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    for (const id of this._timers) {
      clearTimeout(id);
    }
    this._timers = [];
  }

  _schedule(fn, ms) {
    const id = setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  }

  async play() {
    this._clearTimers();
    this.isActive = true;

    const markup = await this._getActiveSvgMarkup();
    this.svgHost.innerHTML = markup;
    this.svgHost.classList.remove('gleaming');

    const svgEl = this.svgHost.querySelector('svg');
    if (!svgEl) {
      this.skip();
      return;
    }

    svgEl.classList.add('signature-svg');
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');

    const dedicatedStrokes = Array.from(svgEl.querySelectorAll('[data-signature-stroke]'));
    const isCustomFallback = dedicatedStrokes.length === 0;
    const drawables = isCustomFallback
      ? Array.from(svgEl.querySelectorAll('path, line, polyline, polygon, circle, ellipse, rect'))
      : dedicatedStrokes;

    if (drawables.length === 0) {
      this.skip();
      return;
    }

    const penTip = svgEl.querySelector('#sig-pen-tip');
    const starFlare = svgEl.querySelector('#sig-star-flare');
    if (starFlare) {
      starFlare.classList.remove('ignited');
      starFlare.style.opacity = '0';
    }

    this.overlay.classList.remove('hidden', 'fading-out');
    this.sweepEl.classList.remove('sweeping');

    const scheduleSegments = [];
    let timelineCursor = 110;

    for (const el of drawables) {
      let length = 0;
      try {
        if (typeof el.getTotalLength === 'function') {
          length = el.getTotalLength();
        }
      } catch (_) {
        length = 320;
      }
      if (!Number.isFinite(length) || length <= 0) {
        length = 240;
      }

      if (isCustomFallback) {
        const computedStroke = el.getAttribute('stroke');
        if (!computedStroke || computedStroke === 'none') {
          el.setAttribute('stroke', '#FFFFFF');
        }
        if (!el.getAttribute('stroke-width')) {
          el.setAttribute('stroke-width', '2.8');
        }
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke-linecap', 'round');
        el.setAttribute('stroke-linejoin', 'round');
      }

      el.style.strokeDasharray = `${length} ${length}`;
      el.style.strokeDashoffset = `${length}`;
      el.style.transition = 'none';

      const attrDuration = Number(el.getAttribute('data-duration'));
      const attrPause = Number(el.getAttribute('data-pause'));
      const flareTrigger = el.hasAttribute('data-flare-trigger')
        ? Number(el.getAttribute('data-flare-trigger'))
        : null;

      const duration = Number.isFinite(attrDuration) && attrDuration > 0
        ? attrDuration
        : Math.max(140, Math.min(780, Math.round(length * 0.72)));
      const pauseAfter = Number.isFinite(attrPause) && attrPause >= 0 ? attrPause : 35;

      scheduleSegments.push({
        el,
        length,
        startAt: timelineCursor,
        endAt: timelineCursor + duration,
        duration,
        flareTrigger,
        flareFired: false
      });

      timelineCursor += duration + pauseAfter;
    }

    const totalWriteDuration = timelineCursor;
    const startedAt = performance.now();

    const stepFrame = (now) => {
      if (!this.isActive) return;
      const elapsed = now - startedAt;

      let activeSeg = null;

      for (const seg of scheduleSegments) {
        if (elapsed <= seg.startAt) {
          seg.el.style.strokeDashoffset = `${seg.length}`;
        } else if (elapsed >= seg.endAt) {
          seg.el.style.strokeDashoffset = '0';
          if (seg.flareTrigger !== null && !seg.flareFired) {
            seg.flareFired = true;
            this._igniteStarFlare(starFlare);
          }
        } else {
          activeSeg = seg;
          const rawProgress = (elapsed - seg.startAt) / seg.duration;
          const eased = easeCalligraphicStroke(rawProgress);
          seg.el.style.strokeDashoffset = `${seg.length * (1 - eased)}`;

          if (seg.flareTrigger !== null && !seg.flareFired && eased >= seg.flareTrigger) {
            seg.flareFired = true;
            this._igniteStarFlare(starFlare);
          }

          if (penTip && typeof seg.el.getPointAtLength === 'function') {
            try {
              const pt = seg.el.getPointAtLength(seg.length * eased);
              penTip.setAttribute('transform', `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`);
              penTip.style.opacity = '1';
            } catch (_) {}
          }
        }
      }

      if (!activeSeg && penTip) {
        penTip.style.opacity = '0';
      }

      if (elapsed < totalWriteDuration) {
        this._rafId = requestAnimationFrame(stepFrame);
      } else {
        this._rafId = null;
        if (penTip) penTip.style.opacity = '0';
        this.svgHost.classList.add('gleaming');

        this._schedule(() => {
          if (!this.isActive) return;
          this.sweepEl.classList.add('sweeping');
          this.onReveal(false);
        }, 520);

        this._schedule(() => {
          if (!this.isActive) return;
          this.overlay.classList.add('fading-out');
        }, 860);

        this._schedule(() => {
          this._finish();
        }, 1560);
      }
    };

    this._rafId = requestAnimationFrame(stepFrame);
  }

  _igniteStarFlare(starFlare) {
    if (!starFlare) return;
    starFlare.style.opacity = '1';
    starFlare.classList.add('ignited');
  }

  skip() {
    if (!this.isActive) return;
    this._clearTimers();
    this.onReveal(true);
    this._finish();
  }

  _finish() {
    this._clearTimers();
    this.isActive = false;
    if (this.overlay) {
      this.overlay.classList.add('hidden');
      this.overlay.classList.remove('fading-out');
    }
    if (this.sweepEl) {
      this.sweepEl.classList.remove('sweeping');
    }
  }

  async loadCustomSvgFile(file) {
    if (!file) return false;
    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '');
    if (!isSvg) {
      throw new Error('Please choose a valid .svg signature file.');
    }

    const rawText = await file.text();
    const cleanMarkup = sanitizeSvgMarkup(rawText);
    this.customSvgMarkup = cleanMarkup;
    this.customSvgName = file.name || 'Custom Signature.svg';
    this.onNotify(`Custom signature loaded: ${this.customSvgName}`, 'success');
    await this.play();
    return true;
  }

  resetDefaultSignature() {
    this.customSvgMarkup = null;
    this.customSvgName = '';
    this.onNotify('Restored default ERATIS calligraphic signature.', 'info');
  }

  getCustomSvgName() {
    return this.customSvgName;
  }

  dispose() {
    this._clearTimers();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
  }
}
