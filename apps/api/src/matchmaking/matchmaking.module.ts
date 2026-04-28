import { Module } from '@nestjs/common';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { RatingsModule } from '../ratings/ratings.module';
import { ReliabilityModule } from '../reliability/reliability.module';

@Module({
  imports: [RatingsModule, ReliabilityModule, PreferencesModule, NotificationsModule],
  controllers: [MatchmakingController],
  providers: [MatchmakingService],
})
export class MatchmakingModule {}
