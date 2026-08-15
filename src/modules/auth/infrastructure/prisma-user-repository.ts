import { prisma } from "@/shared/db/prisma";
import type { User, UserRepository } from "../domain/user";

function mapUser(row: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  avatarMediaId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return row;
}

export const prismaUserRepository: UserRepository = {
  async count() {
    return prisma.user.count();
  },
  async findById(id) {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? mapUser(row) : null;
  },
  async findByEmail(email) {
    const row = await prisma.user.findUnique({ where: { email } });
    return row ? mapUser(row) : null;
  },
  async create(data) {
    return mapUser(await prisma.user.create({ data }));
  },
  async update(id, data) {
    return mapUser(await prisma.user.update({ where: { id }, data }));
  },
};
