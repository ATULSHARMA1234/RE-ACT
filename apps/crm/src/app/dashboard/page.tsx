import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const [customerCount, campaignCount, commCount, deliveredCount] =
    await Promise.all([
      prisma.customer.count(),
      prisma.campaign.count(),
      prisma.communication.count(),
      prisma.communication.count({ where: { status: "DELIVERED" } }),
    ]);

  const deliveryRate =
    commCount > 0 ? ((deliveredCount / commCount) * 100).toFixed(1) : "0";

  return { customerCount, campaignCount, commCount, deliveryRate };
}

async function getRecentCampaigns() {
  return prisma.campaign.findMany({
    take: 5,
    orderBy: { created_at: "desc" },
    include: {
      segment: { select: { name: true } },
      _count: { select: { communications: true } },
    },
  });
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const recentCampaigns = await getRecentCampaigns();

  return <DashboardClient stats={stats} recentCampaigns={recentCampaigns} />;
}
