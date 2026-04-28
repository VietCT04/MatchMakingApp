import type {
  ChatMessageDto,
  ChatUnreadCountDto,
  CreateMatchInput,
  DisputeStatus,
  MatchNotificationPreferenceDto,
  MatchDto,
  MatchParticipantDto,
  MatchResultDisputeDto,
  MatchResultDto,
  MatchWithDetailsDto,
  MatchmakingProposalDto,
  MatchmakingLocationProposalDto,
  MatchmakingProposalMessageDto,
  MatchmakingTicketDto,
  MyPreferencesDto,
  ReportStatus,
  NotificationPreferenceDto,
  NotificationDto,
  NotificationUnreadCountDto,
  PushDeviceDto,
  PushDevicePlatform,
  ReliabilityStatsDto,
  RatingDto,
  RatingHistoryDto,
  SportDto,
  UserReportDto,
  UserDto,
  UserSportPreferenceDto,
  UserPreferredVenueDto,
  UserAvailabilitySlotDto,
  VenueDto,
} from '@sports-matchmaking/shared';
import { API_BASE_URL } from '../config/api';

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly isUnauthorized = false,
  ) {
    super(message);
  }
}

export type MatchFilters = {
  sportId?: string;
  format?: string;
  status?: string;
  minRating?: number;
  maxRating?: number;
  startsAfter?: string;
  startsBefore?: string;
  venueId?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  ranked?: boolean;
};

export type SubmitMatchResultInput = {
  teamAScore: number;
  teamBScore: number;
};

export type CreateDisputeInput = {
  reason: string;
};

export type ReportUserInput = {
  reportedUserId: string;
  matchId?: string;
  reason: string;
};

export type GetMatchMessagesParams = {
  limit?: number;
  before?: string;
};

export type GetNotificationsParams = {
  limit?: number;
  unreadOnly?: boolean;
};

export type RegisterPushDeviceInput = {
  expoPushToken: string;
  platform?: PushDevicePlatform;
  deviceName?: string;
};

export type UpdateMyProfileInput = {
  displayName: string;
  bio?: string;
  homeLocationText?: string;
  avatarUrl?: string;
  skillDescription?: string;
};

export type ModerationReportsParams = {
  status?: ReportStatus;
  limit?: number;
};

export type ModerationDisputesParams = {
  status?: DisputeStatus;
  limit?: number;
};

export type ModerationNoShowsParams = {
  limit?: number;
};

export type CreateMatchmakingTicketInput = {
  sportId: string;
  format: 'SINGLES' | 'DOUBLES';
  latitude?: number;
  longitude?: number;
  radiusKm: number;
  earliestStart: string;
  latestEnd: string;
  preferredVenueId?: string;
  minElo?: number;
  maxElo?: number;
};

type RequestOptions = {
  skipAuth?: boolean;
};

export type AuthenticatedCreateMatchInput = CreateMatchInput;

function buildHeaders(init?: RequestInit, options?: RequestOptions): Headers {
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!options?.skipAuth && accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

async function request<T>(path: string, init?: RequestInit, options?: RequestOptions): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: buildHeaders(init, options),
    });
  } catch {
    throw new ApiError('Backend is offline or unreachable.');
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (response.status === 401) {
      unauthorizedHandler?.();
      throw new ApiError(message || 'Session expired. Please log in again.', 401, true);
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      error?: string;
      statusCode?: number;
    };
    if (Array.isArray(body.message)) {
      return body.message.filter(Boolean).join('\n');
    }
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }
    return defaultErrorMessage(response.status);
  } catch {
    return defaultErrorMessage(response.status);
  }
}

function defaultErrorMessage(status: number): string {
  if (status === 401) {
    return 'Session expired. Please log in again.';
  }
  if (status === 403) {
    return 'You are not allowed to perform this action.';
  }
  if (status === 404) {
    return 'Requested resource was not found.';
  }
  return `Request failed with status ${status}.`;
}

