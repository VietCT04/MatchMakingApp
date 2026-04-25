import 'dotenv/config';
import { PrismaClient, SportFormat, MatchStatus, Team, MatchParticipantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const demoUsers = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'alex@example.com',
    displayName: 'Alex Tan',
    bio: 'Badminton doubles regular',
    homeLocationText: 'Central',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'maya@example.com',
    displayName: 'Maya Lee',
    bio: 'Pickleball beginner',
    homeLocationText: 'East',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'sam@example.com',
    displayName: 'Sam Wong',
    bio: 'Tennis singles player',
    homeLocationText: 'West',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'nina@example.com',
    displayName: 'Nina Koh',
    bio: 'Flexible racket sports partner',
    homeLocationText: 'North',
  },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('password123', 10);
  const sports = await Promise.all(
    ['badminton', 'pickleball', 'tennis'].map((name) =>
      prisma.sport.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const venues = await Promise.all([
    prisma.venue.upsert({
      where: { id: 'venue-central-sports-hall' },
      update: {},
      create: {
        id: 'venue-central-sports-hall',
        name: 'Central Sports Hall',
        address: '100 Stadium Road',
        latitude: 1.3048,
        longitude: 103.8318,
      },
    }),
    prisma.venue.upsert({
      where: { id: 'venue-riverside-racket-club' },
      update: {},
      create: {
        id: 'venue-riverside-racket-club',
        name: 'Riverside Racket Club',
        address: '22 River Valley Court',
        latitude: 1.2921,
        longitude: 103.8419,
      },
    }),
    prisma.venue.upsert({
      where: { id: 'venue-eastside-community-courts' },
      update: {},
      create: {
        id: 'venue-eastside-community-courts',
        name: 'Eastside Community Courts',
        address: '8 Marine Parade Road',
        latitude: 1.302,
        longitude: 103.9049,
      },
    }),
  ]);

  const users = await Promise.all(
    demoUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          displayName: user.displayName,
          bio: user.bio,
          homeLocationText: user.homeLocationText,
          passwordHash,
        },
        create: { ...user, passwordHash },
      }),
    ),
  );

  for (const user of users) {
    for (const sport of sports) {
      for (const format of [SportFormat.SINGLES, SportFormat.DOUBLES]) {
        await prisma.userSportRating.upsert({
          where: { userId_sportId_format: { userId: user.id, sportId: sport.id, format } },
          update: {},
          create: {
            userId: user.id,
            sportId: sport.id,
            format,
            rating: 1200,
            gamesPlayed: 0,
            uncertainty: 350,
          },
        });
      }
    }
  }

  const badminton = sports.find((sport) => sport.name === 'badminton')!;
  const pickleball = sports.find((sport) => sport.name === 'pickleball')!;
  const tennis = sports.find((sport) => sport.name === 'tennis')!;

  await Promise.all([
    prisma.match.upsert({
      where: { id: 'match-badminton-doubles-demo' },
      update: {},
      create: {
        id: 'match-badminton-doubles-demo',
        sportId: badminton.id,
        venueId: venues[0].id,
        createdByUserId: users[0].id,
        title: 'Saturday Badminton Doubles',
        description: 'Intermediate friendly doubles session.',
        format: SportFormat.DOUBLES,
        status: MatchStatus.OPEN,
        startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        maxPlayers: 4,
        minRating: 1000,
        maxRating: 1500,
        participants: {
          create: [
            { userId: users[0].id, status: MatchParticipantStatus.JOINED, team: Team.A },
            { userId: users[1].id, status: MatchParticipantStatus.JOINED, team: Team.B },
          ],
        },
      },
    }),
    prisma.match.upsert({
      where: { id: 'match-pickleball-open-demo' },
      update: {},
      create: {
        id: 'match-pickleball-open-demo',
        sportId: pickleball.id,
        venueId: venues[1].id,
        createdByUserId: users[1].id,
        title: 'Pickleball Starter Game',
        description: 'Beginner-friendly open play.',
        format: SportFormat.DOUBLES,
        status: MatchStatus.OPEN,
        startsAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
        maxPlayers: 4,
      },
    }),
    prisma.match.upsert({
      where: { id: 'match-tennis-singles-demo' },
      update: {},
      create: {
        id: 'match-tennis-singles-demo',
        sportId: tennis.id,
        venueId: venues[2].id,
        createdByUserId: users[2].id,
        title: 'Tennis Singles Hit',
        description: 'One-set singles match.',
        format: SportFormat.SINGLES,
        status: MatchStatus.OPEN,
        startsAt: new Date(Date.now() + 1000 * 60 * 60 * 72),
        maxPlayers: 2,
      },
    }),
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
