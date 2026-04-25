import { Controller, Get, UseGuards } from '@nestjs/common';
import { RatingsService } from '../ratings/ratings.service';
import { AuthService } from './auth.service';
import { AuthUser } from './auth-user';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(
    private readonly authService: AuthService,
    private readonly ratingsService: RatingsService,
  ) {}

  @Get()
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.findMe(user.id);
  }

  @Get('ratings')
  getMyRatings(@CurrentUser() user: AuthUser) {
    return this.ratingsService.listUserRatings(user.id);
  }

  @Get('rating-history')
  getMyRatingHistory(@CurrentUser() user: AuthUser) {
    return this.ratingsService.listUserRatingHistory(user.id);
  }
}
