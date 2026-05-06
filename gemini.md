# ⚖️ The Project Constitution (Data Schema & Rules)
*This document is LAW.*

## 🗄️ JSON Data Schema (Source of Truth: Supabase)

### `users`
```json
{
  "id": "uuid (PK)",
  "email": "string (nullable for guests)",
  "username": "string",
  "first_name": "string",
  "last_name": "string",
  "avatar_url": "string",
  "preferred_currency": "string",
  "is_guest": "boolean",
  "created_at": "timestamp"
}
```

### `groups`
```json
{
  "id": "uuid (PK)",
  "name": "string",
  "description": "text",
  "cover_url": "string",
  "created_by": "uuid (FK users)",
  "created_at": "timestamp"
}
```

### `group_members`
```json
{
  "group_id": "uuid (FK groups)",
  "user_id": "uuid (FK users)",
  "joined_at": "timestamp"
}
```

### `expenses`
```json
{
  "id": "uuid (PK)",
  "group_id": "uuid (FK groups, nullable for peer-to-peer)",
  "paid_by": "uuid (FK users)",
  "description": "string",
  "notes": "text (nullable)",
  "amount": "decimal",
  "currency": "string",
  "receipt_url": "string",
  "created_at": "timestamp"
}
```

### `expense_splits`
```json
{
  "expense_id": "uuid (FK expenses)",
  "user_id": "uuid (FK users)",
  "amount_owed": "decimal"
}
```

### `settlements`
```json
{
  "id": "uuid (PK)",
  "group_id": "uuid (FK groups)",
  "paid_by": "uuid (FK users)",
  "paid_to": "uuid (FK users)",
  "amount": "decimal",
  "status": "string (pending, completed)",
  "created_at": "timestamp"
}
```

## 📜 Architectural Invariants & Behavioral Rules
1. **Data-First**: UI changes must not violate the schema. If schema changes, update this file first.
2. **Deterministic Logic**: The "Simplify Debts" algorithm must be thoroughly tested with exact math before deployment.
3. **Behavioral Rule 01 (Cents-Only Constraint)**: All financial inputs, calculations, and DB entries strictly enforce a 2-decimal limit. Use NUMERIC(12,2) in SQL and exact decimal rounding logic in the app.
4. **Behavioral Rule 02 (Total Mutability)**: Expenses remain fully editable and deletable. Changes must trigger immediate recalculation of group net balance.
5. **Behavioral Rule 03 (Penny-Rest Determinism)**: In an indivisible split, the remainder penny is assigned to the Payer. Total splits must always perfectly sum to `expense.amount`.
6. **Behavioral Rule 04 (Privacy-First Storage)**: Receipts containing PII go into Supabase Private Buckets, accessible only via 60-minute signed URLs.