function toQuery(filters: MatchFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export const apiClient = {
  register(payload: { email: string; password: string; displayName: string }): Promise<AuthResponse> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { skipAuth: true });
  },

  login(payload: { email: string; password: string }): Promise<AuthResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { skipAuth: true });
  },

  async getMe(): Promise<UserDto> {
    try {
      return await request('/me');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return request('/auth/me');
      }
      throw error;
    }
  },

  getSports(): Promise<SportDto[]> {
    return request('/sports');
  },

  getVenues(): Promise<VenueDto[]> {
    return request('/venues');
  },

  getUsers(): Promise<UserDto[]> {
    return request('/users');
  },

  getUserById(userId: string): Promise<UserDto> {
    return request(`/users/${userId}`);
  },

  getMatches(filters: MatchFilters = {}): Promise<MatchWithDetailsDto[]> {
    const query = toQuery(filters);
    return request(query ? `/matches?${query}` : '/matches');
  },

  getMatchById(matchId: string): Promise<MatchWithDetailsDto> {
    return request(`/matches/${matchId}`);
  },

  createMatch(payload: AuthenticatedCreateMatchInput): Promise<MatchDto> {
    return request('/matches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  joinMatch(matchId: string, team = 'UNKNOWN') {
    return request(`/matches/${matchId}/join`, {
      method: 'POST',
      body: JSON.stringify({ team }),
    });
  },

  leaveMatch(matchId: string) {
    return request(`/matches/${matchId}/leave`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  submitMatchResult(matchId: string, payload: SubmitMatchResultInput): Promise<MatchResultDto> {
    return request(`/matches/${matchId}/results`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyMatchResult(matchId: string, resultId: string) {
    return request(`/matches/${matchId}/results/${resultId}/verify`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  markParticipantNoShow(matchId: string, participantId: string): Promise<MatchParticipantDto> {
    return request(`/matches/${matchId}/participants/${participantId}/no-show`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  disputeMatchResult(matchId: string, resultId: string, reason: string): Promise<MatchResultDisputeDto> {
    return request(`/matches/${matchId}/results/${resultId}/disputes`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  reportUser(payload: ReportUserInput): Promise<UserReportDto> {
    return request('/reports/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMatchMessages(matchId: string, params: GetMatchMessagesParams = {}): Promise<ChatMessageDto[]> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) {
      query.set('limit', String(params.limit));
    }
    if (params.before) {
      query.set('before', params.before);
    }
    const suffix = query.toString();
    return request(`/matches/${matchId}/chat/messages${suffix ? `?${suffix}` : ''}`);
  },

  getChatUnreadCount(matchId: string): Promise<ChatUnreadCountDto> {
    return request(`/matches/${matchId}/chat/unread-count`);
  },

  markChatRead(matchId: string): Promise<{ success: boolean }> {
    return request(`/matches/${matchId}/chat/read`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  getMatchNotificationPreference(matchId: string): Promise<MatchNotificationPreferenceDto> {
    return request(`/matches/${matchId}/notification-preference`);
  },

  updateMatchNotificationPreference(
    matchId: string,
    payload: { muted: boolean; muteUntil?: string | null },
  ): Promise<MatchNotificationPreferenceDto> {
    return request(`/matches/${matchId}/notification-preference`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  sendMatchMessage(matchId: string, body: string): Promise<ChatMessageDto> {
    return request(`/matches/${matchId}/chat/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  getNotifications(params: GetNotificationsParams = {}): Promise<{ items: NotificationDto[] }> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) {
      query.set('limit', String(params.limit));
    }
    if (params.unreadOnly !== undefined) {
      query.set('unreadOnly', String(params.unreadOnly));
    }
    const suffix = query.toString();
    return request(`/notifications${suffix ? `?${suffix}` : ''}`);
  },

  getNotificationUnreadCount(): Promise<NotificationUnreadCountDto> {
    return request('/notifications/unread-count');
  },

  markNotificationRead(notificationId: string): Promise<NotificationDto> {
    return request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  markAllNotificationsRead(): Promise<NotificationUnreadCountDto> {
    return request('/notifications/read-all', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  registerPushDevice(payload: RegisterPushDeviceInput): Promise<PushDeviceDto> {
    return request('/push/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deactivatePushDevice(expoPushToken: string): Promise<{ success: boolean }> {
    const encoded = encodeURIComponent(expoPushToken);
    return request(`/push/devices/${encoded}`, {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
  },

  getMyPushDevices(): Promise<PushDeviceDto[]> {
    return request('/push/devices');
  },

  getNotificationPreferences(): Promise<NotificationPreferenceDto> {
    return request('/me/notification-preferences');
  },

  updateNotificationPreferences(
    payload: Partial<
      Pick<
        NotificationPreferenceDto,
        | 'matchUpdates'
        | 'chatMessages'
        | 'results'
        | 'trustSafety'
        | 'ratingUpdates'
        | 'quietHoursEnabled'
        | 'quietHoursStart'
        | 'quietHoursEnd'
        | 'timezone'
      >
    >,
  ): Promise<NotificationPreferenceDto> {
    return request('/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getUserRatings(): Promise<RatingDto[]> {
    return request('/me/ratings');
  },

  getUserRatingHistory(): Promise<RatingHistoryDto[]> {
    return request('/me/rating-history');
  },

  getMyReliability(): Promise<ReliabilityStatsDto> {
    return request('/me/reliability');
  },

  updateMyProfile(payload: UpdateMyProfileInput): Promise<UserDto> {
    return request('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getMyPreferences(): Promise<MyPreferencesDto> {
    return request('/me/preferences');
  },

  updateSportPreferences(payload: { sports: Array<{
    sportId: string;
    prefersSingles: boolean;
    prefersDoubles: boolean;
    minPreferredRating?: number;
    maxPreferredRating?: number;
    priority?: number;
  }> }): Promise<UserSportPreferenceDto[]> {
    return request('/me/preferences/sports', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updatePreferredVenues(payload: { venues: Array<{ venueId: string; priority?: number }> }): Promise<UserPreferredVenueDto[]> {
    return request('/me/preferences/venues', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateAvailability(payload: { availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    timezone?: string;
  }> }): Promise<UserAvailabilitySlotDto[]> {
    return request('/me/preferences/availability', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getUserReliability(userId: string): Promise<ReliabilityStatsDto> {
    return request(`/users/${userId}/reliability`);
  },

  getModerationReports(params: ModerationReportsParams = {}): Promise<UserReportDto[]> {
    const query = new URLSearchParams();
    if (params.status) {
      query.set('status', params.status);
    }
    if (params.limit !== undefined) {
      query.set('limit', String(params.limit));
    }
    const suffix = query.toString();
    return request(`/moderation/reports${suffix ? `?${suffix}` : ''}`);
  },

  getModerationDisputes(params: ModerationDisputesParams = {}): Promise<MatchResultDisputeDto[]> {
    const query = new URLSearchParams();
    if (params.status) {
      query.set('status', params.status);
    }
    if (params.limit !== undefined) {
      query.set('limit', String(params.limit));
    }
    const suffix = query.toString();
    return request(`/moderation/disputes${suffix ? `?${suffix}` : ''}`);
  },

  getModerationNoShows(params: ModerationNoShowsParams = {}): Promise<MatchParticipantDto[]> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) {
      query.set('limit', String(params.limit));
    }
    const suffix = query.toString();
    return request(`/moderation/no-shows${suffix ? `?${suffix}` : ''}`);
  },

  updateModerationReport(
    reportId: string,
    payload: { status: ReportStatus.REVIEWED | ReportStatus.DISMISSED; moderatorNote?: string },
  ): Promise<UserReportDto> {
    return request(`/moderation/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateModerationDispute(
    disputeId: string,
    payload: {
      status: DisputeStatus.RESOLVED | DisputeStatus.REJECTED;
      moderatorNote?: string;
      correctedTeamAScore?: number;
      correctedTeamBScore?: number;
    },
  ): Promise<MatchResultDisputeDto> {
    return request(`/moderation/disputes/${disputeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateModerationNoShow(
    participantId: string,
    payload: { action: 'CONFIRM' | 'REVERSE'; moderatorNote?: string },
  ): Promise<MatchParticipantDto> {
    return request(`/moderation/no-shows/${participantId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  createMatchmakingTicket(payload: CreateMatchmakingTicketInput): Promise<MatchmakingTicketDto> {
    return request('/matchmaking/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  runMatchmakingSearch(): Promise<{ found: boolean; proposal?: MatchmakingProposalDto; message?: string; suggestions?: { eloTolerance: number; suggestedRadiusKm: number } }> {
    return request('/matchmaking/search', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  getMyMatchmakingTickets(): Promise<MatchmakingTicketDto[]> {
    return request('/matchmaking/tickets/me');
  },

  getMyMatchmakingProposals(): Promise<MatchmakingProposalDto[]> {
    return request('/matchmaking/proposals/me');
  },

  acceptMatchmakingProposal(proposalId: string): Promise<MatchmakingProposalDto> {
    return request(`/matchmaking/proposals/${proposalId}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  declineMatchmakingProposal(proposalId: string): Promise<MatchmakingProposalDto> {
    return request(`/matchmaking/proposals/${proposalId}/decline`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  getProposalMessages(proposalId: string): Promise<MatchmakingProposalMessageDto[]> {
    return request(`/matchmaking/proposals/${proposalId}/messages`);
  },

  sendProposalMessage(proposalId: string, body: string): Promise<MatchmakingProposalMessageDto> {
    return request(`/matchmaking/proposals/${proposalId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  getLocationProposals(proposalId: string): Promise<MatchmakingLocationProposalDto[]> {
    return request(`/matchmaking/proposals/${proposalId}/location-proposals`);
  },

  proposeLocation(proposalId: string, payload: {
    locationName: string;
    address?: string;
    latitude: number;
    longitude: number;
    googleMapsUrl?: string;
    googlePlaceId?: string;
  }): Promise<MatchmakingLocationProposalDto> {
    return request(`/matchmaking/proposals/${proposalId}/location-proposals`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  acceptLocationProposal(locationProposalId: string): Promise<MatchmakingLocationProposalDto> {
    return request(`/matchmaking/location-proposals/${locationProposalId}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  declineLocationProposal(locationProposalId: string): Promise<MatchmakingLocationProposalDto> {
    return request(`/matchmaking/location-proposals/${locationProposalId}/decline`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  cancelMatchmakingProposal(proposalId: string, reason?: string): Promise<MatchmakingProposalDto> {
    return request(`/matchmaking/proposals/${proposalId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },
};

export type AuthResponse = {
  accessToken: string;
  user: Pick<UserDto, 'id' | 'email' | 'role' | 'displayName'>;
};
