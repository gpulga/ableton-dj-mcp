// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Radix-2 FFT and windowed power spectra for frame-based analysis.

/**
 * In-place iterative radix-2 complex FFT
 * @param re - Real parts (length must be a power of two)
 * @param im - Imaginary parts (same length)
 */
export function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;

  if (n === 0 || (n & (n - 1)) !== 0) {
    throw new Error(`FFT size must be a power of two (got ${n})`);
  }

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;

    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;

    if (i < j) {
      swap(re, i, j);
      swap(im, i, j);
    }
  }

  const { cos, sin } = twiddles(n);

  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const stride = n / size;

    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        // Hot loop: indexes are in range by construction, so read directly
        const wr = cos[k * stride] as number;
        const wi = sin[k * stride] as number;
        const a = start + k;
        const b = a + half;
        const reA = re[a] as number;
        const imA = im[a] as number;
        const reB = re[b] as number;
        const imB = im[b] as number;
        const br = reB * wr - imB * wi;
        const bi = reB * wi + imB * wr;

        re[b] = reA - br;
        im[b] = imA - bi;
        re[a] = reA + br;
        im[a] = imA + bi;
      }
    }
  }
}

/**
 * Periodic Hann window
 * @param size - Window length
 * @returns Window coefficients
 */
export function hannWindow(size: number): Float64Array {
  const window = new Float64Array(size);

  for (let i = 0; i < size; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  }

  return window;
}

/**
 * Power spectrum of one windowed frame, scaled so a full-scale sine reads ~1
 * @param samples - Source signal
 * @param start - First sample of the frame (zero-padded past the end)
 * @param window - Window coefficients (its length is the FFT size)
 * @returns Power per bin, bins 0..size/2
 */
export function framePowerSpectrum(
  samples: Float32Array,
  start: number,
  window: Float64Array,
): Float64Array {
  const size = window.length;
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  let windowSum = 0;

  for (let i = 0; i < size; i++) {
    const w = at(window, i);

    re[i] = (samples[start + i] ?? 0) * w;
    windowSum += w;
  }

  fftInPlace(re, im);

  const bins = size / 2 + 1;
  const power = new Float64Array(bins);
  // One-sided spectrum: x2 amplitude, normalized by the window gain
  const scale = (2 / windowSum) ** 2;

  for (let k = 0; k < bins; k++) {
    power[k] = (at(re, k) ** 2 + at(im, k) ** 2) * scale;
  }

  return power;
}

/**
 * Read a typed array element (index checked by the caller's loop bounds)
 * @param array - Typed array
 * @param index - Element index
 * @returns Element value, 0 when out of range
 */
export function at(array: Float64Array | Float32Array, index: number): number {
  return array[index] ?? 0;
}

const twiddleCache = new Map<
  number,
  { cos: Float64Array; sin: Float64Array }
>();

function twiddles(n: number): { cos: Float64Array; sin: Float64Array } {
  let table = twiddleCache.get(n);

  if (table == null) {
    const cos = new Float64Array(n / 2);
    const sin = new Float64Array(n / 2);

    for (let k = 0; k < n / 2; k++) {
      cos[k] = Math.cos((-2 * Math.PI * k) / n);
      sin[k] = Math.sin((-2 * Math.PI * k) / n);
    }

    table = { cos, sin };
    twiddleCache.set(n, table);
  }

  return table;
}

function swap(array: Float64Array, i: number, j: number): void {
  const tmp = at(array, i);

  array[i] = at(array, j);
  array[j] = tmp;
}
