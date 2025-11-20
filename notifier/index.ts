import db from "./db.js";
import { sendPush } from "./push.js";

async function loop() {
  const jobs = await db.getPendingJobs(Date.now());

  for (const job of jobs) {
    await sendPush(job.userId, job.payload);
    await db.markJobSent(job.id);
  }
}

async function main() {
  while (true) {
    await loop();
    await new Promise(r => setTimeout(r, 1000));
  }
}

main();