import { NotFoundException } from '@nestjs/common';

export async function findOrThrow<T>(
  findOne: () => Promise<T | null>,
  notFoundMessage: string,
): Promise<T> {
  const entity = await findOne();
  if (!entity) {
    throw new NotFoundException(notFoundMessage);
  }
  return entity;
}
