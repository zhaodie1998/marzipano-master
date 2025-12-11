// Module Worker for EXR decoding to RGBA8
// Dynamically import shim which exposes THREE and EXRLoader via window-like global

// Ensure exr-shim sees a window object
self.window = self;

let ready = false;
async function ensureReady() {
  if (ready) return true;
  try {
    await import('../libs/exr-shim.js');
    ready = !!(self.THREE && (self.createEXRLoader || self.getEXRLoaderClass));
    return ready;
  } catch (e) {
    return false;
  }
}

function halfToFloat(h) {
  const s = (h & 0x8000) >> 15;
  let e = (h & 0x7C00) >> 10;
  let f = h & 0x03FF;
  if (e === 0) {
    return (s ? -1 : 1) * Math.pow(2, -14) * (f / Math.pow(2, 10));
  }
  if (e === 31) {
    return f ? NaN : (s ? -Infinity : Infinity);
  }
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / Math.pow(2, 10));
}

function aces(x) {
  const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return Math.min(1, Math.max(0, (x * (a * x + b)) / (x * (c * x + d) + e)));
}

function linearToSRGB(v) {
  if (isNaN(v)) v = 0;
  v = Math.max(0, Math.min(1, v));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function mapPixel(r, g, b, a, exposure = 1.0, tone = 'ACES') {
  r *= exposure; g *= exposure; b *= exposure;
  if (tone === 'REINHARD') {
    r = r / (1 + r); g = g / (1 + g); b = b / (1 + b);
  } else if (tone === 'LINEAR') {
    // no-op
  } else {
    r = aces(r); g = aces(g); b = aces(b);
  }
  const sr = Math.round(linearToSRGB(r) * 255);
  const sg = Math.round(linearToSRGB(g) * 255);
  const sb = Math.round(linearToSRGB(b) * 255);
  const sa = Math.round(Math.max(0, Math.min(1, a != null ? a : 1)) * 255);
  return [sr, sg, sb, sa];
}

function toRGBA8(exrData, options = {}) {
  const { width, height, data } = exrData;
  const tone = (options.toneMapping || 'ACES').toUpperCase();
  const exposure = typeof options.exposure === 'number' ? options.exposure : 1.0;
  const out = new Uint8ClampedArray(width * height * 4);
  const half = data instanceof Uint16Array;
  const float = data instanceof Float32Array;
  const stride = 4; // assume RGBA
  for (let i = 0, j = 0; i < data.length; i += stride, j += 4) {
    let r, g, b, a;
    if (half) {
      r = halfToFloat(data[i]);
      g = halfToFloat(data[i + 1]);
      b = halfToFloat(data[i + 2]);
      a = stride > 3 ? halfToFloat(data[i + 3]) : 1;
    } else if (float) {
      r = data[i]; g = data[i + 1]; b = data[i + 2]; a = stride > 3 ? data[i + 3] : 1;
    } else {
      // Unknown format: fallback
      r = data[i] || 0; g = data[i + 1] || 0; b = data[i + 2] || 0; a = 1;
    }
    const [sr, sg, sb, sa] = mapPixel(r, g, b, a, exposure, tone);
    out[j] = sr; out[j + 1] = sg; out[j + 2] = sb; out[j + 3] = sa;
  }
  return out;
}

self.onmessage = async (ev) => {
  const { id, action, buffer, options } = ev.data || {};
  try {
    const ok = await ensureReady();
    if (!ok) throw new Error('EXR loader not ready');
    let loader;
    if (typeof self.createEXRLoader === 'function') loader = self.createEXRLoader();
    else if (typeof self.getEXRLoaderClass === 'function') loader = new (self.getEXRLoaderClass())();
    else loader = new self.THREE.EXRLoader();

    const exr = loader.parse(buffer);
    const rgba = toRGBA8(exr, options);
    self.postMessage({ id, ok: true, width: exr.width, height: exr.height, rgba }, [rgba.buffer]);
  } catch (e) {
    self.postMessage({ id, ok: false, error: e && e.message ? e.message : String(e) });
  }
};

