import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserReportDto } from './dto.create-user-report';

describe('CreateUserReportDto', () => {
  it('requires report reason with minimum length', async () => {
    const dto = plainToInstance(CreateUserReportDto, {
      reportedUserId: '11111111-1111-4111-8111-111111111111',
      reason: 'bad',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'reason')).toBe(true);
  });
});
