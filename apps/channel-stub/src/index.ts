import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'reach-channel-stub' });
});

const CRM_RECEIPT_URL = process.env.CRM_RECEIPT_URL || 'http://localhost:3000/api/receipts';

interface CommPayload {
  communication_id: string;
  customer_id: string;
  campaign_id: string;
  channel: string;
  message: string;
}

interface EventPayload {
  communication_id: string;
  customer_id: string;
  campaign_id: string;
  event_type: 'DELIVERED' | 'OPENED' | 'CLICKED' | 'FAILED';
  timestamp: string;
}

// Simulated network call to send receipt to CRM
async function sendReceipt(payload: EventPayload, attempt = 1): Promise<void> {
  try {
    const res = await fetch(CRM_RECEIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`CRM responded with ${res.status}`);
    }
    
    // Emit to socket for real-time UI updates
    io.emit('delivery_event', payload);
  } catch (err: any) {
    console.error(`[Attempt ${attempt}] Failed to send receipt for ${payload.communication_id}:`, err.message);
    if (attempt < 4) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`Retrying in ${delay}ms...`);
      setTimeout(() => sendReceipt(payload, attempt + 1), delay);
    } else {
      console.error(`DEAD LETTER: Dropped event ${payload.event_type} for ${payload.communication_id}`);
    }
  }
}

// Async callback engine
function scheduleEvents(comm: CommPayload) {
  const now = new Date();
  
  // Base event payload generator
  const createEvent = (type: EventPayload['event_type'], delayMs: number) => {
    setTimeout(() => {
      sendReceipt({
        communication_id: comm.communication_id,
        customer_id: comm.customer_id,
        campaign_id: comm.campaign_id,
        event_type: type,
        timestamp: new Date().toISOString(),
      });
    }, delayMs);
  };

  // Simulate delivery probability (90% success)
  const isDelivered = Math.random() < 0.90;
  
  if (!isDelivered) {
    createEvent('FAILED', 500 + Math.random() * 1000); // Fail within 0.5-1.5s
    return;
  }

  // Delivered within 1-3 seconds
  createEvent('DELIVERED', 1000 + Math.random() * 2000);

  // If delivered, 40% chance of being opened within 3-8 seconds
  const isOpened = Math.random() < 0.40;
  if (isOpened) {
    createEvent('OPENED', 3000 + Math.random() * 5000);

    // If opened, 20% chance of being clicked within 8-15 seconds
    const isClicked = Math.random() < 0.20;
    if (isClicked) {
      createEvent('CLICKED', 8000 + Math.random() * 7000);
    }
  }
}

app.post('/send', (req, res) => {
  const communications: CommPayload[] = req.body.communications || [];
  
  if (!Array.isArray(communications)) {
    return res.status(400).json({ error: 'Expected array of communications' });
  }

  console.log(`Received batch of ${communications.length} messages`);

  // Acknowledge receipt immediately
  res.status(202).json({ 
    success: true, 
    message: 'Batch accepted for delivery processing',
    count: communications.length 
  });

  // Process asynchronously
  communications.forEach(comm => {
    scheduleEvents(comm);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Channel Stub Service running on port ${PORT}`);
});

export { app, io, server };
