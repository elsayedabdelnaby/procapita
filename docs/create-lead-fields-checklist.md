# Create Lead – Fields Checklist

This document lists the fields on the **Create Lead** form and recommends which should be **Mandatory (Required)** or **Optional**, plus validation rules and UX suggestions. You can copy these rules to your product spec or testing checklist.

---

## Field List

| Field Name | Required / Optional | Validation / Rules | Example / Placeholder | Notes / UX |
|------------|----------------------|---------------------|------------------------|------------|
| **Reseller Company** | Required | Must be a valid company ID from the tenant list | Select reseller company | Default to user’s company in multi-tenant. Disable when single-tenant. |
| **Full Name** | Optional* | If provided: min 2 chars, trim whitespace | e.g. Ahmed Ali | Prefer to collect, but allow creating a lead with phone only. Show “Unknown” when empty. |
| **Phone (primary)** | Required (preferred) | Digits only (country code optional). Normalize format. Check for duplicates. | +2011xxxxxxx | If missing, require Email. Validate length by country. Show duplicate-suggestion modal when match found. |
| **WhatsApp Phone** | Optional | Same rules as Phone | Same as phone | Option to auto-copy from Phone when empty (with toggle). |
| **Email** | Optional | Valid email format. Optional duplicate check | name@example.com | Validate format; optionally suggest duplicates. |
| **Confirm Duplicate** (checkbox) | Optional | If checked, allow creating despite duplicate warning | — | Shown when a possible duplicate is detected; may require a short reason. |
| **Campaign** | Optional | If selected, must exist in Campaign list | Select a campaign | Used for attribution. |
| **Lead Source** | Required | Must exist in Lead Sources list | Select a lead source | Needed for reporting and funnels. |
| **Lead Status** | Required | Must exist in Lead Status list. May trigger workflows | Select a lead status | Some statuses may require Next Follow-up or notes. |
| **Lead Stage** | Optional (recommended) | If stages are enabled, select one. Allow “No stage” when none exist | Select stage | If “No lead stages available”, indicate that admin must add stages. |
| **Assigned To** | Required | Must be a valid, active user. Default to round-robin or owner | Select user… | If unassigned, use queue or show validation error. |
| **Next Follow-up** | Optional / Conditional | Date/time (e.g. dd-mm-yyyy \| hh:mm AM/PM). Required when status demands it | dd-mm-yyyy \| hh:mm AM/PM | No past dates. Create reminder when set. |
| **Last Follow-up** | Read-only | Set by system on follow-up | Read-only | Show timezone; show “Never” when empty. |
| **Notes** | Optional | Free text, max length (e.g. 2000 chars) | Additional notes about the lead… | Consider autosave draft on navigation. |
| **Cancel Reason** | Optional / Conditional | Required when status = Cancelled | Select cancel reason… | Options managed by admin. |
| **Governorate / Location** | Optional | Select from predefined list | Select governorate… | Useful for regional filtering. |
| **Feedback Comment** | Optional | Free text | Enter lead status comment… | Shown in audits and lead timeline. |
| **Feedback Count** | Read-only | Incremented by system on updates | 0 | Display only. |

---

## Validation & UX Recommendations

1. **Duplicate detection**  
   Run server-side duplicate checks on Phone and Email. On match, show a modal with: existing lead(s), “View existing”, “Merge”, and “Create anyway” (with Confirm Duplicate and optional reason).

2. **Conditional required fields**  
   Support rules like: “If Lead Status = Contacted, then Next Follow-up is required.” Apply the same rules on client and server.

3. **Inline errors and messages**  
   Show validation messages next to fields (e.g. “Phone is required”, “Enter a valid email”). Avoid full-page reloads; keep form data on validation errors.

4. **Defaults**  
   Default **Assigned To** to the creating user or to a queue; default **Reseller Company** to the user’s company. Offer to auto-copy Phone to WhatsApp when WhatsApp is empty.

5. **Accessibility and mobile**  
   Use clear labels, ARIA where needed, and touch-friendly controls for date/time.

6. **Audit and logging**  
   Log who created the lead, when, and notable field changes for support and compliance.

---

## Suggested Error Messages

| Scenario | Message |
|----------|---------|
| No phone and no email | **Phone is required.** (or require email when phone is missing, and show appropriate message) |
| Invalid phone format | **Enter a valid phone number.** |
| Invalid email format | **Enter a valid email address.** |
| No assignee | **Assigned To is required.** |
| No lead source | **Lead Source is required.** |
| Past follow-up date | **Next Follow-up cannot be in the past.** |

---

*Use this checklist to align backend validation, frontend rules, and QA tests.*
