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

export enum CheckInMethod {
  MANUAL = 'MANUAL',
  GPS = 'GPS',
  QR = 'QR',
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
  AUTO_MATCH_FOUND = 'AUTO_MATCH_FOUND',
  AUTO_MATCH_CONFIRMED = 'AUTO_MATCH_CONFIRMED',
  AUTO_MATCH_DECLINED = 'AUTO_MATCH_DECLINED',
  AUTO_MATCH_EXPIRED = 'AUTO_MATCH_EXPIRED',
  AUTO_MATCH_LOCATION_PROPOSED = 'AUTO_MATCH_LOCATION_PROPOSED',
  AUTO_MATCH_LOCATION_ACCEPTED = 'AUTO_MATCH_LOCATION_ACCEPTED',
  AUTO_MATCH_LOCATION_DECLINED = 'AUTO_MATCH_LOCATION_DECLINED',
  AUTO_MATCH_CANCELLED = 'AUTO_MATCH_CANCELLED',
  SYSTEM = 'SYSTEM',
}

export enum MatchmakingTicketStatus {
  SEARCHING = 'SEARCHING',
  MATCHED = 'MATCHED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum MatchmakingProposalStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum MatchmakingProposalParticipantStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
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
  avatarUrl?: string | null;
  skillDescription?: string | null;
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
  checkedInAt?: string | null;
  checkInMethod?: CheckInMethod | null;
  checkedInLatitude?: number | null;
  checkedInLongitude?: number | null;
  displayName?: string;
  reliabilityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MatchCheckInStatusDto {
  matchId: string;
  checkInOpen: boolean;
  checkInWindow: {
    opensAt: string;
    closesAt: string;
  };
  participants: Array<{
    participantId: string;
    userId: string;
    displayName: string;
    team: Team;
    status: MatchParticipantStatus;
    checkedInAt: string | null;
  }>;
}

export interface MatchResultDto {
  id: string;
  matchId: string;
  submittedByUserId: string;
  teamAScore: number;
  teamBScore: number;
  verified: boolean;
  correctedTeamAScore?: number | null;
  correctedTeamBScore?: number | null;
  correctedByUserId?: string | null;
  correctedAt?: string | null;
  correctionReason?: string | null;
  isCorrected?: boolean;
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
    preferenceScore: number;
    timeScore: number;
    slotAvailabilityScore: number;
  };
}

export interface UserSportPreferenceDto {
  id: string;
  userId: string;
  sportId: string;
  prefersSingles: boolean;
  prefersDoubles: boolean;
  minPreferredRating: number | null;
  maxPreferredRating: number | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferredVenueDto {
  id: string;
  userId: string;
  venueId: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAvailabilitySlotDto {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyPreferencesDto {
  profile: UserDto;
  sportPreferences: UserSportPreferenceDto[];
  preferredVenues: UserPreferredVenueDto[];
  availability: UserAvailabilitySlotDto[];
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
  metadata?: Record<string, unknown> | null;
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

export interface MatchmakingTicketDto {
  id: string;
  userId: string;
  sportId: string;
  format: SportFormat;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  earliestStart: string;
  latestEnd: string;
  preferredVenueId: string | null;
  minElo: number | null;
  maxElo: number | null;
  status: MatchmakingTicketStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface MatchmakingProposalParticipantDto {
  id: string;
  proposalId: string;
  userId: string;
  ticketId: string;
  team: Team;
  status: MatchmakingProposalParticipantStatus;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  user?: {
    id: string;
    displayName: string;
    reliabilityScore?: number;
  };
}

export interface MatchmakingProposalDto {
  id: string;
  sportId: string;
  format: SportFormat;
  venueId: string | null;
  proposedStartTime: string;
  status: MatchmakingProposalStatus;
  createdAt: string;
  updatedAt: string;
  confirmedMatchId: string | null;
  participants?: MatchmakingProposalParticipantDto[];
}

export interface MatchmakingProposalMessageDto {
  id: string;
  proposalId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MatchmakingLocationProposalResponseDto {
  id: string;
  locationProposalId: string;
  userId: string;
  status: MatchmakingProposalParticipantStatus;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
}

export interface MatchmakingLocationProposalDto {
  id: string;
  proposalId: string;
  proposedByUserId: string;
  locationName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
  responses?: MatchmakingLocationProposalResponseDto[];
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
  correctionOfRatingHistoryId?: string | null;
  isReverted?: boolean;
  revertedAt?: string | null;
  revertReason?: string | null;
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
