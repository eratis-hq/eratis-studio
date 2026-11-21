import test from 'node:test';
import assert from 'node:assert/strict';

import {
  APP_INFO,
  AUDIO_BANDS,
  BUILTIN_PRESETS,
  DEFAULT_STATE,
  IDENTITY_MODES,
  MATERIAL_IDS
} from '../src/core/config.js';
import { Store, deepClone } from '../src/core/state.js';
import {
  computeBandBinRange,
  computeNormalizedBandEnergy,
  decayEnergyValue,
  formatTime
} from '../src/audio/audioEngine.js';
import {
  PresetManager,
  stripLocalMediaForExport,
  validatePresetPayload
} from '../src/presets/presetManager.js';
import { sanitizeSvgMarkup } from '../src/ui/signatureIntro.js';
import {
  buildContainmentShapes,
  commandsToPolygons,
  computeSafeBevelSize,
  convertOpenTypeToThreeFont,
  createNormalizedTypefaceFont,
  hasContourIntersections,
  hasNativeGlyph,
  parseTypefaceOutlineCommands,
  planarNonZeroUnion
} from '../src/scene/textBuilder.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

test('Core Config & Default ERATIS Identity Aesthetics', () => {
  assert.equal(APP_INFO.githubUrl, 'https://github.com/eratis-hq');
  assert.equal(DEFAULT_STATE.environment.backgroundColor, '#000000');
  assert.equal(DEFAULT_STATE.camera.distance, 25.5);
  assert.equal(DEFAULT_STATE.identity.mode, 'eratis');
  assert.equal(DEFAULT_STATE.identity.material, 'liquidChrome');
  assert.equal(DEFAULT_STATE.identity.showOrbits, true);
  assert.deepEqual(IDENTITY_MODES, ['eratis', 'text', 'image']);
  assert.deepEqual(MATERIAL_IDS, [
    'liquidChrome',
    'silver',
    'gold24k',
    'matteMetal',
    'frostedGlass',
    'obsidian'
  ]);
  assert.ok(BUILTIN_PRESETS.length >= 5);
});

test('Reactive State Store updates sections and resets back to ERATIS emblem in 1 call', () => {
  const store = new Store(DEFAULT_STATE);
  const events = [];
  const unsubscribe = store.subscribe((state, section) => {
    events.push({ mode: state.identity.mode, section });
  });

  store.updateSection('identity', {
    mode: 'text',
    scale: 1.45,
    positionX: 2.5,
    text: { value: 'CHROME' }
  });

  assert.equal(store.getState().identity.mode, 'text');
  assert.equal(store.getState().identity.scale, 1.45);
  assert.equal(store.getState().identity.text.value, 'CHROME');

  store.resetIdentityToEratis();
  assert.equal(store.getState().identity.mode, 'eratis');
  assert.equal(store.getState().identity.scale, 1.0);
  assert.equal(store.getState().identity.positionX, 0);
  assert.equal(events.length, 2);

  unsubscribe();
});

test('Web Audio API FFT (fftSize=2048) frequency bin ranges and energy decay math', () => {
  assert.equal(AUDIO_BANDS.FFT_SIZE, 2048);

  const sampleRate = 48000;
  const fftSize = 2048;

  const bass = computeBandBinRange(AUDIO_BANDS.BASS.minHz, AUDIO_BANDS.BASS.maxHz, sampleRate, fftSize);
  const mid = computeBandBinRange(AUDIO_BANDS.MID.minHz, AUDIO_BANDS.MID.maxHz, sampleRate, fftSize);
  const treble = computeBandBinRange(AUDIO_BANDS.TREBLE.minHz, AUDIO_BANDS.TREBLE.maxHz, sampleRate, fftSize);

  assert.ok(bass.startBin >= 0 && bass.endBin > bass.startBin);
  assert.ok(mid.startBin >= bass.endBin && mid.endBin > mid.startBin);
  assert.ok(treble.startBin >= mid.endBin && treble.endBin > treble.startBin);

  const buffer = new Uint8Array(1024);
  for (let i = bass.startBin; i <= bass.endBin; i++) {
    buffer[i] = 255;
  }

  const bassEnergy = computeNormalizedBandEnergy(buffer, bass.startBin, bass.endBin);
  const trebleEnergy = computeNormalizedBandEnergy(buffer, treble.startBin, treble.endBin);
  assert.equal(bassEnergy, 1.0);
  assert.equal(trebleEnergy, 0.0);

  let level = 0.9;
  for (let frame = 0; frame < 120; frame++) {
    level = decayEnergyValue(level, 1 / 60, 5.5);
  }
  assert.equal(level, 0);
  assert.equal(formatTime(125), '2:05');
});

