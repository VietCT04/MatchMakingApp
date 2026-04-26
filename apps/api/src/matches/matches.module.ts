import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { RatingsModule } from '../ratings/ratings.module';
import { MatchLifecycleService } from './match-lifecycle.service';
import { MatchParticipationService } from './match-participation.service';
import { MatchQueryService } from './match-query.service';
import { MatchResultSubmissionService } from './match-result-submission.service';
import { MatchResultVerificationService } from './match-result-verification.service';
import { MatchRankingService } from './match-ranking.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ReliabilityModule } from '../reliability/reliability.module';
import { MatchDisputeService } from './match-dispute.service';

@Module({
  imports: [RatingsModule, ReliabilityModule],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    MatchQueryService,
    MatchRankingService,
    MatchLifecycleService,
    MatchParticipationService,
    MatchDisputeService,
    MatchResultSubmissionService,
    MatchResultVerificationService,
    OptionalJwtAuthGuard,
  ],
  exports: [MatchesService, MatchResultVerificationService],
})
export class MatchesModule {}
