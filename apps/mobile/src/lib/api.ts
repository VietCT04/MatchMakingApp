import type {
  CreateMatchInput,
  MatchDto,
  MatchResultDto,
  MatchWithDetailsDto,
  RatingDto,
  RatingHistoryDto,
  SportDto,
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

  getUserRatings(): Promise<RatingDto[]> {
    return request('/me/ratings');
  },

  getUserRatingHistory(): Promise<RatingHistoryDto[]> {
    return request('/me/rating-history');
  },
};

export type AuthResponse = {
  accessToken: string;
  user: Pick<UserDto, 'id' | 'email' | 'displayName'>;
};
