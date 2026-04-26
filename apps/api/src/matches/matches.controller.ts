import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { UpdateMatchDto } from './dto.update-match';
import { MatchQueryDto } from './dto.match-query';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { CreateMatchDto } from './dto.create-match';
import { JoinMatchDto } from './dto.join-match';
import { SubmitResultDto } from './dto.submit-result';
import { MatchResultVerificationService } from './match-result-verification.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly verificationService: MatchResultVerificationService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Query() query: MatchQueryDto, @CurrentUser() user?: AuthUser) {
    return this.matchesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMatchDto) {
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

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  join(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: JoinMatchDto) {
    return this.matchesService.joinForUser(id, user.id, dto);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.matchesService.leaveForUser(id, user.id);
  }

  @Post(':id/results')
  @UseGuards(JwtAuthGuard)
  submitResult(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitResultDto) {
    return this.matchesService.submitResultForUser(id, user.id, dto);
  }

  @Post(':id/results/:resultId/verify')
  @UseGuards(JwtAuthGuard)
  verifyResult(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('resultId') resultId: string,
  ) {
    return this.verificationService.verify(id, resultId, user.id);
  }
}
