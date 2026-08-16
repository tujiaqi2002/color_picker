import { generatePalette, hexToHsl, hslToHex, hslToRgb, normalizeHue } from "./color-utils.js";

const wheel = document.querySelector("#color-wheel");
const wheelPointer = document.querySelector("#wheel-pointer");
const baseColorInput = document.querySelector("#base-color");
const baseHex = document.querySelector("#base-hex");
const basePreview = document.querySelector("#base-preview");
const lightnessRange = document.querySelector("#lightness-range");
const lightnessOutput = document.querySelector("#lightness-output");
const countRange = document.querySelector("#count-range");
const countNumber = document.querySelector("#count-number");
const offsetRange = document.querySelector("#offset-range");
const offsetNumber = document.querySelector("#offset-number");
const presetButtons = [...document.querySelectorAll("[data-angle]")];
const paletteStrip = document.querySelector("#palette-strip");
const swatchGrid = document.querySelector("#swatch-grid");
const ruleCount = document.querySelector("#rule-count");
const ruleAngle = document.querySelector("#rule-angle");
const toast = document.querySelector("#toast");

const state = {
  hue: 222,
  saturation: 76,
  lightness: 61,
  count: 6,
  offset: 30,
};

let toastTimer;
let wheelFrame;

function drawWheel() {
  const context = wheel.getContext("2d");
  const { width, height } = wheel;
  const radius = Math.min(width, height) / 2;
  const image = context.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offsetX = x + 0.5 - width / 2;
      const offsetY = y + 0.5 - height / 2;
      const distance = Math.hypot(offsetX, offsetY);
      const pixel = (y * width + x) * 4;

      if (distance <= radius) {
        const hue = normalizeHue((Math.atan2(offsetY, offsetX) * 180) / Math.PI);
        const saturation = (distance / radius) * 100;
        const [red, green, blue] = hslToRgb(hue, saturation, state.lightness);
        image.data[pixel] = red;
        image.data[pixel + 1] = green;
        image.data[pixel + 2] = blue;
        image.data[pixel + 3] = 255;
      }
    }
  }

  context.putImageData(image, 0, 0);
}

function scheduleWheelDraw() {
  cancelAnimationFrame(wheelFrame);
  wheelFrame = requestAnimationFrame(drawWheel);
}

function updatePointer() {
  const angle = (state.hue * Math.PI) / 180;
  const distance = state.saturation * 0.5;
  wheelPointer.style.left = `${50 + Math.cos(angle) * distance}%`;
  wheelPointer.style.top = `${50 + Math.sin(angle) * distance}%`;
  wheelPointer.style.setProperty("--pointer-color", hslToHex(state.hue, state.saturation, state.lightness));
  wheel.setAttribute("aria-valuenow", String(Math.round(state.hue)));
  wheel.setAttribute(
    "aria-valuetext",
    `色相 ${Math.round(state.hue)} 度，饱和度 ${Math.round(state.saturation)}%`,
  );
}

function updateBaseColor() {
  const hex = hslToHex(state.hue, state.saturation, state.lightness);
  baseColorInput.value = hex;
  baseHex.textContent = hex;
  basePreview.style.backgroundColor = hex;
  lightnessRange.value = String(Math.round(state.lightness));
  lightnessOutput.value = `${Math.round(state.lightness)}%`;
  updatePointer();
}

function createSwatch(color, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "swatch-card";
  button.style.setProperty("--swatch", color.hex);
  button.style.setProperty("--delay", `${index * 35}ms`);
  button.setAttribute("aria-label", `复制颜色 ${color.hex}，色相 ${Math.round(color.hue)} 度`);

  const colorBlock = document.createElement("span");
  colorBlock.className = "swatch-color";
  colorBlock.setAttribute("aria-hidden", "true");

  const info = document.createElement("span");
  info.className = "swatch-info";

  const label = document.createElement("span");
  label.className = "swatch-label";
  label.textContent = index === 0 ? "基准色" : `偏移 +${color.shift}°`;

  const value = document.createElement("strong");
  value.textContent = color.hex;

  const meta = document.createElement("span");
  meta.className = "swatch-meta";
  meta.textContent = `H ${Math.round(color.hue)}°`;

  info.append(label, value, meta);
  button.append(colorBlock, info);
  button.addEventListener("click", () => copyColor(color.hex));
  return button;
}

