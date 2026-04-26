import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateNotificationPreferencesDto } from './dto.update-notification-preferences';
import { NotificationsService } from './notifications.service';

@Controller('me/notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getNotificationPreferences(user.id);
  }

  @Patch()
  updatePreferences(@CurrentUser() user: AuthUser, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.notificationsService.updateNotificationPreferences(user.id, dto);
  }
}
