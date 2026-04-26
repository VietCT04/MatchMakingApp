import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDisputeDto } from './dto.create-dispute';

describe('CreateDisputeDto', () => {
  it('requires dispute reason with minimum length', async () => {
    const dto = plainToInstance(CreateDisputeDto, { reason: 'no' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'reason')).toBe(true);
  });
});
