import test from "node:test";
import assert from "node:assert/strict";

import {
  generatePalette,
  hexToHsl,
  hslToHex,
  hslToRgb,
  normalizeHue,
} from "../color-utils.js";

test("normalizeHue wraps positive and negative angles", () => {
  assert.equal(normalizeHue(390), 30);
  assert.equal(normalizeHue(-30), 330);
});

test("hslToRgb converts primary hues", () => {
  assert.deepEqual(hslToRgb(0, 100, 50), [255, 0, 0]);
  assert.deepEqual(hslToRgb(120, 100, 50), [0, 255, 0]);
  assert.deepEqual(hslToRgb(240, 100, 50), [0, 0, 255]);
});

test("HEX and HSL conversions handle common colors", () => {
  assert.equal(hslToHex(0, 100, 50), "#FF0000");
  assert.deepEqual(hexToHsl("#00FF00"), { h: 120, s: 100, l: 50 });
  assert.throws(() => hexToHsl("#xyz"), TypeError);
});

test("generatePalette applies a fixed hue offset and wraps the color wheel", () => {
  const palette = generatePalette({
    hue: 330,
    saturation: 80,
    lightness: 50,
    count: 4,
    offset: 30,
  });

  assert.deepEqual(
    palette.map(({ hue }) => hue),
    [330, 0, 30, 60],
  );
  assert.deepEqual(
    palette.map(({ shift }) => shift),
    [0, 30, 60, 90],
  );
});

test("generatePalette constrains unsupported counts and offsets", () => {
  assert.equal(
    generatePalette({ hue: 0, saturation: 100, lightness: 50, count: 99, offset: 0 }).length,
    12,
  );
  assert.equal(
    generatePalette({ hue: 0, saturation: 100, lightness: 50, count: 1, offset: 999 }).length,
    2,
  );
});
