import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, ReportStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { CreateUserReportDto } from './dto.create-user-report';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reliabilityService: ReliabilityService,
    private readonly notificationsService: NotificationsService,
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

    const report = await this.prisma.$transaction(async (tx) => {
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

    try {
      await this.notificationsService.createNotification(
        reporterUserId,
        NotificationType.REPORT_CREATED,
        'Report submitted',
        'Your report was submitted and is now open for review.',
        {
          reportId: report.id,
          matchId: report.matchId,
          dedupeKey: `report:${report.id}:reporter:${reporterUserId}`,
        },
      );
    } catch (notifyError) {
      this.logger.warn(
        `Failed to create report notification for reporter ${reporterUserId}: ${
          notifyError instanceof Error ? notifyError.message : 'unknown error'
        }`,
      );
    }

    return report;
  }
}
