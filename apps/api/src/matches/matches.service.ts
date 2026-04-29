import { Injectable } from '@nestjs/common';
import { CreateMatchDto } from './dto.create-match';
import { JoinMatchDto } from './dto.join-match';
import { MatchQueryDto } from './dto.match-query';
import { SubmitResultDto } from './dto.submit-result';
import { UpdateMatchDto } from './dto.update-match';
import { MatchLifecycleService } from './match-lifecycle.service';
import { MatchDisputeService } from './match-dispute.service';
import { MatchParticipationService } from './match-participation.service';
import { MatchQueryService } from './match-query.service';
import { MatchResultSubmissionService } from './match-result-submission.service';
import { AuthUser } from '../auth/auth-user';
import { CreateDisputeDto } from './dto.create-dispute';

@Injectable()
export class MatchesService {
  constructor(
    private readonly queryService: MatchQueryService,
    private readonly lifecycleService: MatchLifecycleService,
    private readonly participationService: MatchParticipationService,
    private readonly disputeService: MatchDisputeService,
    private readonly resultSubmissionService: MatchResultSubmissionService,
  ) {}

  findAll(query: MatchQueryDto = {}, user?: AuthUser) {
    return this.queryService.findAll(query, user?.id);
  }

  findOne(id: string) {
    return this.queryService.findOne(id);
  }

  createForUser(userId: string, dto: CreateMatchDto) {
    return this.lifecycleService.createForUser(userId, dto);
  }

  updateForUser(id: string, user: AuthUser, dto: UpdateMatchDto) {
    return this.lifecycleService.updateForUser(id, user, dto);
  }

  removeForUser(id: string, user: AuthUser) {
    return this.lifecycleService.removeForUser(id, user);
  }

  joinForUser(matchId: string, userId: string, dto: JoinMatchDto) {
    return this.participationService.join(matchId, userId, dto);
  }

  leaveForUser(matchId: string, userId: string) {
    return this.participationService.leave(matchId, userId);
  }

  checkInForUser(matchId: string, userId: string) {
    return this.participationService.checkIn(matchId, userId);
  }

  getCheckInsForUser(matchId: string, user: AuthUser) {
    return this.participationService.getCheckIns(matchId, user.id, user.role);
  }

  markNoShow(matchId: string, participantId: string, actorUserId: string) {
    return this.participationService.markNoShow(matchId, participantId, actorUserId);
  }

  submitResultForUser(matchId: string, userId: string, dto: SubmitResultDto) {
    return this.resultSubmissionService.submit(matchId, userId, dto);
  }

  createDispute(matchId: string, resultId: string, userId: string, dto: CreateDisputeDto) {
    return this.disputeService.createDispute(matchId, resultId, userId, dto);
  }
}
