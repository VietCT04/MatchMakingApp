import type {
  ChatMessageDto,
  CreateMatchInput,
  MatchDto,
  MatchParticipantDto,
  MatchResultDisputeDto,
  MatchResultDto,
  MatchWithDetailsDto,
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

  getMyNotificationPreferences(): Promise<NotificationPreferenceDto> {
    return request('/me/notification-preferences');
  },

  getNotificationPreferences(): Promise<NotificationPreferenceDto> {
    return request('/me/notification-preferences');
  },

  updateMyNotificationPreferences(
    payload: Partial<
      Pick<NotificationPreferenceDto, 'matchUpdates' | 'chatMessages' | 'results' | 'trustSafety' | 'ratingUpdates'>
    >,
  ): Promise<NotificationPreferenceDto> {
    return request('/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateNotificationPreferences(
    payload: Partial<
      Pick<NotificationPreferenceDto, 'matchUpdates' | 'chatMessages' | 'results' | 'trustSafety' | 'ratingUpdates'>
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

  getUserReliability(userId: string): Promise<ReliabilityStatsDto> {
    return request(`/users/${userId}/reliability`);
  },
};

export type AuthResponse = {
  accessToken: string;
  user: Pick<UserDto, 'id' | 'email' | 'displayName'>;
};
