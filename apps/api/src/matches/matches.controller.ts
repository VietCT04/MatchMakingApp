import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto.create-match';
import { UpdateMatchDto } from './dto.update-match';
import { JoinMatchDto } from './dto.join-match';
import { MatchQueryDto } from './dto.match-query';
import { LeaveMatchDto } from './dto.leave-match';
import { SubmitResultDto } from './dto.submit-result';
import { VerifyResultDto } from './dto.verify-result';
import { RatingsService } from '../ratings/ratings.service';

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
  create(@Body() dto: CreateMatchDto) {
    return this.matchesService.create(dto);
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
  addParticipant(@Param('id') id: string, @Body() dto: JoinMatchDto) {
    return this.matchesService.addParticipant(id, dto);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @Body() dto: JoinMatchDto) {
    return this.matchesService.join(id, dto);
  }

  @Post(':id/leave')
  leave(@Param('id') id: string, @Body() dto: LeaveMatchDto) {
    return this.matchesService.leave(id, dto);
  }

  @Post(':id/results')
  submitResult(@Param('id') id: string, @Body() dto: SubmitResultDto) {
    return this.matchesService.submitResult(id, dto);
  }

  @Post(':id/results/:resultId/verify')
  verifyResult(@Param('id') id: string, @Param('resultId') resultId: string, @Body() _dto: VerifyResultDto) {
    return this.ratingsService.verifyMatchResult(id, resultId);
  }
}
