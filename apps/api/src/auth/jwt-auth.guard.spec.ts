import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CurrentUser } from './current-user.decorator';
import { AuthUser } from './auth-user';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';

@Controller('protected-test')
class ProtectedTestController {
  @UseGuards(JwtAuthGuard)
  @Get()
  getProtected(@CurrentUser() user: AuthUser) {
    return user;
  }
}

describe('JwtAuthGuard', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';

    const moduleRef = await Test.createTestingModule({
      controllers: [ProtectedTestController],
      providers: [
        JwtStrategy,
        {
          provide: JwtService,
          useValue: new JwtService({ secret: process.env.JWT_SECRET }),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    process.env.JWT_SECRET = originalSecret;
    await app.close();
  });

  it('rejects missing token', () => {
    return request(app.getHttpServer()).get('/protected-test').expect(401);
  });

  it('accepts a valid token', async () => {
    const token = jwtService.sign({
      sub: 'user-1',
      email: 'user@example.com',
      displayName: 'User One',
    });

    await request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: 'user-1',
          email: 'user@example.com',
          displayName: 'User One',
        });
      });
  });
});
