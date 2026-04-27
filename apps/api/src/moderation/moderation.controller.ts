import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ModerationDisputesQueryDto } from './dto.moderation-disputes-query';
import { ModerationReportsQueryDto } from './dto.moderation-reports-query';
import { UpdateModerationNoShowDto } from './dto.update-moderation-no-show';
import { UpdateModerationDisputeDto } from './dto.update-moderation-dispute';
import { UpdateModerationReportDto } from './dto.update-moderation-report';
import { ModerationService } from './moderation.service';

@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('reports')
  getReports(@Query() query: ModerationReportsQueryDto) {
    return this.moderationService.getReports(query);
  }

  @Get('disputes')
  getDisputes(@Query() query: ModerationDisputesQueryDto) {
    return this.moderationService.getDisputes(query);
  }

  @Get('no-shows')
  getNoShows(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.moderationService.getNoShows(Number.isFinite(parsedLimit) ? parsedLimit : 50);
  }

  @Patch('reports/:id')
  updateReport(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateModerationReportDto,
  ) {
    return this.moderationService.updateReport(id, user.id, dto);
  }

  @Patch('disputes/:id')
  updateDispute(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateModerationDisputeDto,
  ) {
    return this.moderationService.updateDispute(id, user.id, dto);
  }

  @Patch('no-shows/:participantId')
  updateNoShow(
    @Param('participantId') participantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateModerationNoShowDto,
  ) {
    return this.moderationService.updateNoShow(participantId, user.id, dto);
  }
}
