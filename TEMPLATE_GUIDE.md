# 📱 WhatsApp Template Creation Guide — Bheemas Fitness

> Create these 4 templates in **Meta Business Manager** → WhatsApp Manager → Message Templates
>
> **Account Settings:**
> - Category: Choose as noted per template below
> - Language: English (en)

---

## Template 1: `membership_invoice`

> **Category:** UTILITY
> **Name:** `membership_invoice`

### Body Text (copy this exactly):
```
Hey {{1}}! 💪 Thanks for subscribing to Bheemas Fitness & CrossFit!

Here are your membership details:

📋 Plan: {{2}}
📅 Start Date: {{3}}
📅 Expiry Date: {{4}}
💰 Total Amount: {{5}}
✅ Paid: {{6}}

🧾 View your full invoice & bill here:
{{7}}

Stay fit, stay strong! 🔥
— Bheemas Fitness & CrossFit
```

### Parameters Mapping:
| Parameter | What it receives | Example |
|-----------|-----------------|---------|
| `{{1}}` | Member Name | Rahul |
| `{{2}}` | Plan Name | 3 Months |
| `{{3}}` | Join Date | 2026-06-20 |
| `{{4}}` | Expiry Date | 2026-09-20 |
| `{{5}}` | Total Amount | ₹5000 |
| `{{6}}` | Paid Amount | ₹3000 |
| `{{7}}` | Bill Link URL | https://bheemascrossfit.com/bill/abc123 |

### Sample Values (for Meta approval):
```
{{1}} = Rahul
{{2}} = 3 Months
{{3}} = 2026-06-20
{{4}} = 2026-09-20
{{5}} = ₹5000
{{6}} = ₹3000
{{7}} = https://bheemascrossfit.com/bill/abc123
```

---

## Template 2: `expiry_reminder_week`

> **Category:** UTILITY
> **Name:** `expiry_reminder_week`

### Body Text (copy this exactly):
```
Hi {{1}}! 👋

This is a friendly reminder from Bheemas Fitness & CrossFit.

Your membership is expiring on {{2}} — that's just {{3}} days away!

📋 Current Plan: {{4}}

🔄 Renew your membership today to continue your fitness journey without any break!

Visit us at the gym or contact us to renew.

Keep pushing! 💪
— Bheemas Fitness & CrossFit
```

### Parameters Mapping:
| Parameter | What it receives | Example |
|-----------|-----------------|---------|
| `{{1}}` | Member Name | Rahul |
| `{{2}}` | Expiry Date | 2026-06-27 |
| `{{3}}` | Days Remaining | 5 |
| `{{4}}` | Plan Name | 3 Months |

### Sample Values (for Meta approval):
```
{{1}} = Rahul
{{2}} = 2026-06-27
{{3}} = 5
{{4}} = 3 Months
```

---

## Template 3: `expiry_reminder_day`

> **Category:** UTILITY
> **Name:** `expiry_reminder_day`

### Body Text (copy this exactly):
```
Hi {{1}}! ⚠️

Your Bheemas Fitness membership expires TOMORROW ({{2}})!

📋 Plan: {{4}}
⏰ Days left: {{3}}

Don't let your progress stop! 🔥 Renew now to keep your streak going.

Visit us today or call us to renew instantly.

— Bheemas Fitness & CrossFit 💪
```

### Parameters Mapping:
| Parameter | What it receives | Example |
|-----------|-----------------|---------|
| `{{1}}` | Member Name | Rahul |
| `{{2}}` | Expiry Date | 2026-06-21 |
| `{{3}}` | Days Remaining | 1 |
| `{{4}}` | Plan Name | 1 Month |

### Sample Values (for Meta approval):
```
{{1}} = Rahul
{{2}} = 2026-06-21
{{3}} = 1
{{4}} = 1 Month
```

---

## Template 4: `campaign_message`

> **Category:** MARKETING
> **Name:** `campaign_message`

### Body Text (copy this exactly):
```
Hey {{1}}! 🎉

{{2}}

{{3}}

Visit Bheemas Fitness & CrossFit for more details!

— Bheemas Fitness & CrossFit 💪
```

### Parameters Mapping:
| Parameter | What it receives | Example |
|-----------|-----------------|---------|
| `{{1}}` | Member Name | Rahul |
| `{{2}}` | Campaign Title | 🏋️ Summer Discount — 50% OFF! |
| `{{3}}` | Campaign Body | Get 50% off on all 6-month and 12-month plans this June! Offer valid till 30th June. Rush now! |

### Sample Values (for Meta approval):
```
{{1}} = Rahul
{{2}} = Summer Discount — 50% OFF!
{{3}} = Get 50% off on all 6-month and 12-month plans this June! Offer valid till 30th June. Rush now!
```

---

## ⚡ Quick Steps to Create in Meta Business Manager

1. Go to **business.facebook.com** → your Business Account
2. Click **WhatsApp Manager** (left sidebar)
3. Go to **Message Templates** tab
4. Click **Create Template**
5. Fill in:
   - **Name**: exactly as shown above (e.g. `membership_invoice`)
   - **Category**: as noted (UTILITY or MARKETING)
   - **Language**: English
6. In the **Body** section, paste the text above
7. Add **Sample Values** for each `{{n}}` parameter (required for approval)
8. Submit for review — usually approved in minutes for UTILITY, may take longer for MARKETING

> ⚠️ **Important Notes:**
> - Template names must be **lowercase with underscores** — no spaces or special chars
> - UTILITY templates get approved faster than MARKETING
> - The parameter numbers `{{1}}`, `{{2}}`, etc. must be sequential starting from 1
> - Don't change parameter order — the bot sends them in the exact order shown above
> - If Meta rejects a template, adjust the text and resubmit (keep parameter structure same)