function renderPalette() {
  const palette = generatePalette(state);
  const fragment = document.createDocumentFragment();
  const stripFragment = document.createDocumentFragment();

  palette.forEach((color, index) => {
    fragment.append(createSwatch(color, index));
    const stripColor = document.createElement("span");
    stripColor.style.backgroundColor = color.hex;
    stripFragment.append(stripColor);
  });

  swatchGrid.replaceChildren(fragment);
  paletteStrip.replaceChildren(stripFragment);
  ruleCount.textContent = `${state.count} 色`;
  ruleAngle.textContent = `每次 +${state.offset}°`;
}

function updatePresetState() {
  presetButtons.forEach((button) => {
    const active = Number(button.dataset.angle) === state.offset;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function render({ redrawWheel = false } = {}) {
  updateBaseColor();
  renderPalette();
  updatePresetState();
  if (redrawWheel) scheduleWheelDraw();
}

function setFromWheel(event) {
  const rect = wheel.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  const radius = Math.min(rect.width, rect.height) / 2;
  const distance = Math.min(Math.hypot(x, y), radius);

  state.hue = normalizeHue((Math.atan2(y, x) * 180) / Math.PI);
  state.saturation = (distance / radius) * 100;
  render();
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}

async function copyColor(hex) {
  try {
    await navigator.clipboard.writeText(hex);
    showToast(`已复制 ${hex}`);
  } catch {
    const selection = document.createElement("textarea");
    selection.value = hex;
    selection.setAttribute("readonly", "");
    selection.style.position = "fixed";
    selection.style.opacity = "0";
    document.body.append(selection);
    selection.select();
    document.execCommand("copy");
    selection.remove();
    showToast(`已复制 ${hex}`);
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 1800);
}

wheel.addEventListener("pointerdown", (event) => {
  wheel.setPointerCapture(event.pointerId);
  setFromWheel(event);
});
wheel.addEventListener("pointermove", (event) => {
  if (wheel.hasPointerCapture(event.pointerId)) setFromWheel(event);
});
wheel.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();

  if (event.shiftKey) {
    const direction = event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : -1;
    state.saturation = Math.min(100, Math.max(0, state.saturation + direction));
  } else {
    const direction = event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : -1;
    state.hue = normalizeHue(state.hue + direction);
  }
  render();
});

baseColorInput.addEventListener("input", () => {
  const { h, s, l } = hexToHsl(baseColorInput.value);
  state.hue = h;
  state.saturation = s;
  state.lightness = l;
  render({ redrawWheel: true });
});

lightnessRange.addEventListener("input", () => {
  state.lightness = Number(lightnessRange.value);
  render({ redrawWheel: true });
});

countRange.addEventListener("input", () => {
  state.count = Number(countRange.value);
  countNumber.value = String(state.count);
  renderPalette();
});
countNumber.addEventListener("input", () => {
  state.count = clampNumber(countNumber.value, 2, 12, state.count);
  countRange.value = String(state.count);
  renderPalette();
});
countNumber.addEventListener("blur", () => {
  countNumber.value = String(state.count);
});

offsetRange.addEventListener("input", () => {
  state.offset = Number(offsetRange.value);
  offsetNumber.value = String(state.offset);
  renderPalette();
  updatePresetState();
});
offsetNumber.addEventListener("input", () => {
  state.offset = clampNumber(offsetNumber.value, 1, 180, state.offset);
  offsetRange.value = String(state.offset);
  renderPalette();
  updatePresetState();
});
offsetNumber.addEventListener("blur", () => {
  offsetNumber.value = String(state.offset);
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.offset = Number(button.dataset.angle);
    offsetRange.value = String(state.offset);
    offsetNumber.value = String(state.offset);
    renderPalette();
    updatePresetState();
  });
});

render({ redrawWheel: true });
