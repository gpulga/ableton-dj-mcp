// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Synthetic audio and file encoders for listen/analysis tests.

export const TEST_RATE = 22_050;

/**
 * Sine wave
 * @param hz - Frequency
 * @param seconds - Duration
 * @param amplitude - Peak amplitude
 * @param sampleRate - Sample rate
 * @param phase - Start phase in radians
 * @returns Samples
 */
export function sine(
  hz: number,
  seconds: number,
  amplitude = 0.5,
  sampleRate = TEST_RATE,
  phase = 0,
): Float32Array {
  const out = new Float32Array(Math.round(seconds * sampleRate));

  for (let i = 0; i < out.length; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / sampleRate + phase);
  }

  return out;
}

/**
 * Short decaying tone bursts (kick- or hat-like hits) at given times
 * @param times - Hit times in seconds
 * @param hz - Burst frequency
 * @param seconds - Total duration
 * @param sampleRate - Sample rate
 * @returns Samples
 */
export function bursts(
  times: number[],
  hz: number,
  seconds: number,
  sampleRate = TEST_RATE,
): Float32Array {
  const out = new Float32Array(Math.round(seconds * sampleRate));
  const decay = Math.round(0.08 * sampleRate);

  for (const t of times) {
    const start = Math.round(t * sampleRate);

    for (let i = 0; i < decay && start + i < out.length; i++) {
      const env = 1 - i / decay;

      out[start + i] =
        (out[start + i] ?? 0) +
        0.8 * env * Math.sin((2 * Math.PI * hz * i) / sampleRate);
    }
  }

  return out;
}

/**
 * Sum signals sample by sample (lengths must match)
 * @param signals - Signals to mix
 * @returns Mixed signal
 */
export function mix(...signals: Float32Array[]): Float32Array {
  const out = new Float32Array(signals[0]?.length ?? 0);

  for (const signal of signals) {
    for (let i = 0; i < out.length; i++)
      out[i] = (out[i] ?? 0) + (signal[i] ?? 0);
  }

  return out;
}

/**
 * Evenly spaced times
 * @param interval - Seconds between hits
 * @param seconds - Total duration
 * @returns Hit times
 */
export function grid(interval: number, seconds: number): number[] {
  const times: number[] = [];

  for (let t = 0; t < seconds - 1e-9; t += interval) times.push(t);

  return times;
}

interface WavOptions {
  bits?: 8 | 16 | 24 | 32 | 64;
  float?: boolean;
  extensible?: boolean;
  junk?: boolean;
  dataSize?: number;
}

/**
 * Encode channels as a WAV file
 * @param channels - Channel samples in -1..1
 * @param sampleRate - Sample rate
 * @param options - Encoding options
 * @returns File bytes
 */
export function encodeWav(
  channels: Float32Array[],
  sampleRate: number,
  options: WavOptions = {},
): Uint8Array {
  const {
    bits = 16,
    float = false,
    extensible = false,
    junk = false,
  } = options;
  const frames = channels[0]?.length ?? 0;
  const bytesPerSample = bits / 8;
  const dataBytes = frames * channels.length * bytesPerSample;
  const fmtSize = extensible ? 40 : 16;
  const junkBytes = junk ? 12 : 0;
  const out = new DataView(
    new ArrayBuffer(12 + junkBytes + 8 + fmtSize + 8 + dataBytes),
  );
  let o = 0;

  const tag = (t: string): void => {
    for (const c of t) out.setUint8(o++, c.codePointAt(0) ?? 0);
  };

  tag("RIFF");
  out.setUint32(4, out.byteLength - 8, true);
  o = 8;
  tag("WAVE");

  if (junk) {
    tag("JUNK");
    out.setUint32(o, 4, true);
    o += 8;
  }

  tag("fmt ");
  out.setUint32(o, fmtSize, true);
  out.setUint16(o + 4, extensible ? 0xff_fe : float ? 3 : 1, true);
  out.setUint16(o + 6, channels.length, true);
  out.setUint32(o + 8, sampleRate, true);
  out.setUint32(o + 12, sampleRate * channels.length * bytesPerSample, true);
  out.setUint16(o + 16, channels.length * bytesPerSample, true);
  out.setUint16(o + 18, bits, true);

  // SubFormat GUID starts 24 bytes into the fmt body
  if (extensible) out.setUint16(o + 28, float ? 3 : 1, true);

  o += 4 + fmtSize;
  tag("data");
  out.setUint32(o, options.dataSize ?? dataBytes, true);
  o += 4;

  for (let f = 0; f < frames; f++) {
    for (const channel of channels) {
      writeSample(out, o, channel[f] ?? 0, bits, float, true);
      o += bytesPerSample;
    }
  }

  return new Uint8Array(out.buffer);
}

