import { Injectable } from '@nestjs/common';
import { findOrThrow } from '../common/crud.utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSportDto } from './dto.create-sport';
import { UpdateSportDto } from './dto.update-sport';

@Injectable()
export class SportsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sport.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return findOrThrow(
      () => this.prisma.sport.findUnique({ where: { id } }),
      'Sport not found',
    );
  }

  create(dto: CreateSportDto) {
    return this.prisma.sport.create({ data: dto });
  }

  async update(id: string, dto: UpdateSportDto) {
    await this.findOne(id);
    return this.prisma.sport.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.sport.delete({ where: { id } });
    return { deleted: true };
  }
}
