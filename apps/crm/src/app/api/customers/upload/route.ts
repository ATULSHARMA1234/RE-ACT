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
    
    // Updated CSV format: name,email,phone,channel_pref,lifecycle_stage,rfm_score,order_amount,order_product
    const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    const customersToCreate = [];

    for (const row of dataRows) {
      // Split by comma, but handle potential quotes (basic implementation)
      const columns = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (columns.length < 2) continue;

      const orderAmount = columns[6] ? parseFloat(columns[6]) : null;
      const orderProduct = columns[7] || null;

      customersToCreate.push({
        name: columns[0] || 'Unknown',
        email: columns[1] || '',
        phone: columns[2] || null,
        channel_pref: columns[3] || 'EMAIL',
        lifecycle_stage: columns[4] || 'NEW',
        rfm_score: columns[5] || 'LOW_VALUE',
        orderAmount: !isNaN(orderAmount as number) ? orderAmount : null,
        orderProduct: orderProduct
      });
    }

    // Upsert to handle existing customers and add their orders
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
        create: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          channel_pref: c.channel_pref,
          lifecycle_stage: c.lifecycle_stage,
          rfm_score: c.rfm_score,
        },
      });

      // If an order was provided in this row, attach it to the customer
      if (c.orderAmount !== null && c.orderProduct !== null) {
        await prisma.order.create({
          data: {
            customer_id: result.id,
            amount: c.orderAmount,
            product_name: c.orderProduct
          }
        });
      }

      results.push(result);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error('CSV Upload Error:', error);
    return NextResponse.json({ error: 'Failed to process CSV' }, { status: 500 });
  }
}
