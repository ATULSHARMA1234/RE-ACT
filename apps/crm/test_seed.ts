import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function run() {
  try {
    const segmentId = crypto.randomUUID();
    const s = await prisma.segment.create({
      data: {
        id: segmentId,
        name: "All Customers (Demo)",
        filter_json: { type: "ALL" },
        is_dynamic: true
      }
    });
    console.log("Segment created", s.id);

    const campaignChannels = ["EMAIL", "SMS", "WHATSAPP"];
    for (const channel of campaignChannels) {
      const cid = crypto.randomUUID();
      await prisma.campaign.create({
        data: {
          id: cid,
          name: `Summer Promo - ${channel}`,
          segment_id: segmentId,
          channel: channel,
          message_template: "Hey there! Get 20% off our new summer collection.",
          status: "SENT",
          sent_at: new Date()
        }
      });
      console.log("Campaign created", cid);
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
