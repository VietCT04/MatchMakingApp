import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReliabilityService } from './reliability.service';

@Controller()
export class ReliabilityController {
  constructor(private readonly reliabilityService: ReliabilityService) {}

  @Get('users/:userId/reliability')
  getUserReliability(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.reliabilityService.toSummaryByUserId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/reliability')
  getMyReliability(@CurrentUser() user: AuthUser) {
    return this.reliabilityService.toSummaryByUserId(user.id);
  }
}
