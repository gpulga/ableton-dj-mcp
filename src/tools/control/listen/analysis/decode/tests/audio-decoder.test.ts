// Ableton DJ MCP - Electronic music production MCP server for Ableton Live
// Copyright (C) 2026 Gabriel Pulga
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from "vitest";
import {
  encodeAiff,
  encodeWav,
} from "#src/tools/control/listen/tests/audio-test-helpers.ts";
import { decodeAudio } from "../audio-decoder.ts";

const LEFT = Float32Array.of(0, 0.5, -0.5, 0.25);
const RIGHT = Float32Array.of(0.1, -0.1, 0.2, -0.2);

function expectChannels(
  decoded: ReturnType<typeof decodeAudio>,
  precision: number,
): void {
  expect(decoded.channels).toHaveLength(2);

  for (const [ch, expected] of [LEFT, RIGHT].entries()) {
    for (const [i, value] of expected.entries()) {
      expect(decoded.channels[ch]?.[i]).toBeCloseTo(value, precision);
    }
  }
}

function withTag(bytes: Uint8Array, offset: number, tag: string): Uint8Array {
  const copy = bytes.slice();

  for (const [i, c] of [...tag].entries()) {
    copy[offset + i] = c.codePointAt(0) ?? 0;
  }

  return copy;
}

describe("decodeAudio WAV", () => {
  it.each([
    [8, false, 1],
    [16, false, 4],
    [24, false, 6],
    [32, false, 6],
    [32, true, 6],
    [64, true, 6],
  ] as const)("decodes %i-bit (float %s)", (bits, float, precision) => {
    const decoded = decodeAudio(
      encodeWav([LEFT, RIGHT], 48_000, { bits, float }),
    );

    expect(decoded.sampleRate).toBe(48_000);
    expectChannels(decoded, precision);
  });

  it("decodes WAVE_FORMAT_EXTENSIBLE and skips unknown chunks", () => {
    const decoded = decodeAudio(
      encodeWav([LEFT, RIGHT], 44_100, {
        bits: 24,
        extensible: true,
        junk: true,
      }),
    );

    expect(decoded.sampleRate).toBe(44_100);
    expectChannels(decoded, 6);
  });

  it.each([0, 0xff_ff_ff_ff])(
    "reads to the end when the data size is %i (file still open)",
    (dataSize) => {
      const decoded = decodeAudio(
        encodeWav([LEFT, RIGHT], 48_000, { dataSize }),
      );

      expectChannels(decoded, 4);
    },
  );

  it("rejects non-audio files", () => {
    expect(() => decodeAudio(Uint8Array.of(1, 2, 3, 4, 5, 6))).toThrow(
      "unsupported audio file",
    );
  });

  it("rejects RIFF files that are not WAVE", () => {
    const wav = withTag(encodeWav([LEFT], 48_000), 8, "AVI ");

    expect(() => decodeAudio(wav)).toThrow("not a WAVE file");
  });

  it("rejects unsupported encodings", () => {
    const wav = encodeWav([LEFT], 48_000);

    wav[20] = 2; // ADPCM

    expect(() => decodeAudio(wav)).toThrow("format tag 2");
  });

  it("rejects data before fmt and files without data", () => {
    const wav = encodeWav([LEFT], 48_000);

    expect(() => decodeAudio(withTag(wav, 12, "data"))).toThrow(
      "data before fmt",
    );
    expect(() => decodeAudio(withTag(wav, 36, "LIST"))).toThrow(
      "no data chunk",
    );
  });

  it("rejects unsupported layouts", () => {
    const zeroChannels = encodeWav([LEFT], 48_000);

    zeroChannels[22] = 0;
    expect(() => decodeAudio(zeroChannels)).toThrow(
      "unsupported sample layout",
    );

    const twelveBit = encodeWav([LEFT], 48_000);

    twelveBit[34] = 12;
    expect(() => decodeAudio(twelveBit)).toThrow("unsupported sample layout");

    const float16 = encodeWav([LEFT], 48_000, { float: true, bits: 32 });

    float16[34] = 16;

    expect(() => decodeAudio(float16)).toThrow(
      "unsupported bit depth 16 float",
    );

    const int64 = encodeWav([LEFT], 48_000, { bits: 64 });

    expect(() => decodeAudio(int64)).toThrow("unsupported bit depth 64");
  });
});

describe("decodeAudio AIFF", () => {
  it.each([8, 16, 24, 32] as const)("decodes %i-bit big endian", (bits) => {
    const decoded = decodeAudio(encodeAiff([LEFT, RIGHT], 44_100, bits));

    expect(decoded.sampleRate).toBe(44_100);
    expectChannels(decoded, bits === 8 ? 1 : 4);
  });

  it("decodes AIFC sowt (little endian) and fl32", () => {
    expectChannels(
      decodeAudio(encodeAiff([LEFT, RIGHT], 48_000, 16, "sowt")),
      4,
    );
    expectChannels(
      decodeAudio(encodeAiff([LEFT, RIGHT], 48_000, 32, "fl32")),
      6,
    );
    expectChannels(
      decodeAudio(encodeAiff([LEFT, RIGHT], 48_000, 16, "NONE")),
      4,
    );
  });

  it("rejects unsupported AIFC compression", () => {
    expect(() => decodeAudio(encodeAiff([LEFT], 48_000, 16, "ulaw"))).toThrow(
      'unsupported AIFC compression "ulaw"',
    );
  });

  it("rejects other FORM types and broken chunk order", () => {
    const aiff = encodeAiff([LEFT], 48_000);

    expect(() => decodeAudio(withTag(aiff, 8, "8SVX"))).toThrow(
      "not an AIFF file",
    );
    expect(() => decodeAudio(withTag(aiff, 12, "SSND"))).toThrow("before COMM");
    expect(() => decodeAudio(withTag(aiff, 38, "XXXX"))).toThrow(
      "no SSND chunk",
    );
  });
});
