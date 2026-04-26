import { calculateDistanceKm } from './haversine';

describe('calculateDistanceKm', () => {
  it('returns zero for identical coordinates', () => {
    const distance = calculateDistanceKm(1.35, 103.82, 1.35, 103.82);
    expect(distance).toBeCloseTo(0, 8);
  });

  it('calculates expected distance for one degree of latitude near the equator', () => {
    const distance = calculateDistanceKm(0, 0, 1, 0);
    expect(distance).toBeCloseTo(111.19, 1);
  });

  it('is symmetric', () => {
    const aToB = calculateDistanceKm(1.3002, 103.8519, 1.3521, 103.8198);
    const bToA = calculateDistanceKm(1.3521, 103.8198, 1.3002, 103.8519);
    expect(aToB).toBeCloseTo(bToA, 8);
  });
});
