# Bug: Duplicate leads created despite confirming duplicate on Create Lead

**Status:** Open (to be fixed)

---

## Summary

When a user creates a lead with data that matches an existing lead and then confirms the duplicate in the system prompt, the application still creates a **second** lead record instead of preventing the duplicate (e.g. by blocking creation or merging with the existing lead). The result is two separate records for the same contact in the Leads list.

---

## Preconditions

- User is logged into Dopave CRM and is on the “All Companies” view.
- A lead with the same identifier data (e.g. name “Mr. Ariel ABR”, phone “54054540”) already exists.
- User can access **Marketing → Leads** and opens **Create Lead**.

---

## Steps to Reproduce

1. Go to **Marketing → Leads → Create Lead**.
2. Fill the form with data that matches an existing lead (e.g. Full Name: “Mr. Ariel”, Company: “ABR”, Phone: “54054540”).
3. Click **Save**.
4. When the “Confirm Duplicate” prompt appears (system has detected a possible duplicate), click **Confirm Duplicate** to proceed.
5. After save, go to the **All Leads** list (Dashboard or Leads list).

---

## Actual Result

- **Two** lead records exist for the same contact data.
- Both entries (e.g. “test ABR” leads) appear in the Leads list, differing only by internal lead ID.
- The system counts them as 2 New Leads (e.g. “test ABR Super” appears twice with the same contact details).

---

## Expected Result

- After the user confirms the duplicate, the system must **not** create a second lead.
- Behaviour should be one of:
  - **Block creation** and show a clear message that a duplicate exists, with a link to the existing lead, or
  - **Merge** the new data into the existing lead (if product supports merge).
- In all cases, only **one** lead record should exist for that contact after the flow.

---

## Suggested Fix Direction

- When the user chooses “Confirm Duplicate”, the server should either:
  - Reject the create request and return the existing lead (or a “duplicate” response) so the UI can redirect or show the existing record, or
  - Treat the action as “update existing lead” (merge) instead of creating a new one.
- Ensure duplicate logic (phone/email/company) is applied **before** persisting a new lead, and that “Confirm Duplicate” does not bypass this in a way that still inserts a new row.
