import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MatchQueryDto } from './dto.match-query';

describe('MatchQueryDto location validation', () => {
  it('rejects latitude outside valid range', async () => {
    const dto = plainToInstance(MatchQueryDto, { latitude: 91 });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'latitude')).toBe(true);
  });

  it('rejects longitude outside valid range', async () => {
    const dto = plainToInstance(MatchQueryDto, { longitude: 181 });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'longitude')).toBe(true);
  });

  it('rejects radiusKm when non-positive', async () => {
    const dto = plainToInstance(MatchQueryDto, { radiusKm: 0 });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'radiusKm')).toBe(true);
  });

  it('rejects radiusKm above max', async () => {
    const dto = plainToInstance(MatchQueryDto, { radiusKm: 101 });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'radiusKm')).toBe(true);
  });

  it('rejects invalid startsAfter date', async () => {
    const dto = plainToInstance(MatchQueryDto, { startsAfter: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'startsAfter')).toBe(true);
  });

  it('accepts ranked=true query flag', async () => {
    const dto = plainToInstance(MatchQueryDto, { ranked: 'true' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.ranked).toBe(true);
  });

  it('rejects invalid ranked value', async () => {
    const dto = plainToInstance(MatchQueryDto, { ranked: 'maybe' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'ranked')).toBe(true);
  });
});
