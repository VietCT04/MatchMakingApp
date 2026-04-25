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

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
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
};

export type SubmitMatchResultInput = {
  teamAScore: number;
  teamBScore: number;
};

export type AuthenticatedCreateMatchInput = Omit<CreateMatchInput, 'createdByUserId'>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...((init?.headers as Record<string, string> | undefined) ?? {}),
      },
    });
  } catch {
    throw new ApiError('Backend is offline or unreachable.');
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[]; error?: string };
    if (Array.isArray(body.message)) {
      return body.message.join('\n');
    }
    return body.message ?? body.error ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
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
    });
  },

  login(payload: { email: string; password: string }): Promise<AuthResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe(): Promise<UserDto> {
    return request('/me');
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

  joinMatch(matchId: string, _userId?: string, team = 'UNKNOWN') {
    return request(`/matches/${matchId}/join`, {
      method: 'POST',
      body: JSON.stringify({ team }),
    });
  },

  leaveMatch(matchId: string, _userId?: string) {
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

  verifyMatchResult(matchId: string, resultId: string, _userId?: string) {
    return request(`/matches/${matchId}/results/${resultId}/verify`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  getUserRatings(userId?: string): Promise<RatingDto[]> {
    return request(userId ? `/users/${userId}/ratings` : '/me/ratings');
  },

  getUserRatingHistory(userId?: string): Promise<RatingHistoryDto[]> {
    return request(userId ? `/users/${userId}/rating-history` : '/me/rating-history');
  },
};

export type AuthResponse = {
  accessToken: string;
  user: Pick<UserDto, 'id' | 'email' | 'displayName'>;
};
