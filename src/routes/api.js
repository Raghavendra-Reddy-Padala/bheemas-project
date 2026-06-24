import { Router } from "express";
import {
  collection, getDocs, getDoc, doc, addDoc, updateDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase.js";
import { sendInvoiceMessage, sendBulkCampaign } from "../services/whatsapp.js";
import { runExpiryCheck, sendSingleReminder } from "../services/reminder.js";

const router = Router();

// ─────────────────────────────────────────────
// POST /api/send-invoice
// Called by CRM after member creation.
// Body: { memberId: string }
// ─────────────────────────────────────────────
router.post("/send-invoice", async (req, res) => {
  try {
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: "memberId is required" });
    }

    // Fetch member from Firestore
    const memberSnap = await getDoc(doc(db, "members", memberId));
    if (!memberSnap.exists()) {
      return res.status(404).json({ error: "Member not found" });
    }

    const member = { id: memberSnap.id, ...memberSnap.data() };

    if (!member.mobile) {
      return res.status(400).json({ error: "Member has no mobile number" });
    }

    const result = await sendInvoiceMessage(member);

    // Log the notification
    await addDoc(collection(db, "whatsapp_logs"), {
      type: "invoice",
      memberId: member.id,
      memberName: member.name,
      phone: member.mobile,
      success: result.success,
      messageId: result.messageId || null,
      error: result.error || null,
      sentAt: new Date().toISOString(),
    });

    if (result.success) {
      return res.json({ success: true, messageId: result.messageId });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    console.error("POST /api/send-invoice error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// POST /api/send-campaign
// Called by CRM campaign page.
// Body: { title, body, target: "all" | "active" | "expired", memberIds?: string[] }
// ─────────────────────────────────────────────
router.post("/send-campaign", async (req, res) => {
  try {
    const { title, body: campaignBody, target = "all", memberIds, imageUrl } = req.body;

    if (!title || !campaignBody) {
      return res.status(400).json({ error: "title and body are required" });
    }

    // Fetch members
    const membersSnap = await getDocs(collection(db, "members"));
    let members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Filter by target
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      members = members.filter((m) => memberIds.includes(m.id));
    } else if (target === "active") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      members = members.filter((m) => m.expiryDate && new Date(m.expiryDate) >= today);
    } else if (target === "expired") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      members = members.filter((m) => m.expiryDate && new Date(m.expiryDate) < today);
    }

    // Filter out members without mobile
    const recipients = members
      .filter((m) => m.mobile)
      .map((m) => ({ phone: m.mobile, name: m.name, id: m.id }));

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No recipients found for the selected target" });
    }

    // Create campaign record
    const campaignDoc = {
      title,
      body: campaignBody,
      target,
      totalRecipients: recipients.length,
      sent: 0,
      failed: 0,
      status: "sending",
      createdAt: new Date().toISOString(),
    };
    if (imageUrl) campaignDoc.imageUrl = imageUrl;
    const campaignRef = await addDoc(collection(db, "campaigns"), campaignDoc);

    // Send response immediately, process in background
    res.json({
      success: true,
      campaignId: campaignRef.id,
      totalRecipients: recipients.length,
      message: "Campaign started. Messages are being sent.",
    });

    // Process bulk send in background
    const result = await sendBulkCampaign(
      recipients,
      title,
      campaignBody,
      async (current, total, msgResult) => {
        // Update progress every 10 messages or on last message
        if (current % 10 === 0 || current === total) {
          try {
            await updateDoc(doc(db, "campaigns", campaignRef.id), {
              sent: result ? undefined : current, // Will be set at end
              lastUpdated: new Date().toISOString(),
            });
          } catch (_) { /* non-critical */ }
        }
      },
      imageUrl || null
    );

    // Update final status
    await updateDoc(doc(db, "campaigns", campaignRef.id), {
      sent: result.sent,
      failed: result.failed,
      status: "completed",
      completedAt: new Date().toISOString(),
    });

    console.log(`📢 Campaign "${title}" completed: ${result.sent} sent, ${result.failed} failed`);
  } catch (err) {
    console.error("POST /api/send-campaign error:", err.message);
    // Response may already be sent if it failed during background processing
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
});

// ─────────────────────────────────────────────
// GET /api/campaigns
// Fetch all campaigns for the CRM history view.
// ─────────────────────────────────────────────
router.get("/campaigns", async (req, res) => {
  try {
    const snap = await getDocs(
      query(collection(db, "campaigns"), orderBy("createdAt", "desc"))
    );
    const campaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ campaigns });
  } catch (err) {
    // If orderBy fails (no index), fall back to unordered
    try {
      const snap = await getDocs(collection(db, "campaigns"));
      const campaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      campaigns.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return res.json({ campaigns });
    } catch (err2) {
      console.error("GET /api/campaigns error:", err2.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
});

// ─────────────────────────────────────────────
// GET /api/campaign-status/:id
// Check status of a specific campaign.
// ─────────────────────────────────────────────
router.get("/campaign-status/:id", async (req, res) => {
  try {
    const snap = await getDoc(doc(db, "campaigns", req.params.id));
    if (!snap.exists()) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    return res.json({ campaign: { id: snap.id, ...snap.data() } });
  } catch (err) {
    console.error("GET /api/campaign-status error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// POST /api/send-reminder-manual
// Manually trigger the expiry reminder check.
// ─────────────────────────────────────────────
router.post("/send-reminder-manual", async (req, res) => {
  try {
    const summary = await runExpiryCheck();
    return res.json({ success: true, summary });
  } catch (err) {
    console.error("POST /api/send-reminder-manual error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});
// ─────────────────────────────────────────────
// POST /api/send-reminder/:memberId
// Manually send an expiry reminder to ONE member, regardless
// of the 1-day/7-day window or whether one was already sent today.
// ─────────────────────────────────────────────
router.post("/send-reminder/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;
    const result = await sendSingleReminder(memberId);

    if (result.success) {
      return res.json({ success: true, messageId: result.messageId, days: result.days });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    console.error("POST /api/send-reminder/:memberId error:", err.message);
    if (err.message === "Member not found") {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes("no mobile") || err.message.includes("no expiry")) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// GET /api/health
// Health check endpoint.
// ─────────────────────────────────────────────
router.get("/health", (req, res) => {
  return res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
