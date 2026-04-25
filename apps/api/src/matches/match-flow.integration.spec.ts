import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MatchStatus, SportFormat as PrismaSportFormat } from '@prisma/client';
import { SportFormat, Team } from '@sports-matchmaking/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RatingsService } from '../ratings/ratings.service';
import { MatchesService } from './matches.service';
import { SubmitResultDto } from './dto.submit-result';

const sportId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const venueId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userAId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const userBId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const userCId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

describe('MVP match flow integration', () => {
  const prisma = new PrismaService();
  const matchesService = new MatchesService(prisma);
  const ratingsService = new RatingsService(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanup();
    await seedBaseData();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('creates a match, joins users, verifies result, updates ratings, and writes rating history', async () => {
    const match = await createOpenMatch('ffffffff-ffff-4fff-8fff-ffffffffffff', 4);

    await matchesService.join(match.id, { userId: userAId, team: Team.A });
    await matchesService.join(match.id, { userId: userBId, team: Team.B });
    const result = await matchesService.submitResult(match.id, {
      submittedByUserId: userAId,
      teamAScore: 21,
      teamBScore: 15,
    });

    await ratingsService.verifyMatchResult(match.id, result.id, userBId);

    const completedMatch = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    const ratingA = await getRating(userAId);
    const ratingB = await getRating(userBId);
    const history = await prisma.ratingHistory.findMany({ where: { matchId: match.id } });

    expect(completedMatch.status).toBe(MatchStatus.COMPLETED);
    expect(ratingA.rating).toBeGreaterThan(1200);
    expect(ratingB.rating).toBeLessThan(1200);
    expect(history).toHaveLength(2);
  });

  it('rejects duplicate join', async () => {
    const match = await createOpenMatch('11111111-1111-4111-8111-111111111111', 4);

    await matchesService.join(match.id, { userId: userAId, team: Team.A });

    await expect(matchesService.join(match.id, { userId: userAId, team: Team.A })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects joining a full match', async () => {
    const match = await createOpenMatch('22222222-2222-4222-8222-222222222222', 2);

    await matchesService.join(match.id, { userId: userAId, team: Team.A });
    await matchesService.join(match.id, { userId: userBId, team: Team.B });

    await expect(matchesService.join(match.id, { userId: userCId, team: Team.A })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects joining a completed match', async () => {
    const match = await createOpenMatch('33333333-3333-4333-8333-333333333333', 4);
    await prisma.match.update({ where: { id: match.id }, data: { status: MatchStatus.COMPLETED } });

    await expect(matchesService.join(match.id, { userId: userAId, team: Team.A })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects verifying a result twice', async () => {
    const match = await createOpenMatch('44444444-4444-4444-8444-444444444444', 4);

    await matchesService.join(match.id, { userId: userAId, team: Team.A });
    await matchesService.join(match.id, { userId: userBId, team: Team.B });
    const result = await matchesService.submitResult(match.id, {
      submittedByUserId: userAId,
      teamAScore: 21,
      teamBScore: 15,
    });

    await ratingsService.verifyMatchResult(match.id, result.id, userBId);

    await expect(ratingsService.verifyMatchResult(match.id, result.id, userBId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid negative scores through DTO validation', async () => {
    const dto = plainToInstance(SubmitResultDto, {
      submittedByUserId: userAId,
      teamAScore: -1,
      teamBScore: 15,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'teamAScore')).toBe(true);
  });

  async function seedBaseData() {
    await prisma.sport.create({
      data: { id: sportId, name: 'integration-badminton' },
    });
    await prisma.venue.create({
      data: {
        id: venueId,
        name: 'Integration Court',
        address: '1 Test Street',
      },
    });
    await prisma.user.createMany({
      data: [
        { id: userAId, email: 'integration-a@example.com', displayName: 'Integration A' },
        { id: userBId, email: 'integration-b@example.com', displayName: 'Integration B' },
        { id: userCId, email: 'integration-c@example.com', displayName: 'Integration C' },
      ],
    });
    await prisma.userSportRating.createMany({
      data: [userAId, userBId, userCId].map((userId) => ({
        userId,
        sportId,
        format: PrismaSportFormat.DOUBLES,
        rating: 1200,
        gamesPlayed: 0,
        uncertainty: 350,
      })),
    });
  }

  async function createOpenMatch(id: string, maxPlayers: number) {
    return matchesService.create({
      sportId,
      venueId,
      createdByUserId: userAId,
      title: `Integration Match ${id}`,
      format: SportFormat.DOUBLES,
      startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      maxPlayers,
      minRating: 1000,
      maxRating: 1600,
    });
  }

  async function getRating(userId: string) {
    return prisma.userSportRating.findUniqueOrThrow({
      where: {
        userId_sportId_format: {
          userId,
          sportId,
          format: PrismaSportFormat.DOUBLES,
        },
      },
    });
  }

  async function cleanup() {
    const matchIds = [
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
    ];

    await prisma.ratingHistory.deleteMany({ where: { OR: [{ matchId: { in: matchIds } }, { userId: { in: [userAId, userBId, userCId] } }] } });
    await prisma.matchResult.deleteMany({ where: { matchId: { in: matchIds } } });
    await prisma.matchParticipant.deleteMany({ where: { OR: [{ matchId: { in: matchIds } }, { userId: { in: [userAId, userBId, userCId] } }] } });
    await prisma.match.deleteMany({ where: { OR: [{ id: { in: matchIds } }, { sportId }] } });
    await prisma.userSportRating.deleteMany({ where: { OR: [{ sportId }, { userId: { in: [userAId, userBId, userCId] } }] } });
    await prisma.venue.deleteMany({ where: { id: venueId } });
    await prisma.sport.deleteMany({ where: { id: sportId } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId, userCId] } } });
  }
});
