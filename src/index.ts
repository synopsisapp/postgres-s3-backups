import { CronJob } from "cron";

import { backup } from "./backup";
import { env } from "./env";

const job = new CronJob(env.BACKUP_CRON_SCHEDULE, async () => {
  try {
    await backup();
  } catch (error) {
    console.error("Error while running backup: ", error)
  }
});

// run backup on start
const runBackup = async () => {
  try {
    await backup();
  } catch (error) {
    console.error("Error while running backup: ", error)
  }
}

// runBackup();
// // start cron
// job.start();

console.log('gtxm')
console.log("Backup cron scheduled...")
