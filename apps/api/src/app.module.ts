import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { SportsModule } from './sports/sports.module';
import { MatchesModule } from './matches/matches.module';
import { RatingsModule } from './ratings/ratings.module';
import { VenuesModule } from './venues/venues.module';
import { AuthModule } from './auth/auth.module';
import { ReliabilityModule } from './reliability/reliability.module';
import { ReportsModule } from './reports/reports.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PushModule } from './push/push.module';
import { ModerationModule } from './moderation/moderation.module';
import { PreferencesModule } from './preferences/preferences.module';

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
    ReliabilityModule,
    ReportsModule,
    ChatModule,
    PushModule,
    NotificationsModule,
    ModerationModule,
    PreferencesModule,
  ],
})
export class AppModule {}
