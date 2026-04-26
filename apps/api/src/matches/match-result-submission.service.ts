import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { MatchParticipantStatus, NotificationType, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitResultDto } from './dto.submit-result';
import { MatchQueryService } from './match-query.service';

@Injectable()
export class MatchResultSubmissionService {
  private readonly logger = new Logger(MatchResultSubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: MatchQueryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async submit(matchId: string, submittedByUserId: string, dto: SubmitResultDto) {
    const match = await this.queryService.findOne(matchId);
    const isParticipant = match.participants.some(
      (participant) =>
        participant.userId === submittedByUserId &&
        participant.status === MatchParticipantStatus.JOINED,
    );

    if (!isParticipant) {
      throw new BadRequestException('Only joined participants can submit results');
    }

    try {
      const result = await this.prisma.matchResult.create({
        data: {
          matchId,
          submittedByUserId,
          teamAScore: dto.teamAScore,
          teamBScore: dto.teamBScore,
          verified: false,
        },
      });

      try {
        const recipients = match.participants
          .filter(
            (participant) =>
              participant.status === MatchParticipantStatus.JOINED &&
              participant.userId !== submittedByUserId,
          )
          .map((participant) => participant.userId);
        await this.notificationsService.createManyNotifications(
          recipients.map((recipientUserId) => ({
            userId: recipientUserId,
            type: NotificationType.RESULT_SUBMITTED,
            title: 'Result needs verification',
            body: `A result was submitted for ${match.title}`,
            data: {
              matchId,
              resultId: result.id,
              dedupeKey: `match:${matchId}:result-submitted:${result.id}:user:${recipientUserId}`,
            },
          })),
        );
      } catch (notifyError) {
        this.logger.warn(
          `Failed to create result-submitted notifications: ${
            notifyError instanceof Error ? notifyError.message : 'unknown error'
          }`,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A result has already been submitted for this match');
      }
      throw error;
    }
  }
}
