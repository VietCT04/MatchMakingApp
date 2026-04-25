import { Injectable } from '@nestjs/common';
import { RatingsService } from '../ratings/ratings.service';
import { MatchLifecycleService } from './match-lifecycle.service';

@Injectable()
export class MatchResultVerificationService {
  constructor(
    private readonly ratingsService: RatingsService,
    private readonly lifecycleService: MatchLifecycleService,
  ) {}

  async verify(matchId: string, resultId: string, verifierUserId: string) {
    const verificationOutcome = await this.ratingsService.verifyMatchResult(matchId, resultId, verifierUserId);
    await this.lifecycleService.setCompleted(matchId);
    return verificationOutcome;
  }
}
