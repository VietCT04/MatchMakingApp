import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto.create-user';
import { UpdateUserDto } from './dto.update-user';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: this.publicUserSelect(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.publicUserSelect(),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  create(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: dto,
      select: this.publicUserSelect(),
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.publicUserSelect(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  private publicUserSelect() {
    return {
      id: true,
      email: true,
      role: true,
      displayName: true,
      bio: true,
      homeLocationText: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }
}
