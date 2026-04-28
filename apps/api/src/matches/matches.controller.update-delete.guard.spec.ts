import { Controller, Delete, INestApplication, Patch, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy } from '../auth/jwt.strategy';

@Controller('matches')
class MatchesGuardTestController {
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@CurrentUser() user: { id: string }) {
    return { ok: true, userId: user.id };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: { id: string }) {
    return { ok: true, userId: user.id };
  }
}

describe('Matches update/delete guard', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';

    const moduleRef = await Test.createTestingModule({
      controllers: [MatchesGuardTestController],
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

  it('unauthenticated user cannot PATCH match', () => {
    return request(app.getHttpServer()).patch('/matches/match-1').send({ title: 'x' }).expect(401);
  });

  it('unauthenticated user cannot DELETE match', () => {
    return request(app.getHttpServer()).delete('/matches/match-1').expect(401);
  });

  it('authenticated user can PATCH match', async () => {
    const token = jwtService.sign({
      sub: 'creator-1',
      email: 'creator@example.com',
      role: 'USER',
      displayName: 'Creator',
    });

    await request(app.getHttpServer())
      .patch('/matches/match-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'updated' })
      .expect(200);
  });

  it('authenticated user can DELETE match', async () => {
    const token = jwtService.sign({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      displayName: 'Admin',
    });

    await request(app.getHttpServer())
      .delete('/matches/match-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
