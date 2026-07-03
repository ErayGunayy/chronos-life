import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CATEGORY_PALETTE,
  RING_FORGOTTEN_ACCENT,
  RING_ROUTINE_COLOR,
  RING_UNCATEGORIZED_COLOR,
  colorForCategoryIndex,
  shiftLightness,
} from '@/domain/ring/palette';

describe('DEFAULT_CATEGORY_PALETTE', () => {
  it('has 8–10 mutually distinct colors (§5.2.3)', () => {
    expect(DEFAULT_CATEGORY_PALETTE.length).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_CATEGORY_PALETTE.length).toBeLessThanOrEqual(10);
    expect(new Set(DEFAULT_CATEGORY_PALETTE).size).toBe(DEFAULT_CATEGORY_PALETTE.length);
  });

  it('never reuses the reserved neutrals for categories', () => {
    const reserved = [RING_ROUTINE_COLOR, RING_UNCATEGORIZED_COLOR, RING_FORGOTTEN_ACCENT];
    for (const color of reserved) {
      expect(DEFAULT_CATEGORY_PALETTE).not.toContain(color);
    }
  });
});

describe('colorForCategoryIndex', () => {
  it('returns base palette colors for the first cycle, in creation order', () => {
    DEFAULT_CATEGORY_PALETTE.forEach((color, index) => {
      expect(colorForCategoryIndex(index)).toBe(color);
    });
  });

  it('produces tonal variations (not new hues) past the palette size', () => {
    // Arrange
    const paletteSize = DEFAULT_CATEGORY_PALETTE.length;

    // Act
    const secondCycle = colorForCategoryIndex(paletteSize); // variant of color 0
    const thirdCycle = colorForCategoryIndex(paletteSize * 2); // darker variant of color 0

    // Assert — same family, different shade, all mutually distinct
    expect(secondCycle).not.toBe(DEFAULT_CATEGORY_PALETTE[0]);
    expect(thirdCycle).not.toBe(DEFAULT_CATEGORY_PALETTE[0]);
    expect(secondCycle).not.toBe(thirdCycle);
    expect(secondCycle).toBe(shiftLightness(DEFAULT_CATEGORY_PALETTE[0], 0.3));
    expect(thirdCycle).toBe(shiftLightness(DEFAULT_CATEGORY_PALETTE[0], -0.22));
  });

  it('is deterministic — the same index always yields the same color', () => {
    expect(colorForCategoryIndex(4)).toBe(colorForCategoryIndex(4));
    expect(colorForCategoryIndex(13)).toBe(colorForCategoryIndex(13));
  });

  it('rejects invalid indexes', () => {
    expect(() => colorForCategoryIndex(-1)).toThrow(RangeError);
    expect(() => colorForCategoryIndex(1.5)).toThrow(RangeError);
  });
});

describe('shiftLightness', () => {
  it('lightens toward white and darkens toward black', () => {
    expect(shiftLightness('#000000', 1)).toBe('#ffffff');
    expect(shiftLightness('#ffffff', -1)).toBe('#000000');
    expect(shiftLightness('#4477aa', 0)).toBe('#4477aa');
  });

  it('rejects non-hex input', () => {
    expect(() => shiftLightness('teal', 0.2)).toThrow(RangeError);
  });
});
