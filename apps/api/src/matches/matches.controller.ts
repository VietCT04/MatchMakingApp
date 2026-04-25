import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { UpdateMatchDto } from './dto.update-match';
import { MatchQueryDto } from './dto.match-query';
import { VerifyResultDto } from './dto.verify-result';
import { RatingsService } from '../ratings/ratings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { CreateAuthenticatedMatchDto } from './dto.create-authenticated-match';
import { JoinAuthenticatedMatchDto } from './dto.join-authenticated-match';
import { SubmitAuthenticatedResultDto } from './dto.submit-authenticated-result';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly ratingsService: RatingsService,
  ) {}

  @Get()
  findAll(@Query() query: MatchQueryDto) {
    return this.matchesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAuthenticatedMatchDto) {
    return this.matchesService.createForUser(user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMatchDto) {
    return this.matchesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.matchesService.remove(id);
  }

  @Post(':id/participants')
  @UseGuards(JwtAuthGuard)
  addParticipant(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: JoinAuthenticatedMatchDto) {
    return this.matchesService.joinForUser(id, user.id, dto);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  join(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: JoinAuthenticatedMatchDto) {
    return this.matchesService.joinForUser(id, user.id, dto);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.matchesService.leaveForUser(id, user.id);
  }

  @Post(':id/results')
  @UseGuards(JwtAuthGuard)
  submitResult(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitAuthenticatedResultDto) {
    return this.matchesService.submitResultForUser(id, user.id, dto);
  }

  @Post(':id/results/:resultId/verify')
  @UseGuards(JwtAuthGuard)
  verifyResult(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('resultId') resultId: string,
    @Body() _dto: VerifyResultDto,
  ) {
    return this.ratingsService.verifyMatchResult(id, resultId, user.id);
  }
}
