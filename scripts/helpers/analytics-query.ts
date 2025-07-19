import { prisma } from "@/lib/db";

export async function fetchAnalyticsData(startDate: string, endDate: string) {
  return prisma.msmeListing.findMany({
    where: {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    select: {
      name: true,
      category: true,
      valuation: true,
      revenue: true,
      createdAt: true,
    },
  });
}