/**
 * Encode channels as AIFF (or AIFC with a compression id)
 * @param channels - Channel samples
 * @param sampleRate - Sample rate
 * @param bits - Bits per sample
 * @param compression - AIFC compression id (omit for plain AIFF)
 * @returns File bytes
 */
export function encodeAiff(
  channels: Float32Array[],
  sampleRate: number,
  bits: 8 | 16 | 24 | 32 = 16,
  compression?: string,
): Uint8Array {
  const frames = channels[0]?.length ?? 0;
  const bytesPerSample = (compression === "fl32" ? 32 : bits) / 8;
  const dataBytes = frames * channels.length * bytesPerSample;
  const commSize = compression ? 22 : 18;
  const out = new DataView(new ArrayBuffer(12 + 8 + commSize + 16 + dataBytes));
  let o = 0;

  const tag = (t: string): void => {
    for (const c of t) out.setUint8(o++, c.codePointAt(0) ?? 0);
  };

  tag("FORM");
  out.setUint32(4, out.byteLength - 8, false);
  o = 8;
  tag(compression ? "AIFC" : "AIFF");
  tag("COMM");
  out.setUint32(o, commSize, false);
  out.setUint16(o + 4, channels.length, false);
  out.setUint32(o + 6, frames, false);
  out.setUint16(o + 10, bits, false);
  writeExtended80(out, o + 12, sampleRate);
  o += 4 + 18;

  if (compression) tag(compression);

  tag("SSND");
  out.setUint32(o, 8 + dataBytes, false);
  o += 12;

  const littleEndian = compression === "sowt";

  for (let f = 0; f < frames; f++) {
    for (const channel of channels) {
      writeSample(
        out,
        o,
        channel[f] ?? 0,
        compression === "fl32" ? 32 : bits,
        compression === "fl32",
        littleEndian,
        true,
      );
      o += bytesPerSample;
    }
  }

  return new Uint8Array(out.buffer);
}

function writeSample(
  out: DataView,
  offset: number,
  value: number,
  bits: number,
  float: boolean,
  littleEndian: boolean,
  signed8 = false,
): void {
  if (float) {
    if (bits === 64) out.setFloat64(offset, value, littleEndian);
    else out.setFloat32(offset, value, littleEndian);

    return;
  }

  const max = 2 ** (bits - 1);
  const int = Math.max(-max, Math.min(max - 1, Math.round(value * max)));

  switch (bits) {
    case 8:
      if (signed8) out.setInt8(offset, int);
      else out.setUint8(offset, int + 128);
      break;
    case 16:
      out.setInt16(offset, int, littleEndian);
      break;

    case 24: {
      const u = int < 0 ? int + 0x1_00_00_00 : int;
      const bytes = [u & 0xff, (u >> 8) & 0xff, (u >> 16) & 0xff];

      if (!littleEndian) bytes.reverse();
      for (const [i, b] of bytes.entries()) out.setUint8(offset + i, b);
      break;
    }

    default:
      out.setInt32(offset, int, littleEndian);
  }
}

function writeExtended80(out: DataView, offset: number, value: number): void {
  const exponent = Math.floor(Math.log2(value));
  const mantissa = value / 2 ** exponent;
  const hi = Math.floor(mantissa * 2 ** 31);

  out.setUint16(offset, exponent + 16_383, false);
  out.setUint32(offset + 2, hi, false);
  out.setUint32(offset + 6, 0, false);
}
