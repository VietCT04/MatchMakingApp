import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { SportsModule } from './sports/sports.module';
import { MatchesModule } from './matches/matches.module';
import { RatingsModule } from './ratings/ratings.module';
import { VenuesModule } from './venues/venues.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    UsersModule,
    SportsModule,
    MatchesModule,
    RatingsModule,
    VenuesModule,
    AuthModule,
  ],
})
export class AppModule {}
