import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  function createService(existingUser: any = null) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(existingUser),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'user-1',
            email: data.email,
            role: data.role ?? 'USER',
            displayName: data.displayName,
            passwordHash: data.passwordHash,
          }),
        ),
      },
    };
    const jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };

    return {
      prisma,
      jwtService,
      service: new AuthService(prisma as any, jwtService as any),
    };
  }

  it('registers a user with a hashed password', async () => {
    const { prisma, service } = createService();

    const response = await service.register({
      email: 'new@example.com',
      password: 'password123',
      displayName: 'New User',
    });

    const createArgs = prisma.user.create.mock.calls[0][0];
    expect(response.accessToken).toBe('signed-token');
    expect(createArgs.data.passwordHash).not.toBe('password123');
    await expect(bcrypt.compare('password123', createArgs.data.passwordHash)).resolves.toBe(true);
  });

  it('rejects duplicate registration', async () => {
    const { service } = createService({ id: 'user-1', email: 'taken@example.com' });

    await expect(
      service.register({ email: 'taken@example.com', password: 'password123', displayName: 'Taken' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with a correct password', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    const { service } = createService({
      id: 'user-1',
      email: 'login@example.com',
      role: 'USER',
      displayName: 'Login User',
      passwordHash,
    });

    const response = await service.login({ email: 'login@example.com', password: 'password123' });

    expect(response.accessToken).toBe('signed-token');
    expect(response.user.email).toBe('login@example.com');
  });

  it('rejects wrong password with a safe error', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    const { service } = createService({
      id: 'user-1',
      email: 'login@example.com',
      role: 'USER',
      displayName: 'Login User',
      passwordHash,
    });

    await expect(service.login({ email: 'login@example.com', password: 'wrongpass' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
