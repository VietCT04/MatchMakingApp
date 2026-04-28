import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  UpdateAvailabilityDto,
  UpdateMyProfileDto,
  UpdatePreferredVenuesDto,
  UpdateSportPreferencesDto,
} from './dto.preferences';
import { PreferencesService } from './preferences.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Patch('profile')
  updateMyProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateMyProfileDto) {
    return this.preferencesService.updateMyProfile(user.id, dto);
  }

  @Get('preferences')
  getMyPreferences(@CurrentUser() user: AuthUser) {
    return this.preferencesService.getMyPreferences(user.id);
  }

  @Patch('preferences/sports')
  updateSportPreferences(@CurrentUser() user: AuthUser, @Body() dto: UpdateSportPreferencesDto) {
    return this.preferencesService.updateSportPreferences(user.id, dto);
  }

  @Patch('preferences/venues')
  updatePreferredVenues(@CurrentUser() user: AuthUser, @Body() dto: UpdatePreferredVenuesDto) {
    return this.preferencesService.updatePreferredVenues(user.id, dto);
  }

  @Patch('preferences/availability')
  updateAvailability(@CurrentUser() user: AuthUser, @Body() dto: UpdateAvailabilityDto) {
    return this.preferencesService.updateAvailability(user.id, dto);
  }
}
