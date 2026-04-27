import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MatchParticipantStatus, MatchStatus } from '@prisma/client';
import { ChatService } from './chat.service';

function createMatchRecord(params: {
  matchId?: string;
  status?: MatchStatus;
  createdByUserId?: string;
  participantStatus?: MatchParticipantStatus | null;
  participantUserId?: string;
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
        : [{ status: params.participantStatus, userId: params.participantUserId ?? 'player-1' }],
  };
}

describe('ChatService', () => {
  function createService(matchRecord: any) {
    const notificationsService = {
      createManyNotifications: jest.fn().mockResolvedValue([]),
    };
    const prisma = {
      match: {
        findUnique: jest.fn().mockResolvedValue(matchRecord),
      },
      chatMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
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
      chatReadState: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    return {
      prisma,
      notificationsService,
      service: new ChatService(prisma as any, notificationsService as any),
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

  it('chat message creates notifications for other participants and creator but not sender', async () => {
    const { service, notificationsService } = createService({
      id: 'match-1',
      title: 'Evening Doubles',
      status: MatchStatus.OPEN,
      createdByUserId: 'creator-1',
      participants: [
        { status: MatchParticipantStatus.JOINED, userId: 'player-1' },
        { status: MatchParticipantStatus.JOINED, userId: 'player-2' },
        { status: MatchParticipantStatus.JOINED, userId: 'player-3' },
      ],
    });

    await service.sendMessage('match-1', 'player-1', { body: 'See you soon' });

    expect(notificationsService.createManyNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'creator-1', type: 'CHAT_MESSAGE' }),
        expect.objectContaining({ userId: 'player-2', type: 'CHAT_MESSAGE' }),
        expect.objectContaining({ userId: 'player-3', type: 'CHAT_MESSAGE' }),
      ]),
    );
    expect(notificationsService.createManyNotifications).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ userId: 'player-1' })]),
    );
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

  it('chat unread count excludes own messages', async () => {
    const { service, prisma } = createService(
      createMatchRecord({
        participantStatus: MatchParticipantStatus.JOINED,
      }),
    );
    prisma.chatReadState.findUnique.mockResolvedValue({ lastReadAt: new Date('2026-04-27T10:00:00.000Z') });
    prisma.chatMessage.count.mockResolvedValue(3);

    const result = await service.getUnreadCount('match-1', 'player-1');

    expect(result).toEqual({ count: 3 });
    expect(prisma.chatMessage.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          senderUserId: { not: 'player-1' },
        }),
      }),
    );
  });

  it('chat unread count decreases to zero after mark read', async () => {
    const { service, prisma } = createService(
      createMatchRecord({
        participantStatus: MatchParticipantStatus.JOINED,
      }),
    );
    prisma.chatReadState.findUnique.mockResolvedValue({ lastReadAt: null });
    prisma.chatMessage.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    const before = await service.getUnreadCount('match-1', 'player-1');
    await service.markAsRead('match-1', 'player-1');
    prisma.chatReadState.findUnique.mockResolvedValue({ lastReadAt: new Date() });
    const after = await service.getUnreadCount('match-1', 'player-1');

    expect(before).toEqual({ count: 2 });
    expect(after).toEqual({ count: 0 });
    expect(prisma.chatReadState.upsert).toHaveBeenCalled();
  });

  it('non-participant cannot mark chat read', async () => {
    const { service } = createService(
      createMatchRecord({ participantStatus: null, createdByUserId: 'creator-1' }),
    );

    await expect(service.markAsRead('match-1', 'outsider-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
