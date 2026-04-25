import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { RatingsModule } from '../ratings/ratings.module';
import { MatchLifecycleService } from './match-lifecycle.service';
import { MatchParticipationService } from './match-participation.service';
import { MatchQueryService } from './match-query.service';
import { MatchResultSubmissionService } from './match-result-submission.service';
import { MatchResultVerificationService } from './match-result-verification.service';

@Module({
  imports: [RatingsModule],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    MatchQueryService,
    MatchLifecycleService,
    MatchParticipationService,
    MatchResultSubmissionService,
    MatchResultVerificationService,
  ],
  exports: [MatchesService, MatchResultVerificationService],
})
export class MatchesModule {}
