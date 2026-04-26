import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus } from '@prisma/client';
import { ChatService } from './chat.service';

function createMatchRecord(params: {
  matchId?: string;
  status?: MatchStatus;
  createdByUserId?: string;
  participantStatus?: MatchParticipantStatus | null;
}) {
  const matchId = params.matchId ?? 'match-1';
  const createdByUserId = params.createdByUserId ?? 'creator-1';
  return {
    id: matchId,
    title: 'Evening Doubles',
    status: params.status ?? MatchStatus.OPEN,
    createdByUserId,
    participants:
      params.participantStatus === undefined || params.participantStatus === null
        ? []
        : [{ status: params.participantStatus }],
  };
}

describe('ChatService', () => {
  function createService(matchRecord: any) {
    const prisma = {
      match: {
        findUnique: jest.fn().mockResolvedValue(matchRecord),
      },
      chatMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: 'message-1',
          matchId: data.matchId,
          senderUserId: data.senderUserId,
          body: data.body,
          createdAt: new Date('2026-04-26T12:00:00.000Z'),
          updatedAt: new Date('2026-04-26T12:00:00.000Z'),
          deletedAt: null,
          sender: {
            id: data.senderUserId,
            displayName: 'Sender Name',
          },
        })),
      },
    };
    return {
      prisma,
      service: new ChatService(prisma as any),
    };
  }

  it('non-participant cannot read messages', async () => {
    const { service } = createService(
      createMatchRecord({ participantStatus: null, createdByUserId: 'creator-1' }),
    );
    await expect(service.getMessages('match-1', 'outsider-1', {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('non-participant cannot send messages', async () => {
    const { service } = createService(
      createMatchRecord({ participantStatus: null, createdByUserId: 'creator-1' }),
    );
    await expect(
      service.sendMessage('match-1', 'outsider-1', { body: 'Hello team' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('joined participant can read and send messages', async () => {
    const { service } = createService(
      createMatchRecord({
        participantStatus: MatchParticipantStatus.JOINED,
        createdByUserId: 'creator-1',
      }),
    );
    await expect(service.getMessages('match-1', 'player-1', {})).resolves.toEqual([]);
    await expect(
      service.sendMessage('match-1', 'player-1', { body: 'See you at 7pm' }),
    ).resolves.toEqual(expect.objectContaining({ body: 'See you at 7pm' }));
  });

  it('match creator can read and send messages', async () => {
    const { service } = createService(
      createMatchRecord({
        participantStatus: null,
        createdByUserId: 'creator-1',
      }),
    );
    await expect(service.getMessages('match-1', 'creator-1', {})).resolves.toEqual([]);
    await expect(
      service.sendMessage('match-1', 'creator-1', { body: 'Court booked at 7pm' }),
    ).resolves.toEqual(expect.objectContaining({ senderUserId: 'creator-1' }));
  });

  it('LEFT participant can read but cannot send', async () => {
    const { service } = createService(
      createMatchRecord({
        participantStatus: MatchParticipantStatus.LEFT,
        createdByUserId: 'creator-1',
      }),
    );
    await expect(service.getMessages('match-1', 'left-player', {})).resolves.toEqual([]);
    await expect(
      service.sendMessage('match-1', 'left-player', { body: 'Can I still send?' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('NO_SHOW participant cannot send', async () => {
    const { service } = createService(
      createMatchRecord({
        participantStatus: MatchParticipantStatus.NO_SHOW,
        createdByUserId: 'creator-1',
      }),
    );
    await expect(
      service.sendMessage('match-1', 'no-show-player', { body: 'Ping' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancelled match blocks sending', async () => {
    const { service } = createService(
      createMatchRecord({
        status: MatchStatus.CANCELLED,
        createdByUserId: 'creator-1',
        participantStatus: MatchParticipantStatus.JOINED,
      }),
    );
    await expect(
      service.sendMessage('match-1', 'player-1', { body: 'Still happening?' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('empty message is rejected', async () => {
    const { service } = createService(
      createMatchRecord({
        participantStatus: MatchParticipantStatus.JOINED,
      }),
    );
    await expect(
      service.sendMessage('match-1', 'player-1', { body: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('overly long message is rejected', async () => {
    const { service } = createService(
      createMatchRecord({
        participantStatus: MatchParticipantStatus.JOINED,
      }),
    );
    await expect(
      service.sendMessage('match-1', 'player-1', { body: 'a'.repeat(1001) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
