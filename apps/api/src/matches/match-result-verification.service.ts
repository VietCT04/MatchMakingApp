import { Injectable } from '@nestjs/common';
import { MatchParticipantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { RatingsService } from '../ratings/ratings.service';
import { MatchLifecycleService } from './match-lifecycle.service';

@Injectable()
export class MatchResultVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingsService: RatingsService,
    private readonly reliabilityService: ReliabilityService,
    private readonly lifecycleService: MatchLifecycleService,
  ) {}

  async verify(matchId: string, resultId: string, verifierUserId: string) {
    const verificationOutcome = await this.ratingsService.verifyMatchResult(matchId, resultId, verifierUserId);
    await this.lifecycleService.setCompleted(matchId);

    const joinedParticipants = await this.prisma.matchParticipant.findMany({
      where: {
        matchId,
        status: MatchParticipantStatus.JOINED,
      },
    });
    await Promise.all(
      joinedParticipants.map((participant) =>
        this.reliabilityService.incrementCompletedMatch(participant.userId),
      ),
    );

    return verificationOutcome;
  }
}
