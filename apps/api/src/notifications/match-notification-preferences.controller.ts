import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateMatchNotificationPreferenceDto } from './dto.update-match-notification-preference';
import { NotificationsService } from './notifications.service';

@Controller('matches/:id/notification-preference')
@UseGuards(JwtAuthGuard)
export class MatchNotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getPreference(@CurrentUser() user: AuthUser, @Param('id') matchId: string) {
    return this.notificationsService.getMatchNotificationPreference(user.id, matchId);
  }

  @Patch()
  updatePreference(
    @CurrentUser() user: AuthUser,
    @Param('id') matchId: string,
    @Body() dto: UpdateMatchNotificationPreferenceDto,
  ) {
    return this.notificationsService.updateMatchNotificationPreference(user.id, matchId, dto);
  }
}
