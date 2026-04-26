import { Injectable, Logger } from '@nestjs/common';
import { MatchParticipantStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { RatingsService } from '../ratings/ratings.service';
import { MatchLifecycleService } from './match-lifecycle.service';

@Injectable()
export class MatchResultVerificationService {
  private readonly logger = new Logger(MatchResultVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingsService: RatingsService,
    private readonly reliabilityService: ReliabilityService,
    private readonly lifecycleService: MatchLifecycleService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async verify(matchId: string, resultId: string, verifierUserId: string) {
    const verificationOutcome = await this.ratingsService.verifyMatchResult(matchId, resultId, verifierUserId);
    await this.lifecycleService.setCompleted(matchId);

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        title: true,
        participants: {
          where: {
            status: MatchParticipantStatus.JOINED,
          },
          select: {
            userId: true,
          },
        },
      },
    });
    const joinedParticipants = match?.participants ?? [];

    await Promise.all(
      joinedParticipants.map((participant) =>
        this.reliabilityService.incrementCompletedMatch(participant.userId),
      ),
    );

    try {
      await this.notificationsService.createManyNotifications(
        joinedParticipants.map((participant) => ({
          userId: participant.userId,
          type: NotificationType.RESULT_VERIFIED,
          title: 'Result verified',
          body: 'Your match result was verified',
          data: {
            matchId,
            resultId: verificationOutcome.result.id,
            dedupeKey: `match:${matchId}:result-verified:${verificationOutcome.result.id}:user:${participant.userId}`,
          },
        })),
      );

      await this.notificationsService.createManyNotifications(
        verificationOutcome.ratingUpdates.map((update) => ({
          userId: update.userId,
          type: NotificationType.RATING_UPDATED,
          title: 'Rating updated',
          body: `Your rating changed by ${update.delta >= 0 ? `+${update.delta}` : update.delta}`,
          data: {
            matchId,
            sportId: update.sportId,
            oldRating: update.oldRating,
            newRating: update.newRating,
            delta: update.delta,
            dedupeKey: `match:${matchId}:rating-updated:user:${update.userId}:new:${update.newRating}`,
          },
        })),
      );
    } catch (notifyError) {
      this.logger.warn(
        `Failed to create verification notifications for ${match?.title ?? matchId}: ${
          notifyError instanceof Error ? notifyError.message : 'unknown error'
        }`,
      );
    }

    return verificationOutcome;
  }
}
