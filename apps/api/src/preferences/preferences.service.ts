import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  hhmmToMinutes,
  UpdateAvailabilityDto,
  UpdateMyProfileDto,
  UpdatePreferredVenuesDto,
  UpdateSportPreferencesDto,
} from './dto.preferences';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        bio: true,
        homeLocationText: true,
        avatarUrl: true,
        skillDescription: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [sportPreferences, preferredVenues, availability] = await Promise.all([
      this.prisma.userSportPreference.findMany({
        where: { userId },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.userPreferredVenue.findMany({
        where: { userId },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.userAvailabilitySlot.findMany({
        where: { userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
    ]);

    return {
      profile: user,
      sportPreferences,
      preferredVenues,
      availability,
    };
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName.trim(),
        bio: dto.bio?.trim() || null,
        homeLocationText: dto.homeLocationText?.trim() || null,
        avatarUrl: dto.avatarUrl?.trim() || null,
        skillDescription: dto.skillDescription?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        bio: true,
        homeLocationText: true,
        avatarUrl: true,
        skillDescription: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateSportPreferences(userId: string, dto: UpdateSportPreferencesDto) {
    this.validateSportPreferencesRequest(dto);
    await this.ensureSportsExist(dto.sports.map((sport) => sport.sportId));

    return this.prisma.$transaction(async (tx) => {
      await tx.userSportPreference.deleteMany({ where: { userId } });
      if (dto.sports.length === 0) {
        return [];
      }
      await tx.userSportPreference.createMany({
        data: dto.sports.map((item, index) => ({
          userId,
          sportId: item.sportId,
          prefersSingles: item.prefersSingles,
          prefersDoubles: item.prefersDoubles,
          minPreferredRating: item.minPreferredRating,
          maxPreferredRating: item.maxPreferredRating,
          priority: item.priority ?? dto.sports.length - index,
        })),
      });
      return tx.userSportPreference.findMany({
        where: { userId },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
    });
  }

  async updatePreferredVenues(userId: string, dto: UpdatePreferredVenuesDto) {
    this.validatePreferredVenuesRequest(dto);
    await this.ensureVenuesExist(dto.venues.map((venue) => venue.venueId));

    return this.prisma.$transaction(async (tx) => {
      await tx.userPreferredVenue.deleteMany({ where: { userId } });
      if (dto.venues.length === 0) {
        return [];
      }
      await tx.userPreferredVenue.createMany({
        data: dto.venues.map((item, index) => ({
          userId,
          venueId: item.venueId,
          priority: item.priority ?? dto.venues.length - index,
        })),
      });
      return tx.userPreferredVenue.findMany({
        where: { userId },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
    });
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    this.validateAvailabilityRequest(dto);

    return this.prisma.$transaction(async (tx) => {
      await tx.userAvailabilitySlot.deleteMany({ where: { userId } });
      if (dto.availability.length === 0) {
        return [];
      }
      await tx.userAvailabilitySlot.createMany({
        data: dto.availability.map((slot) => ({
          userId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone: slot.timezone?.trim() || 'Asia/Singapore',
        })),
      });
      return tx.userAvailabilitySlot.findMany({
        where: { userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  private validateSportPreferencesRequest(dto: UpdateSportPreferencesDto) {
    const seenSportIds = new Set<string>();

    for (const item of dto.sports) {
      if (seenSportIds.has(item.sportId)) {
        throw new BadRequestException('Duplicate sportId in sport preferences payload');
      }
      seenSportIds.add(item.sportId);

      if (!item.prefersSingles && !item.prefersDoubles) {
        throw new BadRequestException('At least one of prefersSingles/prefersDoubles must be true');
      }

      if (
        item.minPreferredRating !== undefined &&
        item.maxPreferredRating !== undefined &&
        item.minPreferredRating > item.maxPreferredRating
      ) {
        throw new BadRequestException('minPreferredRating must be less than or equal to maxPreferredRating');
      }
    }
  }

  private validatePreferredVenuesRequest(dto: UpdatePreferredVenuesDto) {
    const seenVenueIds = new Set<string>();
    for (const item of dto.venues) {
      if (seenVenueIds.has(item.venueId)) {
        throw new BadRequestException('Duplicate venueId in preferred venues payload');
      }
      seenVenueIds.add(item.venueId);
    }
  }

  private validateAvailabilityRequest(dto: UpdateAvailabilityDto) {
    const seen = new Set<string>();

    for (const slot of dto.availability) {
      const startMinutes = hhmmToMinutes(slot.startTime);
      const endMinutes = hhmmToMinutes(slot.endTime);
      if (startMinutes >= endMinutes) {
        throw new BadRequestException('startTime must be before endTime');
      }

      const key = `${slot.dayOfWeek}:${slot.startTime}:${slot.endTime}:${slot.timezone ?? 'Asia/Singapore'}`;
      if (seen.has(key)) {
        throw new BadRequestException('Duplicate availability slot in payload');
      }
      seen.add(key);
    }
  }

  private async ensureSportsExist(sportIds: string[]) {
    if (sportIds.length === 0) {
      return;
    }
    const sports = await this.prisma.sport.findMany({
      where: { id: { in: sportIds } },
      select: { id: true },
    });

    const existing = new Set(sports.map((sport) => sport.id));
    const missing = sportIds.filter((sportId) => !existing.has(sportId));
    if (missing.length > 0) {
      throw new BadRequestException(`Invalid sportId(s): ${missing.join(', ')}`);
    }
  }

  private async ensureVenuesExist(venueIds: string[]) {
    if (venueIds.length === 0) {
      return;
    }
    const venues = await this.prisma.venue.findMany({
      where: { id: { in: venueIds } },
      select: { id: true },
    });

    const existing = new Set(venues.map((venue) => venue.id));
    const missing = venueIds.filter((venueId) => !existing.has(venueId));
    if (missing.length > 0) {
      throw new BadRequestException(`Invalid venueId(s): ${missing.join(', ')}`);
    }
  }

  async getRankingPreferences(userId: string) {
    const [sports, venues, availability] = await Promise.all([
      this.prisma.userSportPreference.findMany({ where: { userId } }),
      this.prisma.userPreferredVenue.findMany({ where: { userId } }),
      this.prisma.userAvailabilitySlot.findMany({ where: { userId } }),
    ]);

    return {
      sportPreferences: sports,
      preferredVenues: venues,
      availability,
      hasPreferences: sports.length > 0 || venues.length > 0 || availability.length > 0,
    };
  }
}
