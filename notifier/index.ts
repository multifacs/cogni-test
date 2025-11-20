import db from "./db.js";
import { sendPush } from "./push.js";

async function loop() {
  const jobs = await db.getPendingJobs(Date.now());

  for (const job of jobs) {
    try {
      await sendPush(job);
      await db.markJobSent(job.id);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      // Still mark as sent to avoid infinite retries, or implement retry logic
      await db.markJobSent(job.id);
    }
  }
}

async function main() {
  while (true) {
    await loop();
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();