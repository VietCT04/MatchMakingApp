import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus, Prisma, SportFormat, Team } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto.create-match';
import { UpdateMatchDto } from './dto.update-match';
import { JoinMatchDto } from './dto.join-match';
import { MatchQueryDto } from './dto.match-query';
import { LeaveMatchDto } from './dto.leave-match';
import { SubmitResultDto } from './dto.submit-result';
import { CreateAuthenticatedMatchDto } from './dto.create-authenticated-match';
import { JoinAuthenticatedMatchDto } from './dto.join-authenticated-match';
import { SubmitAuthenticatedResultDto } from './dto.submit-authenticated-result';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: MatchQueryDto = {}) {
    this.validateRatingRange(query.minRating, query.maxRating);

    return this.prisma.match.findMany({
      where: {
        sportId: query.sportId,
        format: query.format as SportFormat | undefined,
        status: (query.status as MatchStatus | undefined) ?? MatchStatus.OPEN,
        venueId: query.venueId,
        minRating: query.minRating === undefined ? undefined : { gte: query.minRating },
        maxRating: query.maxRating === undefined ? undefined : { lte: query.maxRating },
        startsAt: {
          gte: query.startsAfter ? new Date(query.startsAfter) : undefined,
          lte: query.startsBefore ? new Date(query.startsBefore) : undefined,
        },
      },
      include: { participants: true, result: true, sport: true, venue: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: { participants: true, result: true, sport: true, venue: true },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  create(dto: CreateMatchDto) {
    this.validateRatingRange(dto.minRating, dto.maxRating);

    return this.prisma.match.create({
      data: {
        sportId: dto.sportId,
        venueId: dto.venueId,
        createdByUserId: dto.createdByUserId,
        title: dto.title,
        description: dto.description,
        format: dto.format as SportFormat,
        startsAt: new Date(dto.startsAt),
        status: (dto.status as MatchStatus | undefined) ?? MatchStatus.OPEN,
        maxPlayers: dto.maxPlayers,
        minRating: dto.minRating,
        maxRating: dto.maxRating,
      },
    });
  }

  createForUser(userId: string, dto: CreateAuthenticatedMatchDto) {
    return this.create({
      ...dto,
      createdByUserId: userId,
    });
  }

  async update(id: string, dto: UpdateMatchDto) {
    this.validateRatingRange(dto.minRating, dto.maxRating);
    await this.findOne(id);
    return this.prisma.match.update({
      where: { id },
      data: {
        sportId: dto.sportId,
        venueId: dto.venueId,
        createdByUserId: dto.createdByUserId,
        title: dto.title,
        description: dto.description,
        format: dto.format as SportFormat | undefined,
        status: dto.status as MatchStatus | undefined,
        maxPlayers: dto.maxPlayers,
        minRating: dto.minRating,
        maxRating: dto.maxRating,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.match.delete({ where: { id } });
    return { deleted: true };
  }

  async addParticipant(matchId: string, dto: JoinMatchDto) {
    return this.join(matchId, dto);
  }

  async join(matchId: string, dto: JoinMatchDto) {
    const match = await this.findOne(matchId);

    if (match.status === MatchStatus.CANCELLED || match.status === MatchStatus.COMPLETED) {
      throw new BadRequestException('Cannot join a cancelled or completed match');
    }

    const joinedParticipants = match.participants.filter(
      (participant) => participant.status === MatchParticipantStatus.JOINED,
    );

    if (joinedParticipants.some((participant) => participant.userId === dto.userId)) {
      throw new ConflictException('User already joined this match');
    }

    if (joinedParticipants.length >= match.maxPlayers) {
      throw new ConflictException('Match is full');
    }

    const participant = await this.prisma.matchParticipant.upsert({
      where: { matchId_userId: { matchId, userId: dto.userId } },
      update: {
        status: MatchParticipantStatus.JOINED,
        team: dto.team as Team,
      },
      create: {
        matchId,
        userId: dto.userId,
        status: MatchParticipantStatus.JOINED,
        team: dto.team as Team,
      },
    });

    if (joinedParticipants.length + 1 >= match.maxPlayers) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.FULL },
      });
    }

    return participant;
  }

  joinForUser(matchId: string, userId: string, dto: JoinAuthenticatedMatchDto) {
    return this.join(matchId, { userId, team: dto.team });
  }

  async leave(matchId: string, dto: LeaveMatchDto) {
    const match = await this.findOne(matchId);
    const participant = match.participants.find((item) => item.userId === dto.userId);

    if (!participant || participant.status !== MatchParticipantStatus.JOINED) {
      throw new NotFoundException('Joined participant not found');
    }

    const updatedParticipant = await this.prisma.matchParticipant.update({
      where: { id: participant.id },
      data: { status: MatchParticipantStatus.LEFT },
    });

    if (match.status === MatchStatus.FULL) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.OPEN },
      });
    }

    return updatedParticipant;
  }

  leaveForUser(matchId: string, userId: string) {
    return this.leave(matchId, { userId });
  }

  async submitResult(matchId: string, dto: SubmitResultDto) {
    const match = await this.findOne(matchId);
    const isParticipant = match.participants.some(
      (participant) =>
        participant.userId === dto.submittedByUserId &&
        participant.status === MatchParticipantStatus.JOINED,
    );

    if (!isParticipant) {
      throw new BadRequestException('Only joined participants can submit results');
    }

    try {
      return await this.prisma.matchResult.create({
        data: {
          matchId,
          submittedByUserId: dto.submittedByUserId,
          teamAScore: dto.teamAScore,
          teamBScore: dto.teamBScore,
          verified: false,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A result has already been submitted for this match');
      }
      throw error;
    }
  }

  submitResultForUser(matchId: string, userId: string, dto: SubmitAuthenticatedResultDto) {
    return this.submitResult(matchId, {
      submittedByUserId: userId,
      teamAScore: dto.teamAScore,
      teamBScore: dto.teamBScore,
    });
  }

  private validateRatingRange(minRating?: number, maxRating?: number): void {
    if (minRating !== undefined && maxRating !== undefined && minRating > maxRating) {
      throw new BadRequestException('minRating must be less than or equal to maxRating');
    }
  }
}
