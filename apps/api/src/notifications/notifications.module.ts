import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { MatchNotificationPreferencesController } from './match-notification-preferences.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PushModule],
  controllers: [NotificationsController, NotificationPreferencesController, MatchNotificationPreferencesController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
