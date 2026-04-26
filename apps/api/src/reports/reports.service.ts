import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { CreateUserReportDto } from './dto.create-user-report';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reliabilityService: ReliabilityService,
  ) {}

  async createUserReport(reporterUserId: string, dto: CreateUserReportDto) {
    if (reporterUserId === dto.reportedUserId) {
      throw new BadRequestException('You cannot report yourself');
    }

    const reportedUser = await this.prisma.user.findUnique({ where: { id: dto.reportedUserId } });
    if (!reportedUser) {
      throw new NotFoundException('Reported user not found');
    }

    if (dto.matchId) {
      const reporterParticipation = await this.prisma.matchParticipant.findUnique({
        where: { matchId_userId: { matchId: dto.matchId, userId: reporterUserId } },
      });
      if (!reporterParticipation) {
        throw new BadRequestException('Reporter must be a participant in the match');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.userReport.create({
        data: {
          reportedUserId: dto.reportedUserId,
          reporterUserId,
          matchId: dto.matchId,
          reason: dto.reason.trim(),
          status: ReportStatus.OPEN,
        },
      });

      await this.reliabilityService.incrementReports(dto.reportedUserId, tx);

      return report;
    });
  }
}
