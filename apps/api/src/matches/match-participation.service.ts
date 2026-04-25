import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus } from '@prisma/client';
import { Team } from '@sports-matchmaking/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JoinMatchDto } from './dto.join-match';
import { MatchLifecycleService } from './match-lifecycle.service';
import { MatchQueryService } from './match-query.service';
import { toPrismaTeam } from './match-enum.mapper';

@Injectable()
export class MatchParticipationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: MatchQueryService,
    private readonly lifecycleService: MatchLifecycleService,
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

    if (match.status === MatchStatus.FULL) {
      await this.lifecycleService.setOpen(matchId);
    }

    return updatedParticipant;
  }
}
