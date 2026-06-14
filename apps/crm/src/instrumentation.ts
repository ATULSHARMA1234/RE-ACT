export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // We only want to run the poller once in the Node.js process
    // To prevent hot-reload duplicates in dev, we can attach it to globalThis
    if (!(globalThis as any)._workflowPollerStarted) {
      (globalThis as any)._workflowPollerStarted = true;
      
      console.log('⏱️  Workflow Engine Poller active (10s interval) [Next.js worker]');
      const CRM_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      setInterval(async () => {
        // Step 1: Auto-trigger
        try {
          const triggerRes = await fetch(`${CRM_URL}/api/workflows/auto-trigger`, { method: 'POST' });
          if (triggerRes.ok) {
            const data = await triggerRes.json();
            if (data.triggered > 0) {
              console.log(`[Auto-Trigger] ⚡ ${data.message}`);
            }
          }
        } catch (err: any) {
          if (err.code !== 'ECONNREFUSED') {
            console.error('[Auto-Trigger] Error:', err.message);
          }
        }

        // Step 2: Process-jobs
        try {
          const res = await fetch(`${CRM_URL}/api/workflows/process-jobs`, { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            if (data.processed > 0 || data.failed > 0) {
              console.log(`[Job Processor] ✉️  Processed ${data.processed} jobs, ${data.failed} failed`);
            }
          }
        } catch (err: any) {
          if (err.code !== 'ECONNREFUSED') {
            console.error('[Job Processor] Error:', err.message);
          }
        }
      }, 10000); // Every 10 seconds
    }
  }
}
