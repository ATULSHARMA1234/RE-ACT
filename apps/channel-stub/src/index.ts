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
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'radiance-channel-stub' });
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
  event_type: 'SENT' | 'DELIVERED' | 'OPENED' | 'READ' | 'CLICKED' | 'FAILED';
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

// Async callback engine — models full communication lifecycle
function scheduleEvents(comm: CommPayload) {
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

  // Step 1: SENT — always fires immediately (message accepted for delivery)
  createEvent('SENT', 200 + Math.random() * 300);

  // Step 2: DELIVERED or FAILED (90% success rate)
  const isDelivered = Math.random() < 0.90;
  if (!isDelivered) {
    createEvent('FAILED', 800 + Math.random() * 1500);
    return;
  }
  createEvent('DELIVERED', 1000 + Math.random() * 2000);

  // Step 3: OPENED (40% of delivered)
  const isOpened = Math.random() < 0.40;
  if (!isOpened) return;
  createEvent('OPENED', 3000 + Math.random() * 5000);

  // Step 4: READ (70% of opened — user actually reads the content)
  const isRead = Math.random() < 0.70;
  if (isRead) {
    createEvent('READ', 5000 + Math.random() * 4000);
  }

  // Step 5: CLICKED (20% of opened — user clicks a CTA link)
  const isClicked = Math.random() < 0.20;
  if (isClicked) {
    createEvent('CLICKED', 8000 + Math.random() * 7000);
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
const CRM_URL = process.env.CRM_URL || 'http://localhost:3000';

// ─── Simulation State ───────────────────────────────────────────────
let simulationActive = false;
let simulationInterval: NodeJS.Timeout | null = null;

// Start/Stop simulation endpoints
app.post('/simulation/start', (_req, res) => {
  if (!simulationActive) {
    simulationActive = true;
    startSimulation();
    console.log('[Simulation] ▶️  Started — generating customer events');
  }
  res.json({ status: 'started' });
});

app.post('/simulation/stop', (_req, res) => {
  simulationActive = false;
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  console.log('[Simulation] ⏸️  Stopped');
  res.json({ status: 'stopped' });
});

app.get('/simulation/status', (_req, res) => {
  res.json({ active: simulationActive });
});

function startSimulation() {
  if (simulationInterval) clearInterval(simulationInterval);

  // Generate events every 4-8 seconds
  const tick = async () => {
    if (!simulationActive) return;

    try {
      const res = await fetch(`${CRM_URL}/api/live-feed/auto-simulate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.count > 0) {
          const names = data.events.map((e: any) => `${e.event_type}(${e.customer_name})`).join(', ');
          console.log(`[Simulator] 🎯 ${data.count} events: ${names}`);
        }
      }
    } catch (err: any) {
      if (err.code !== 'ECONNREFUSED') {
        console.error('[Simulator] Error:', err.message);
      }
    }
  };

  // Use random interval between 4-8 seconds
  const scheduleNext = () => {
    if (!simulationActive) return;
    const delay = 4000 + Math.floor(Math.random() * 4000);
    simulationInterval = setTimeout(async () => {
      await tick();
      scheduleNext();
    }, delay);
  };

  // Fire immediately, then schedule
  tick();
  scheduleNext();
}

server.listen(PORT, () => {
  console.log(`🚀 Channel Stub Service running on port ${PORT}`);
  console.log(`📡 Event Simulator available — POST /simulation/start to begin`);
});

export { app, io, server };
