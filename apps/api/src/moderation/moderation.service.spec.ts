import { BadRequestException } from '@nestjs/common';
import {
  DisputeStatus,
  MatchParticipantStatus,
  NotificationType,
  ReportStatus,
} from '@prisma/client';
import { ModerationService } from './moderation.service';
import { ModerationNoShowAction } from './dto.update-moderation-no-show';

describe('ModerationService', () => {
  function createService() {
    const tx = {
      userReport: { update: jest.fn() },
      matchResultDispute: { update: jest.fn() },
      matchParticipant: { update: jest.fn() },
      moderationAction: { create: jest.fn() },
    };

    const prisma = {
      userReport: { findUnique: jest.fn(), findMany: jest.fn() },
      matchResultDispute: { findUnique: jest.fn(), findMany: jest.fn() },
      matchParticipant: { findUnique: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const reliabilityService = {
      decrementReports: jest.fn(),
      decrementDisputedResults: jest.fn(),
      decrementNoShow: jest.fn(),
    };

    const notificationsService = {
      createNotification: jest.fn(),
    };

    return {
      tx,
      prisma,
      reliabilityService,
      notificationsService,
      service: new ModerationService(
        prisma as any,
        reliabilityService as any,
        notificationsService as any,
      ),
    };
  }

  it('dismissed report decrements report count, creates audit row, and notifies reporter', async () => {
    const { service, prisma, tx, reliabilityService, notificationsService } = createService();
    prisma.userReport.findUnique.mockResolvedValue({
      id: 'report-1',
      status: ReportStatus.OPEN,
      reportedUserId: 'reported-1',
      reporterUserId: 'reporter-1',
      matchId: 'match-1',
    });
    tx.userReport.update.mockResolvedValue({ id: 'report-1', status: ReportStatus.DISMISSED });

    await service.updateReport('report-1', 'mod-1', { status: ReportStatus.DISMISSED });

    expect(reliabilityService.decrementReports).toHaveBeenCalledWith('reported-1', tx);
    expect(tx.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'REPORT_DISMISSED', reportId: 'report-1' }),
      }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      'reporter-1',
      NotificationType.SYSTEM,
      'Report reviewed',
      expect.any(String),
      expect.any(Object),
    );
  });

  it('rejected dispute decrements disputed results and creates audit row', async () => {
    const { service, prisma, tx, reliabilityService } = createService();
    prisma.matchResultDispute.findUnique.mockResolvedValue({
      id: 'dispute-1',
      status: DisputeStatus.OPEN,
      createdByUserId: 'user-1',
      matchId: 'match-1',
      matchResultId: 'result-1',
      matchResult: { submittedByUserId: 'submitter-1' },
    });
    tx.matchResultDispute.update.mockResolvedValue({ id: 'dispute-1', status: DisputeStatus.REJECTED });

    await service.updateDispute('dispute-1', 'mod-1', { status: DisputeStatus.REJECTED });

    expect(reliabilityService.decrementDisputedResults).toHaveBeenCalledWith('user-1', tx);
    expect(tx.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'DISPUTE_REJECTED', disputeId: 'dispute-1' }),
      }),
    );
  });

  it('reversing no-show sets participant back to joined and decrements no-show count', async () => {
    const { service, prisma, tx, reliabilityService, notificationsService } = createService();
    prisma.matchParticipant.findUnique.mockResolvedValue({
      id: 'participant-1',
      userId: 'user-1',
      matchId: 'match-1',
      status: MatchParticipantStatus.NO_SHOW,
      match: { id: 'match-1', title: 'Saturday Doubles' },
    });
    tx.matchParticipant.update.mockResolvedValue({
      id: 'participant-1',
      userId: 'user-1',
      status: MatchParticipantStatus.JOINED,
    });

    await service.updateNoShow('participant-1', 'mod-1', { action: ModerationNoShowAction.REVERSE });

    expect(tx.matchParticipant.update).toHaveBeenCalledWith({
      where: { id: 'participant-1' },
      data: { status: MatchParticipantStatus.JOINED },
    });
    expect(reliabilityService.decrementNoShow).toHaveBeenCalledWith('user-1', tx);
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      'user-1',
      NotificationType.SYSTEM,
      'No-show reversed',
      expect.any(String),
      expect.any(Object),
    );
  });

  it('rejects invalid report transition when report is not OPEN', async () => {
    const { service, prisma } = createService();
    prisma.userReport.findUnique.mockResolvedValue({
      id: 'report-1',
      status: ReportStatus.REVIEWED,
      reportedUserId: 'reported-1',
      reporterUserId: 'reporter-1',
      matchId: null,
    });

    await expect(
      service.updateReport('report-1', 'mod-1', { status: ReportStatus.DISMISSED }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
