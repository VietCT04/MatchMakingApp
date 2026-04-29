import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CheckInMethod, MatchParticipantStatus, MatchStatus, NotificationType, UserRole } from '@prisma/client';
import { Team } from '@sports-matchmaking/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { JoinMatchDto } from './dto.join-match';
import { MatchLifecycleService } from './match-lifecycle.service';
import { MatchQueryService } from './match-query.service';
import { toPrismaTeam } from './match-enum.mapper';

@Injectable()
export class MatchParticipationService {
  private readonly logger = new Logger(MatchParticipationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: MatchQueryService,
    private readonly lifecycleService: MatchLifecycleService,
    private readonly reliabilityService: ReliabilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async join(matchId: string, userId: string, dto: JoinMatchDto) {
    const match = await this.queryService.findOne(matchId);

    if (match.status === MatchStatus.CANCELLED || match.status === MatchStatus.COMPLETED) {
      throw new BadRequestException('Cannot join a cancelled or completed match');
    }

    const joinedParticipants = match.participants.filter(
      (participant) => participant.status === MatchParticipantStatus.JOINED,
    );

    if (joinedParticipants.some((participant) => participant.userId === userId)) {
      throw new ConflictException('User already joined this match');
    }

    if (joinedParticipants.length >= match.maxPlayers) {
      throw new ConflictException('Match is full');
    }

    const selectedTeam = dto.team ?? Team.UNKNOWN;
    const participant = await this.prisma.matchParticipant.upsert({
      where: { matchId_userId: { matchId, userId } },
      update: {
        status: MatchParticipantStatus.JOINED,
        team: toPrismaTeam(selectedTeam),
      },
      create: {
        matchId,
        userId,
        status: MatchParticipantStatus.JOINED,
        team: toPrismaTeam(selectedTeam),
      },
    });

    if (joinedParticipants.length + 1 >= match.maxPlayers) {
      await this.lifecycleService.setFull(matchId);
    }

    if (match.createdByUserId !== userId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true },
        });
        const displayName = user?.displayName ?? 'A player';
        await this.notificationsService.createNotification(
          match.createdByUserId,
          NotificationType.MATCH_JOINED,
          'New player joined',
          `${displayName} joined ${match.title}`,
          {
            matchId,
            userId,
            dedupeKey: `match:${matchId}:join:${userId}`,
          },
        );
      } catch (error) {
        this.logger.warn(`Failed to create join notification: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    return participant;
  }

  async leave(matchId: string, userId: string) {
    const match = await this.queryService.findOne(matchId);
    const participant = match.participants.find((item) => item.userId === userId);

    if (!participant || participant.status !== MatchParticipantStatus.JOINED) {
      throw new NotFoundException('Joined participant not found');
    }

    const updatedParticipant = await this.prisma.matchParticipant.update({
      where: { id: participant.id },
      data: { status: MatchParticipantStatus.LEFT },
    });

    const millisUntilStart = match.startsAt.getTime() - Date.now();
    // TODO: The 2-hour late cancellation threshold is an MVP rule and may change later.
    const isLateCancellation = millisUntilStart > 0 && millisUntilStart <= 2 * 60 * 60 * 1000;
    if (match.status !== MatchStatus.COMPLETED && match.status !== MatchStatus.CANCELLED) {
      await this.reliabilityService.incrementCancellation(userId, isLateCancellation);
    }

    if (match.status === MatchStatus.FULL) {
      await this.lifecycleService.setOpen(matchId);
    }

    if (match.createdByUserId !== userId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true },
        });
        const displayName = user?.displayName ?? 'A player';
        await this.notificationsService.createNotification(
          match.createdByUserId,
          NotificationType.MATCH_LEFT,
          'Player left match',
          `${displayName} left ${match.title}`,
          {
            matchId,
            userId,
            dedupeKey: `match:${matchId}:left:${userId}`,
          },
        );
      } catch (error) {
        this.logger.warn(`Failed to create leave notification: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    return updatedParticipant;
  }

  async markNoShow(matchId: string, participantId: string, actorUserId: string) {
    const match = await this.queryService.findOne(matchId);
    if (match.createdByUserId !== actorUserId) {
      throw new ForbiddenException('Only match creator can mark no-shows');
    }
    if (match.startsAt.getTime() > Date.now()) {
      throw new BadRequestException('Cannot mark no-show before match starts');
    }

    const participant = match.participants.find((item) => item.id === participantId);
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }
    if (participant.userId === actorUserId) {
      throw new BadRequestException('Cannot mark yourself as no-show');
    }
    if (participant.status === MatchParticipantStatus.NO_SHOW) {
      throw new ConflictException('Participant is already marked as no-show');
    }
    if (participant.status !== MatchParticipantStatus.JOINED) {
      throw new BadRequestException('Only joined participants can be marked as no-show');
    }
    if (participant.checkedInAt) {
      throw new BadRequestException('Participant has already checked in.');
    }

    const updatedParticipant = await this.prisma.$transaction(async (tx) => {
      const updatedParticipant = await tx.matchParticipant.update({
        where: { id: participant.id },
        data: { status: MatchParticipantStatus.NO_SHOW },
      });
      await this.reliabilityService.incrementNoShow(participant.userId, tx);
      return updatedParticipant;
    });

    try {
      await this.notificationsService.createNotification(
        participant.userId,
        NotificationType.NO_SHOW_MARKED,
        'Marked as no-show',
        `You were marked as no-show for ${match.title}`,
        {
          matchId,
          dedupeKey: `match:${matchId}:no-show:${participant.id}`,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to create no-show notification: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    return updatedParticipant;
  }

  async checkIn(matchId: string, userId: string) {
    const match = await this.queryService.findOne(matchId);
    if (match.status === MatchStatus.CANCELLED || match.status === MatchStatus.COMPLETED) {
      throw new BadRequestException('Cannot check in for cancelled or completed match');
    }

    const now = new Date();
    const opensAt = new Date(match.startsAt.getTime() - 60 * 60 * 1000);
    const closesAt = new Date(match.startsAt.getTime() + 60 * 60 * 1000);
    if (now < opensAt) {
      throw new BadRequestException('Check-in has not opened yet');
    }
    if (now > closesAt) {
      throw new BadRequestException('Check-in window is closed');
    }

    const participant = match.participants.find((item) => item.userId === userId);
    if (!participant || participant.status !== MatchParticipantStatus.JOINED) {
      throw new ForbiddenException('Only joined participants can check in');
    }
    if (participant.checkedInAt) {
      return {
        matchId,
        userId,
        checkedInAt: participant.checkedInAt,
        checkInMethod: participant.checkInMethod ?? CheckInMethod.MANUAL,
      };
    }

    const checkedInAt = new Date();
    const updated = await this.prisma.matchParticipant.update({
      where: { id: participant.id },
      data: {
        checkedInAt,
        checkInMethod: CheckInMethod.MANUAL,
      },
      select: {
        userId: true,
        checkedInAt: true,
        checkInMethod: true,
      },
    });

    if (match.createdByUserId !== userId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true },
        });
        const displayName = user?.displayName ?? 'A player';
        await this.notificationsService.createNotification(
          match.createdByUserId,
          NotificationType.SYSTEM,
          'Player checked in',
          `${displayName} checked in for ${match.title}`,
          {
            matchId,
            userId,
            dedupeKey: `match:${matchId}:check-in:${userId}`,
          },
        );
      } catch (error) {
        this.logger.warn(`Failed to create check-in notification: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    return {
      matchId,
      userId: updated.userId,
      checkedInAt: updated.checkedInAt,
      checkInMethod: updated.checkInMethod ?? CheckInMethod.MANUAL,
    };
  }

  async getCheckIns(matchId: string, actorUserId: string, actorRole: UserRole) {
    const match = await this.queryService.findOne(matchId);
    const isCreator = match.createdByUserId === actorUserId;
    const isParticipant = match.participants.some((item) => item.userId === actorUserId);
    const isPrivileged = actorRole === UserRole.ADMIN || actorRole === UserRole.MODERATOR;
    if (!isCreator && !isParticipant && !isPrivileged) {
      throw new ForbiddenException('Not allowed to view match check-ins');
    }

    const opensAt = new Date(match.startsAt.getTime() - 60 * 60 * 1000);
    const closesAt = new Date(match.startsAt.getTime() + 60 * 60 * 1000);
    const now = Date.now();

    return {
      matchId: match.id,
      checkInOpen: now >= opensAt.getTime() && now <= closesAt.getTime(),
      checkInWindow: {
        opensAt,
        closesAt,
      },
      participants: match.participants.map((participant) => ({
        participantId: participant.id,
        userId: participant.userId,
        displayName: participant.displayName?.trim() || `Player ${participant.userId.slice(0, 8)}`,
        team: participant.team,
        status: participant.status,
        checkedInAt: participant.checkedInAt ?? null,
      })),
    };
  }
}
