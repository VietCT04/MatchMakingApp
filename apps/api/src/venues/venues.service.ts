import { Injectable } from '@nestjs/common';
import { findOrThrow } from '../common/crud.utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto.create-venue';
import { UpdateVenueDto } from './dto.update-venue';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.venue.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return findOrThrow(
      () => this.prisma.venue.findUnique({ where: { id } }),
      'Venue not found',
    );
  }

  create(dto: CreateVenueDto) {
    return this.prisma.venue.create({ data: dto });
  }

  async update(id: string, dto: UpdateVenueDto) {
    await this.findOne(id);
    return this.prisma.venue.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.venue.delete({ where: { id } });
    return { deleted: true };
  }
}
