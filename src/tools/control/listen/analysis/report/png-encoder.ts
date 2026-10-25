// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

// Minimal truecolor PNG encoder (no external image libraries).

import { deflateSync } from "node:zlib";

const PNG_SIGNATURE = Uint8Array.of(
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
);
const COLOR_TYPE_RGB = 2;

/**
 * Encode RGB pixels as a PNG
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param rgb - width*height*3 bytes, rows top to bottom
 * @returns PNG file bytes
 */
export function encodePng(
  width: number,
  height: number,
  rgb: Uint8Array,
): Buffer {
  if (rgb.length !== width * height * 3) {
    throw new Error(
      `expected ${width * height * 3} RGB bytes, got ${rgb.length}`,
    );
  }

  // Each scanline starts with filter type 0 (none)
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    raw.set(rgb.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const header = Buffer.alloc(13);

  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = COLOR_TYPE_RGB;

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const out = Buffer.alloc(12 + data.length);

  out.writeUInt32BE(data.length, 0);
  typeBytes.copy(out, 4);
  out.set(data, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);

  return out;
}

let crcTable: Uint32Array | null = null;

/**
 * CRC-32 (PNG/zlib polynomial)
 * @param bytes - Input bytes
 * @returns Unsigned CRC
 */
export function crc32(bytes: Uint8Array): number {
  crcTable ??= buildCrcTable();
  let crc = 0xff_ff_ff_ff;

  for (const byte of bytes) {
    crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }

  return (crc ^ 0xff_ff_ff_ff) >>> 0;
}

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;

    for (let k = 0; k < 8; k++) c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }

  return table;
}
