import {
  collection, getDocs, query, where, doc, setDoc, getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase.js";
import { sendExpiryReminder } from "./whatsapp.js";

/**
 * Calculate days until a given ISO date string from today.
 */
function daysUntil(dateIso) {
  const target = new Date(dateIso);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

/**
 * Generate a unique reminder key to prevent duplicate sends.
 * Format: memberId_type_YYYY-MM-DD
 */
function reminderKey(memberId, type) {
  const today = new Date().toISOString().slice(0, 10);
  return `${memberId}_${type}_${today}`;
}

/**
 * Check if a reminder was already sent today for this member/type.
 */
async function wasReminderSent(memberId, type) {
  const key = reminderKey(memberId, type);
  const ref = doc(db, "whatsapp_reminders", key);
  const snap = await getDoc(ref);
  return snap.exists();
}

/**
 * Mark a reminder as sent.
 */
async function markReminderSent(memberId, type, memberName, phone, result) {
  const key = reminderKey(memberId, type);
  await setDoc(doc(db, "whatsapp_reminders", key), {
    memberId,
    memberName,
    phone,
    type,
    sentAt: new Date().toISOString(),
    success: result.success,
    messageId: result.messageId || null,
    error: result.error || null,
  });
}

/**
 * Run the expiry check for all members.
 * Sends reminders for:
 * - Members expiring in exactly 7 days → expiry_reminder_week
 * - Members expiring in exactly 1 day  → expiry_reminder_day
 *
 * Skips members who already received a reminder today.
 * Returns summary of actions taken.
 */
export async function runExpiryCheck() {
  console.log("🔄 Starting expiry reminder check...");
  const start = Date.now();

  try {
    // Fetch all members
    const membersSnap = await getDocs(collection(db, "members"));
    const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    let weekReminders = 0;
    let dayReminders = 0;
    let skipped = 0;
    let errors = 0;

    for (const member of members) {
      if (!member.expiryDate || !member.mobile) continue;

      const days = daysUntil(member.expiryDate);

      // 1-day reminder: expiring tomorrow
      if (days === 1) {
        const alreadySent = await wasReminderSent(member.id, "day");
        if (alreadySent) {
          skipped++;
          continue;
        }

        const result = await sendExpiryReminder(member, days);
        await markReminderSent(member.id, "day", member.name, member.mobile, result);

        if (result.success) dayReminders++;
        else errors++;

        // Small delay between messages
        await sleep(250);
      }
      // 7-day reminder: expiring in exactly 7 days
      else if (days === 7) {
        const alreadySent = await wasReminderSent(member.id, "week");
        if (alreadySent) {
          skipped++;
          continue;
        }

        const result = await sendExpiryReminder(member, days);
        await markReminderSent(member.id, "week", member.name, member.mobile, result);

        if (result.success) weekReminders++;
        else errors++;

        // Small delay between messages
        await sleep(250);
      }
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    const summary = {
      totalMembers: members.length,
      weekReminders,
      dayReminders,
      skipped,
      errors,
      durationSec: duration,
    };

    console.log(`✅ Expiry check done in ${duration}s:`, summary);
    return summary;
  } catch (err) {
    console.error("❌ Expiry check failed:", err.message);
    throw err;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


/**
 * Send an expiry reminder to a single member, on demand.
 * Bypasses the 1-day/7-day window and the "already sent today" dedupe
 * used by runExpiryCheck — this is an explicit manual action for one
 * member, not part of the scheduled sweep.
 */
export async function sendSingleReminder(memberId) {
  const memberSnap = await getDoc(doc(db, "members", memberId));
  if (!memberSnap.exists()) {
    throw new Error("Member not found");
  }

  const member = { id: memberSnap.id, ...memberSnap.data() };

  if (!member.mobile) {
    throw new Error("Member has no mobile number");
  }
  if (!member.expiryDate) {
    throw new Error("Member has no expiry date");
  }

  const days = daysUntil(member.expiryDate);
  const result = await sendExpiryReminder(member, days);

  // Still log it, tagged as a manual single send, so it shows up
  // in whatsapp_reminders history alongside the automated ones.
  await markReminderSent(member.id, "manual", member.name, member.mobile, result);

  return { ...result, memberId: member.id, memberName: member.name, days };
}