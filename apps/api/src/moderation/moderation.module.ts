import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReliabilityModule } from '../reliability/reliability.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [ReliabilityModule, NotificationsModule],
  controllers: [ModerationController],
  providers: [ModerationService, RolesGuard],
  exports: [ModerationService],
})
export class ModerationModule {}