test('Preset Manager schema validation, privacy stripping, and localStorage persistence', () => {
  const storage = new MemoryStorage();
  const store = new Store(DEFAULT_STATE);
  const manager = new PresetManager(store, storage);

  store.updateSection('identity', {
    mode: 'image',
    material: 'gold24k',
    image: { fileName: 'secret-local-photo.png', opacity: 0.85, scale: 1.2 }
  });

  const stripped = stripLocalMediaForExport(store.getSnapshot());
  assert.equal(stripped.localMediaExcluded, true);
  assert.equal(stripped.state.identity.image.fileName, '');
  assert.ok(stripped.excludedTypes.includes('local-image-file'));

  const saved = manager.saveCustomPreset('Golden Studio');
  assert.equal(saved.updated, false);
  assert.equal(saved.preset.name, 'Golden Studio');

  const managerReloaded = new PresetManager(store, storage);
  const allPresets = managerReloaded.listPresets();
  assert.ok(allPresets.some((p) => p.name === 'Golden Studio' && !p.builtin));

  const exported = managerReloaded.exportSceneJSON('Exported Golden');
  const imported = managerReloaded.importSceneJSON(exported.json);
  assert.equal(imported.ok, true);
  assert.equal(imported.state.identity.material, 'gold24k');

  const badResult = validatePresetPayload({
    app: 'eratis-studio',
    state: {
      identity: { mode: 'invalid-3d-mode', material: 'unobtainium' },
      environment: { backgroundColor: 'not-a-hex' }
    }
  });
  assert.equal(badResult.valid, false);
  assert.ok(badResult.errors.length >= 3);
});

test('SVG Signature sanitizer strips scripts and unsafe handlers while preserving SVG paths', () => {
  const maliciousSvg = `
    <?xml version="1.0"?>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" onload="alert(1)">
      <script>window.hacked = true;</script>
      <path d="M 10 10 L 180 80" stroke="#fff" onclick="evil()" />
    </svg>
  `;
  const clean = sanitizeSvgMarkup(maliciousSvg);
  assert.ok(clean.startsWith('<svg'));
  assert.ok(clean.includes('<path'));
  assert.ok(!clean.includes('<script'));
  assert.ok(!clean.includes('onload='));
  assert.ok(!clean.includes('onclick='));
});

test('3D Typography Engine: curve order, planar non-zero union, safe bevels & strict Unicode glyph checks', () => {

  const parsedCmds = parseTypefaceOutlineCommands('m 0 0 q 100 0 50 80 b 200 0 120 80 180 80 l 0 0');
  assert.equal(parsedCmds[1].type, 'Q');
  assert.equal(parsedCmds[1].x, 100);
  assert.equal(parsedCmds[1].y, 0);
  assert.equal(parsedCmds[1].x1, 50);
  assert.equal(parsedCmds[1].y1, 80);
  assert.equal(parsedCmds[2].type, 'C');
  assert.equal(parsedCmds[2].x, 200);
  assert.equal(parsedCmds[2].x1, 120);
  assert.equal(parsedCmds[2].x2, 180);

  const mockOtFont = {
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    names: { fontFamily: { en: 'MockFont' } },
    tables: {},
    glyphs: {
      glyphs: {
        0: {
          unicode: 65,
          advanceWidth: 600,
          xMin: 0,
          xMax: 600,
          path: {
            commands: [
              { type: 'M', x: 0, y: 0 },
              { type: 'Q', x1: 300, y1: 700, x: 600, y: 0 },
              { type: 'Z' }
            ]
          }
        }
      }
    }
  };
  const converted = convertOpenTypeToThreeFont(mockOtFont);
  assert.ok(converted.data.glyphs.A.o.includes('q 600 0 300 700'), 'q must serialize endX endY cpX cpY');
  assert.ok(converted.data.glyphs.A.o.includes('l 0 0'), 'Z must close open contours back to subpath start');

  const leftLeg = [
    { x: 0.0, y: 0.0 }, { x: 0.25, y: 0.0 }, { x: 0.65, y: 1.4 }, { x: 0.4, y: 1.4 }
  ];
  const rightLeg = [
    { x: 0.8, y: 0.0 }, { x: 1.05, y: 0.0 }, { x: 0.65, y: 1.4 }, { x: 0.4, y: 1.4 }
  ];
  const crossBar = [
    { x: 0.15, y: 0.35 }, { x: 0.9, y: 0.35 }, { x: 0.9, y: 0.55 }, { x: 0.15, y: 0.55 }
  ];
  const overlappingA = [leftLeg, rightLeg, crossBar];
  assert.equal(hasContourIntersections(overlappingA), true);
  const unifiedLoops = planarNonZeroUnion(overlappingA);
  const solids = buildContainmentShapes(unifiedLoops);
  assert.equal(solids.length, 1, 'Overlapping A strokes must unify into 1 outer solid');
  assert.equal(solids[0].holes.length, 1, 'Unified A must preserve its inner triangular hole');

  const thinStroke = [
    {
      outer: [
        { x: 0, y: 0 }, { x: 0.06, y: 0 }, { x: 0.06, y: 1.5 }, { x: 0, y: 1.5 }
      ],
      holes: []
    }
  ];
  const safeBevel = computeSafeBevelSize(thinStroke, 0.12);
  assert.ok(safeBevel < 0.025, `Thin stroke bevel must clamp below 0.025 (got ${safeBevel})`);

  const asciiOnlyFont = createNormalizedTypefaceFont('ascii_test', 'ASCII Test', {
    resolution: 1000,
    ascender: 800,
    glyphs: {
      H: { ha: 700, o: 'm 0 0 l 0 700 l 200 700 l 200 0 l 0 0 ' }
    }
  });
  assert.equal(hasNativeGlyph(asciiOnlyFont, 'H'), true);
  assert.equal(hasNativeGlyph(asciiOnlyFont, 'С'), false);
  assert.equal(hasNativeGlyph(asciiOnlyFont, 'Ğ'), false);
  assert.equal(hasNativeGlyph(asciiOnlyFont, 'ή'), false);
});
