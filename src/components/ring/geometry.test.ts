import { describe, expect, test } from 'vitest';

import {
  MIN_SWEEP_DEGREES,
  SEGMENT_PADDING_DEGREES,
  pointOnRing,
  ringArcs,
  ringArcsClock,
} from '@/components/ring/geometry';

const CX = 120;
const CY = 120;
const R = 96;

describe('pointOnRing', () => {
  test('angle 0 is 12 o’clock, 90 is 3 o’clock (clockwise)', () => {
    expect(pointOnRing(CX, CY, R, 0)).toEqual({ x: CX, y: CY - R });
    const east = pointOnRing(CX, CY, R, 90);
    expect(east.x).toBeCloseTo(CX + R);
    expect(east.y).toBeCloseTo(CY);
  });
});

describe('ringArcs', () => {
  test('no shares or zero total → no arcs', () => {
    expect(ringArcs([], CX, CY, R)).toEqual([]);
    expect(ringArcs([0, 0], CX, CY, R)).toEqual([]);
  });

  test('rejects negative or non-finite shares', () => {
    expect(() => ringArcs([0.5, -0.1], CX, CY, R)).toThrow(RangeError);
    expect(() => ringArcs([Number.NaN], CX, CY, R)).toThrow(RangeError);
  });

  test('a single share fills the full circle', () => {
    const [arc] = ringArcs([1], CX, CY, R);
    expect(arc.startAngle).toBe(0);
    expect(arc.endAngle).toBe(360);
    // Two half-circle arcs so the path is renderable.
    expect(arc.path.match(/A /g)).toHaveLength(2);
  });

  test('multiple shares start at 12 o’clock, keep order, and pad between segments', () => {
    const arcs = ringArcs([0.5, 0.3, 0.2], CX, CY, R);

    expect(arcs[0].startAngle).toBe(0);
    for (let i = 1; i < arcs.length; i += 1) {
      expect(arcs[i].startAngle).toBeCloseTo(arcs[i - 1].endAngle + SEGMENT_PADDING_DEGREES);
    }

    const available = 360 - 3 * SEGMENT_PADDING_DEGREES;
    expect(arcs[0].endAngle - arcs[0].startAngle).toBeCloseTo(available * 0.5);
    expect(arcs[2].endAngle).toBeCloseTo(360 - SEGMENT_PADDING_DEGREES);
  });

  test('shares are normalized — weights need not sum to 1', () => {
    const fromWeights = ringArcs([50, 30, 20], CX, CY, R);
    const fromShares = ringArcs([0.5, 0.3, 0.2], CX, CY, R);
    expect(fromWeights).toEqual(fromShares);
  });

  test('a sliver is raised to the minimum sweep so it stays visible and tappable', () => {
    const arcs = ringArcs([0.999, 0.001], CX, CY, R);

    const sliver = arcs[1].endAngle - arcs[1].startAngle;
    expect(sliver).toBeCloseTo(MIN_SWEEP_DEGREES);

    // The total is preserved: the big arc gave up what the sliver gained.
    const available = 360 - 2 * SEGMENT_PADDING_DEGREES;
    const totalSweep = arcs.reduce((sum, arc) => sum + (arc.endAngle - arc.startAngle), 0);
    expect(totalSweep).toBeCloseTo(available);
  });

  test('sweeps over 180° set the large-arc flag', () => {
    const arcs = ringArcs([0.75, 0.25], CX, CY, R);
    expect(arcs[0].path).toMatch(/A 96 96 0 1 1/);
    expect(arcs[1].path).toMatch(/A 96 96 0 0 1/);
  });
});

describe('ringArcsClock', () => {
  test('places bands at their absolute clock position — 00:00 at the top', () => {
    // 00:00–09:00, 09:00–11:00, 11:00–24:00 as fractions of the day.
    const arcs = ringArcsClock(
      [
        { startFraction: 0, endFraction: 9 / 24 },
        { startFraction: 9 / 24, endFraction: 11 / 24 },
        { startFraction: 11 / 24, endFraction: 1 },
      ],
      CX,
      CY,
      R,
    );

    // Midnight is angle 0 (12 o'clock); 09:00 is 135°; no padding between bands.
    expect(arcs[0].startAngle).toBe(0);
    expect(arcs[1].startAngle).toBeCloseTo(135);
    expect(arcs[0].endAngle).toBeCloseTo(arcs[1].startAngle);
    expect(arcs[2].endAngle).toBeCloseTo(360);
  });

  test('a band spanning the whole day draws as a full circle', () => {
    const [arc] = ringArcsClock([{ startFraction: 0, endFraction: 1 }], CX, CY, R);
    expect(arc.startAngle).toBe(0);
    expect(arc.endAngle).toBe(360);
    expect(arc.path.match(/A /g)).toHaveLength(2);
  });

  test('rejects fractions outside [0,1] or that run backwards', () => {
    expect(() => ringArcsClock([{ startFraction: -0.1, endFraction: 0.5 }], CX, CY, R)).toThrow(RangeError);
    expect(() => ringArcsClock([{ startFraction: 0.5, endFraction: 1.5 }], CX, CY, R)).toThrow(RangeError);
    expect(() => ringArcsClock([{ startFraction: 0.6, endFraction: 0.4 }], CX, CY, R)).toThrow(RangeError);
  });
});
