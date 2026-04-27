export enum SportFormat {
  SINGLES = 'SINGLES',
  DOUBLES = 'DOUBLES',
}

export enum MatchStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MatchParticipantStatus {
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  NO_SHOW = 'NO_SHOW',
}

export enum Team {
  A = 'A',
  B = 'B',
  UNKNOWN = 'UNKNOWN',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum ReportStatus {
  OPEN = 'OPEN',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
}

export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export enum ModerationActionType {
  REPORT_REVIEWED = 'REPORT_REVIEWED',
  REPORT_DISMISSED = 'REPORT_DISMISSED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  DISPUTE_REJECTED = 'DISPUTE_REJECTED',
  NO_SHOW_CONFIRMED = 'NO_SHOW_CONFIRMED',
  NO_SHOW_REVERSED = 'NO_SHOW_REVERSED',
}

export enum NotificationType {
  MATCH_JOINED = 'MATCH_JOINED',
  MATCH_LEFT = 'MATCH_LEFT',
  MATCH_CANCELLED = 'MATCH_CANCELLED',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  RESULT_SUBMITTED = 'RESULT_SUBMITTED',
  RESULT_VERIFIED = 'RESULT_VERIFIED',
  RATING_UPDATED = 'RATING_UPDATED',
  DISPUTE_CREATED = 'DISPUTE_CREATED',
  REPORT_CREATED = 'REPORT_CREATED',
  NO_SHOW_MARKED = 'NO_SHOW_MARKED',
  SYSTEM = 'SYSTEM',
}

export enum PushDevicePlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
  UNKNOWN = 'UNKNOWN',
}

export interface UserDto {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  bio: string | null;
  homeLocationText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SportDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueDto {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchDto {
  id: string;
  sportId: string;
  venueId: string | null;
  createdByUserId: string;
  title: string;
  description: string | null;
  format: SportFormat;
  status: MatchStatus;
  startsAt: string;
  maxPlayers: number;
  minRating: number | null;
  maxRating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchParticipantDto {
  id: string;
  matchId: string;
  userId: string;
  status: MatchParticipantStatus;
  team: Team;
  displayName?: string;
  reliabilityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResultDto {
  id: string;
  matchId: string;
  submittedByUserId: string;
  teamAScore: number;
  teamBScore: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchWithDetailsDto extends MatchDto {
  participants?: MatchParticipantDto[];
  result?: MatchResultDto | null;
  sport?: SportDto;
  venue?: VenueDto | null;
  distanceKm?: number;
  fitScore?: number;
  fitBreakdown?: {
    distanceScore: number;
    ratingFitScore: number;
    reliabilityScore: number;
    timeScore: number;
    slotAvailabilityScore: number;
  };
}

export interface ReliabilityStatsDto {
  userId: string;
  completedMatches: number;
  cancelledMatches: number;
  lateCancellationCount: number;
  noShowCount: number;
  disputedResults: number;
  reportCount: number;
  reliabilityScore: number;
}

export interface MatchResultDisputeDto {
  id: string;
  matchResultId: string;
  matchId: string;
  createdByUserId: string;
  reason: string;
  status: DisputeStatus;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  moderatorNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserReportDto {
  id: string;
  reportedUserId: string;
  reporterUserId: string;
  matchId: string | null;
  reason: string;
  status: ReportStatus;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  moderatorNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationActionDto {
  id: string;
  moderatorUserId: string;
  targetUserId: string | null;
  reportId: string | null;
  disputeId: string | null;
  matchId: string | null;
  participantId: string | null;
  actionType: ModerationActionType;
  note: string | null;
  createdAt: string;
}

export interface ChatMessageSenderDto {
  id: string;
  displayName: string;
}

export interface ChatMessageDto {
  id: string;
  matchId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  sender: ChatMessageSenderDto;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationUnreadCountDto {
  count: number;
}

export interface PushDeviceDto {
  id: string;
  userId: string;
  expoPushToken: string;
  platform: PushDevicePlatform | null;
  deviceName: string | null;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferenceDto {
  id: string;
  userId: string;
  matchUpdates: boolean;
  chatMessages: boolean;
  results: boolean;
  trustSafety: boolean;
  ratingUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchNotificationPreferenceDto {
  id: string;
  userId: string;
  matchId: string;
  muted: boolean;
  muteUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatUnreadCountDto {
  count: number;
}

export interface RatingDto {
  id: string;
  userId: string;
  sportId: string;
  format: SportFormat;
  rating: number;
  gamesPlayed: number;
  uncertainty: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingHistoryDto {
  id: string;
  userId: string;
  sportId: string;
  matchId: string;
  oldRating: number;
  newRating: number;
  delta: number;
  createdAt: string;
}

export interface CreateMatchInput {
  sportId: string;
  venueId?: string;
  title: string;
  description?: string;
  format: SportFormat;
  startsAt: string;
  maxPlayers: number;
  minRating?: number;
  maxRating?: number;
}
