import { PrismaClient, Prisma } from "@prisma/client";

export default function (prisma: PrismaClient) {
  return {
    async findAll() {
      return prisma.user.findMany({
        orderBy: {
          id: "asc",
        }
      })
    },
    
    async add(user: Prisma.UserCreateInput) {
      return prisma.user.create({
        data: user
      })
    },

    async deleteAll() {
      return prisma.user.deleteMany({})
    }
  }
}
