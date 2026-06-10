import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const rows = text.split('\n').filter(r => r.trim() !== '');
    
    // Assume CSV format: name,email,phone,channel_pref,lifecycle_stage,rfm_score
    const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    const customersToCreate = [];

    for (const row of dataRows) {
      const columns = row.split(',').map(c => c.trim());
      if (columns.length < 2) continue;

      customersToCreate.push({
        name: columns[0] || 'Unknown',
        email: columns[1] || '',
        phone: columns[2] || null,
        channel_pref: columns[3] || 'EMAIL',
        lifecycle_stage: columns[4] || 'NEW',
        rfm_score: columns[5] || 'LOW_VALUE',
      });
    }

    // Upsert to handle existing customers
    const results = [];
    for (const c of customersToCreate) {
      if (!c.email) continue;
      const result = await prisma.customer.upsert({
        where: { email: c.email },
        update: {
          name: c.name,
          phone: c.phone,
          channel_pref: c.channel_pref,
          lifecycle_stage: c.lifecycle_stage,
          rfm_score: c.rfm_score,
        },
        create: c,
      });
      results.push(result);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error('CSV Upload Error:', error);
    return NextResponse.json({ error: 'Failed to process CSV' }, { status: 500 });
  }
}
