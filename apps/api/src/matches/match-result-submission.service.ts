import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { MatchParticipantStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitResultDto } from './dto.submit-result';
import { MatchQueryService } from './match-query.service';

@Injectable()
export class MatchResultSubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: MatchQueryService,
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
      return await this.prisma.matchResult.create({
        data: {
          matchId,
          submittedByUserId,
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
}
