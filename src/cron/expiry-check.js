import cron from "node-cron";
import { runExpiryCheck } from "../services/reminder.js";

/**
 * Initialize all cron jobs.
 * 
 * Schedule:
 * - Daily at 9:00 AM IST (3:30 UTC) → expiry reminders
 * 
 * Uses Asia/Kolkata timezone.
 */
export function initCronJobs() {
  // Run expiry check every day at 9:00 AM IST
  cron.schedule("0 9 * * *", async () => {
    console.log(`⏰ [${new Date().toISOString()}] Cron: Running daily expiry check`);
    try {
      const summary = await runExpiryCheck();
      console.log("📊 Cron summary:", summary);
    } catch (err) {
      console.error("💥 Cron expiry check error:", err.message);
    }
  }, {
    timezone: "Asia/Kolkata",
    scheduled: true,
  });

  console.log("⏰ Cron jobs initialized: expiry check at 9:00 AM IST daily");
}
