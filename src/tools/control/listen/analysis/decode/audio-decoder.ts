// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Decodes the uncompressed audio Live records (WAV, AIFF, AIFC) into float
// channels. Pure TypeScript so analysis needs no external tools.

export interface DecodedAudio {
  sampleRate: number;
  channels: Float32Array[];
}

interface SampleFormat {
  channelCount: number;
  sampleRate: number;
  bitsPerSample: number;
  isFloat: boolean;
  littleEndian: boolean;
}

const WAVE_FORMAT_PCM = 1;
const WAVE_FORMAT_IEEE_FLOAT = 3;
const WAVE_FORMAT_EXTENSIBLE = 0xff_fe;

/**
 * Decode a WAV or AIFF/AIFC file buffer
 * @param buffer - Whole file contents
 * @returns Sample rate and one Float32Array per channel, in -1..1
 */
export function decodeAudio(buffer: Uint8Array): DecodedAudio {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.length);
  const magic = readTag(view, 0);

  if (magic === "RIFF" || magic === "RF64") return decodeWav(view);
  if (magic === "FORM") return decodeAiff(view);

  throw new Error("unsupported audio file (expected WAV or AIFF)");
}

function decodeWav(view: DataView): DecodedAudio {
  if (readTag(view, 8) !== "WAVE") throw new Error("not a WAVE file");

  let format: SampleFormat | null = null;
  let offset = 12;

  while (offset + 8 <= view.byteLength) {
    const id = readTag(view, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;

    if (id === "fmt ") {
      format = parseWavFormat(view, body);
    } else if (id === "data") {
      if (format == null) throw new Error("WAV data before fmt chunk");
      // Live can leave the size at 0 or 0xFFFFFFFF while a file is open
      const end =
        size === 0 || size === 0xff_ff_ff_ff ? view.byteLength : body + size;

      return readFrames(view, body, Math.min(end, view.byteLength), format);
    }

    offset = body + size + (size % 2);
  }

  throw new Error("WAV file has no data chunk");
}

function parseWavFormat(view: DataView, body: number): SampleFormat {
  let tag = view.getUint16(body, true);
  const bitsPerSample = view.getUint16(body + 14, true);

  if (tag === WAVE_FORMAT_EXTENSIBLE) {
    // SubFormat GUID starts with the real format tag
    tag = view.getUint16(body + 24, true);
  }

  if (tag !== WAVE_FORMAT_PCM && tag !== WAVE_FORMAT_IEEE_FLOAT) {
    throw new Error(`unsupported WAV encoding (format tag ${tag})`);
  }

  return {
    channelCount: view.getUint16(body + 2, true),
    sampleRate: view.getUint32(body + 4, true),
    bitsPerSample,
    isFloat: tag === WAVE_FORMAT_IEEE_FLOAT,
    littleEndian: true,
  };
}

function decodeAiff(view: DataView): DecodedAudio {
  const formType = readTag(view, 8);

  if (formType !== "AIFF" && formType !== "AIFC") {
    throw new Error("not an AIFF file");
  }

  let format: SampleFormat | null = null;
  let offset = 12;

  while (offset + 8 <= view.byteLength) {
    const id = readTag(view, offset);
    const size = view.getUint32(offset + 4, false);
    const body = offset + 8;

    if (id === "COMM") {
      format = parseAiffFormat(view, body, formType === "AIFC");
    } else if (id === "SSND") {
      if (format == null) throw new Error("AIFF sound data before COMM chunk");
      const dataStart = body + 8 + view.getUint32(body, false);

      return readFrames(
        view,
        dataStart,
        Math.min(body + size, view.byteLength),
        format,
      );
    }

    offset = body + size + (size % 2);
  }

  throw new Error("AIFF file has no SSND chunk");
}

function parseAiffFormat(
  view: DataView,
  body: number,
  isAifc: boolean,
): SampleFormat {
  const format: SampleFormat = {
    channelCount: view.getUint16(body, false),
    sampleRate: readExtended80(view, body + 8),
    bitsPerSample: view.getUint16(body + 6, false),
    isFloat: false,
    littleEndian: false,
  };

  if (isAifc) {
    const compression = readTag(view, body + 18);

    if (compression === "sowt") {
      format.littleEndian = true;
    } else if (compression === "fl32" || compression === "FL32") {
      format.isFloat = true;
      format.bitsPerSample = 32;
    } else if (compression !== "NONE") {
      throw new Error(`unsupported AIFC compression "${compression}"`);
    }
  }

  return format;
}

function readFrames(
  view: DataView,
  start: number,
  end: number,
  format: SampleFormat,
): DecodedAudio {
  const { channelCount, bitsPerSample } = format;
  const bytesPerSample = bitsPerSample / 8;

  if (channelCount < 1 || !Number.isInteger(bytesPerSample)) {
    throw new Error(
      `unsupported sample layout (${channelCount} ch, ${bitsPerSample} bit)`,
    );
  }

  const readSample = sampleReader(format);

  const frameBytes = bytesPerSample * channelCount;
  const frameCount = Math.floor((end - start) / frameBytes);
  const channels = Array.from(
    { length: channelCount },
    () => new Float32Array(frameCount),
  );

  for (let frame = 0; frame < frameCount; frame++) {
    const frameStart = start + frame * frameBytes;

    for (let ch = 0; ch < channelCount; ch++) {
      (channels[ch] as Float32Array)[frame] = readSample(
        view,
        frameStart + ch * bytesPerSample,
      );
    }
  }

  return { sampleRate: format.sampleRate, channels };
}

type SampleReader = (view: DataView, offset: number) => number;

function sampleReader({
  bitsPerSample,
  isFloat,
  littleEndian: le,
}: SampleFormat): SampleReader {
  if (isFloat) {
    if (bitsPerSample === 32) return (v, o) => v.getFloat32(o, le);
    if (bitsPerSample === 64) return (v, o) => v.getFloat64(o, le);
  } else {
    switch (bitsPerSample) {
      case 8:
        // WAV 8-bit is unsigned, AIFF 8-bit is signed
        return le
          ? (v, o) => (v.getUint8(o) - 128) / 128
          : (v, o) => v.getInt8(o) / 128;
      case 16:
        return (v, o) => v.getInt16(o, le) / 32_768;
      case 24:
        return (v, o) => read24(v, o, le) / 8_388_608;
      case 32:
        return (v, o) => v.getInt32(o, le) / 2_147_483_648;
    }
  }

  throw new Error(
    `unsupported bit depth ${bitsPerSample}${isFloat ? " float" : ""}`,
  );
}

function read24(view: DataView, offset: number, littleEndian: boolean): number {
  const b0 = view.getUint8(offset);
  const b1 = view.getUint8(offset + 1);
  const b2 = view.getUint8(offset + 2);
  const unsigned = littleEndian
    ? b0 | (b1 << 8) | (b2 << 16)
    : (b0 << 16) | (b1 << 8) | b2;

  return unsigned & 0x80_00_00 ? unsigned - 0x1_00_00_00 : unsigned;
}

/**
 * Read an IEEE 754 80-bit extended float (AIFF sample rate)
 * @param view - Data view
 * @param offset - Byte offset of the 10-byte value
 * @returns Decoded number
 */
function readExtended80(view: DataView, offset: number): number {
  const exponent = view.getUint16(offset, false) & 0x7f_ff;
  const hi = view.getUint32(offset + 2, false);
  const lo = view.getUint32(offset + 6, false);
  const mantissa = hi * 2 ** 32 + lo;

  return mantissa * 2 ** (exponent - 16_383 - 63);
}

function readTag(view: DataView, offset: number): string {
  if (offset + 4 > view.byteLength) return "";

  return String.fromCodePoint(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}
