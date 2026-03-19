# Blueprint: Divid-o (Splitwise Clone)

## North Star
Create a fully free website (desktop & mobile responsive, mobile-first) with Splitwise capabilities:
- Receipt scanning
- Simplify debts algorithm
- Split different payments to different users within a group

## Integrations
- Supabase (Auth, Database, Storage)
- Browser notifications
- WhatsApp/Email bot (Future/Optional)

## Source of Truth
- Supabase

## Delivery Payload
- Web application (Next.js / React) targeting Vercel deployment.

## Behavioral Rules
- Rule 01: "Cents-Only" Constraint (Strict 2-decimal math, NUMERIC(12,2)).
- Rule 02: Total Mutability (Expenses editable, trigger immediate recalculation).
- Rule 03: "Penny-Rest" Determinism (Remainder penny goes to Payer).
- Rule 04: Privacy-First Storage (Supabase Private Buckets, 60min signed URLs).

## Phases
### Phase 1: B - Blueprint
- [x] Discovery Questions
- [x] Initial Data Schema (`gemini.md`)
- [x] Approve Payload & Schema
- [x] Confirm Web Framework (Next.js & Supabase)

### Phase 2: L - Link
- [ ] Initialize frontend repository
- [ ] Connect Supabase & test Auth + DB connection

### Phase 3: A - Architect & Execute
- [ ] Core UI Layout (Mobile-first)
- [ ] Groups & Users Management
- [ ] Expense Creation & Splitting Logic
- [ ] Simplify Debts Algorithm
- [ ] Receipt Scanning (OCR Integration)

### Phase 4: S - Stylize
- [ ] Polish UI/UX
- [ ] Notification System

### Phase 5: T - Trigger
- [ ] Final Deployment
