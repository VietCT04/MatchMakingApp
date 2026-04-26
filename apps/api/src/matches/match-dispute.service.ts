import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DisputeStatus, MatchParticipantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { CreateDisputeDto } from './dto.create-dispute';

@Injectable()
export class MatchDisputeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reliabilityService: ReliabilityService,
  ) {}

  async createDispute(matchId: string, resultId: string, createdByUserId: string, dto: CreateDisputeDto) {
    const matchResult = await this.prisma.matchResult.findUnique({
      where: { id: resultId },
      include: { match: true },
    });
    if (!matchResult || matchResult.matchId !== matchId) {
      throw new NotFoundException('Match result not found');
    }

    const joinedParticipant = await this.prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId: createdByUserId } },
    });
    if (!joinedParticipant || joinedParticipant.status !== MatchParticipantStatus.JOINED) {
      throw new BadRequestException('Only joined participants can dispute this result');
    }

    const existingDispute = await this.prisma.matchResultDispute.findUnique({
      where: {
        matchResultId_createdByUserId: {
          matchResultId: resultId,
          createdByUserId,
        },
      },
    });
    if (existingDispute) {
      throw new ConflictException('Duplicate dispute is not allowed');
    }

    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.matchResultDispute.create({
        data: {
          matchResultId: resultId,
          matchId,
          createdByUserId,
          reason: dto.reason.trim(),
          status: DisputeStatus.OPEN,
        },
      });

      // MVP limitation: ownership of disputed fault is ambiguous with current model.
      // We increment dispute count for dispute creator only until moderation rules are introduced.
      await this.reliabilityService.incrementDisputedResults(createdByUserId, tx);

      return dispute;
    });
  }
}
