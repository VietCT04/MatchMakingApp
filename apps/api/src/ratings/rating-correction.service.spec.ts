import { BadRequestException, ConflictException } from '@nestjs/common';
import { MatchParticipantStatus, SportFormat, Team } from '@prisma/client';
import { RatingCorrectionService } from './rating-correction.service';

describe('RatingCorrectionService', () => {
  function createService() {
    const service = new RatingCorrectionService();

    const tx = {
      matchResultDispute: {
        findUnique: jest.fn(),
      },
      matchResult: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ratingHistory: {
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      userSportRating: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    return { service, tx };
  }

  it('marks original rating history as reverted and creates correction rows', async () => {
    const { service, tx } = createService();

    tx.matchResultDispute.findUnique.mockResolvedValue({
      id: 'dispute-1',
      matchResult: {
        id: 'result-1',
        matchId: 'match-1',
        teamAScore: 21,
        teamBScore: 17,
        verified: true,
        isCorrected: false,
        match: {
          id: 'match-1',
          sportId: 'sport-1',
          format: SportFormat.SINGLES,
          participants: [
            { userId: 'user-a', team: Team.A },
            { userId: 'user-b', team: Team.B },
          ],
        },
      },
    });

    tx.ratingHistory.findMany.mockResolvedValue([
      {
        id: 'h1',
        userId: 'user-a',
        oldRating: 1200,
        newRating: 1216,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      },
      {
        id: 'h2',
        userId: 'user-b',
        oldRating: 1200,
        newRating: 1184,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      },
    ]);

    tx.userSportRating.upsert
      .mockResolvedValueOnce({ id: 'ra', userId: 'user-a', sportId: 'sport-1', rating: 1216, gamesPlayed: 1 })
      .mockResolvedValueOnce({ id: 'rb', userId: 'user-b', sportId: 'sport-1', rating: 1184, gamesPlayed: 1 })
      .mockResolvedValueOnce({ id: 'ra', userId: 'user-a', sportId: 'sport-1', rating: 1200, gamesPlayed: 0 })
      .mockResolvedValueOnce({ id: 'rb', userId: 'user-b', sportId: 'sport-1', rating: 1200, gamesPlayed: 0 });

    tx.matchResult.findUnique.mockResolvedValue({
      id: 'result-1',
      matchId: 'match-1',
      match: {
        id: 'match-1',
        sportId: 'sport-1',
        format: SportFormat.SINGLES,
        participants: [
          { id: 'pa', userId: 'user-a', status: MatchParticipantStatus.JOINED, team: Team.A },
          { id: 'pb', userId: 'user-b', status: MatchParticipantStatus.JOINED, team: Team.B },
        ],
      },
    });

    await service.applyDisputeRatingCorrection(
      tx as any,
      'dispute-1',
      'mod-1',
      { teamAScore: 17, teamBScore: 21 },
      'Corrected by moderator',
    );

    expect(tx.userSportRating.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ra' },
        data: expect.objectContaining({ rating: 1200 }),
      }),
    );
    expect(tx.userSportRating.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rb' },
        data: expect.objectContaining({ rating: 1200 }),
      }),
    );
    expect(tx.ratingHistory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'h1' },
        data: expect.objectContaining({ isReverted: true }),
      }),
    );
    expect(tx.ratingHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctionOfRatingHistoryId: 'h1' }),
      }),
    );
    expect(tx.ratingHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ correctionOfRatingHistoryId: 'h2' }),
      }),
    );
    expect(tx.matchResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'result-1' },
        data: expect.objectContaining({ isCorrected: true, correctedTeamAScore: 17, correctedTeamBScore: 21 }),
      }),
    );
  });

  it('rejects duplicate correction', async () => {
    const { service, tx } = createService();
    tx.matchResultDispute.findUnique.mockResolvedValue({
      id: 'dispute-1',
      matchResult: {
        id: 'result-1',
        verified: true,
        isCorrected: true,
        teamAScore: 21,
        teamBScore: 17,
        match: {
          sportId: 'sport-1',
          format: SportFormat.SINGLES,
          participants: [
            { userId: 'user-a', team: Team.A },
            { userId: 'user-b', team: Team.B },
          ],
        },
      },
    });

    await expect(
      service.applyDisputeRatingCorrection(
        tx as any,
        'dispute-1',
        'mod-1',
        { teamAScore: 17, teamBScore: 21 },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects correction for unverified result', async () => {
    const { service, tx } = createService();
    tx.matchResultDispute.findUnique.mockResolvedValue({
      id: 'dispute-1',
      matchResult: {
        id: 'result-1',
        verified: false,
        isCorrected: false,
        teamAScore: 21,
        teamBScore: 17,
        match: {
          sportId: 'sport-1',
          format: SportFormat.SINGLES,
          participants: [
            { userId: 'user-a', team: Team.A },
            { userId: 'user-b', team: Team.B },
          ],
        },
      },
    });

    await expect(
      service.applyDisputeRatingCorrection(
        tx as any,
        'dispute-1',
        'mod-1',
        { teamAScore: 17, teamBScore: 21 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects correction when no rating history exists for the match', async () => {
    const { service, tx } = createService();
    tx.matchResultDispute.findUnique.mockResolvedValue({
      id: 'dispute-1',
      matchResult: {
        id: 'result-1',
        matchId: 'match-1',
        verified: true,
        isCorrected: false,
        teamAScore: 21,
        teamBScore: 17,
        match: {
          id: 'match-1',
          sportId: 'sport-1',
          format: SportFormat.SINGLES,
          participants: [
            { userId: 'user-a', team: Team.A },
            { userId: 'user-b', team: Team.B },
          ],
        },
      },
    });
    tx.ratingHistory.findMany.mockResolvedValue([]);

    await expect(
      service.applyDisputeRatingCorrection(
        tx as any,
        'dispute-1',
        'mod-1',
        { teamAScore: 17, teamBScore: 21 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
