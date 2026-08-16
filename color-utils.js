export function normalizeHue(hue) {
  return ((hue % 360) + 360) % 360;
}

export function hslToRgb(hue, saturation, lightness) {
  const h = normalizeHue(hue);
  const s = Math.min(100, Math.max(0, saturation)) / 100;
  const l = Math.min(100, Math.max(0, lightness)) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = h / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment < 1) [red, green] = [chroma, secondary];
  else if (segment < 2) [red, green] = [secondary, chroma];
  else if (segment < 3) [green, blue] = [chroma, secondary];
  else if (segment < 4) [green, blue] = [secondary, chroma];
  else if (segment < 5) [red, blue] = [secondary, chroma];
  else [red, blue] = [chroma, secondary];

  const match = l - chroma / 2;
  return [red, green, blue].map((channel) => Math.round((channel + match) * 255));
}

export function rgbToHsl(red, green, blue) {
  const [r, g, b] = [red, green, blue].map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: Math.round(lightness * 100) };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;

  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);

  return {
    h: Math.round(normalizeHue(hue)),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

export function hslToHex(hue, saturation, lightness) {
  return `#${hslToRgb(hue, saturation, lightness)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function hexToHsl(hex) {
  const normalized = hex.trim().replace(/^#/, "");

  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    throw new TypeError("HEX color must contain exactly six hexadecimal digits.");
  }

  const value = Number.parseInt(normalized, 16);
  return rgbToHsl((value >> 16) & 255, (value >> 8) & 255, value & 255);
}

export function generatePalette({ hue, saturation, lightness, count, offset }) {
  const safeCount = Math.min(12, Math.max(2, Math.round(count)));
  const safeOffset = Math.min(180, Math.max(1, Math.round(offset)));

  return Array.from({ length: safeCount }, (_, index) => {
    const shiftedHue = normalizeHue(hue + safeOffset * index);
    return {
      hue: shiftedHue,
      saturation,
      lightness,
      hex: hslToHex(shiftedHue, saturation, lightness),
      shift: safeOffset * index,
    };
  });
}
