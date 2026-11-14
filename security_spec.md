# Security Specification — কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ

## 1. Core Data Invariants
1. **Privilege Separation**: Self-registration (`users/{uid}`) is strictly locked to `role: 'pending'` and `status: 'active'`. Only a verified Super Admin (`info.kulkuri@gmail.com` or an active `super_admin` in `/admins/{uid}`) may write `/admins/{uid}` or modify `role`, `status`, `fullAccess`, or `permissions` on `/users/{uid}`.
2. **PII Isolation**: User emails, phone numbers, and physical addresses live in `/userPrivate/{uid}` and `/memberPrivate/{memberId}`. Unauthenticated visitors and standard members cannot list or read other users' PII.
3. **Financial Immutability & Integer Math**: All monetary values (`amountPoisha`, `totalAmountPoisha`, `currentBalancePoisha`, etc.) are stored as integers (`int`) in Poisha (`1 BDT = 100 Poisha`). Income and Expense documents CANNOT be deleted (`allow delete: if false`); corrections use `status: 'corrected' | 'voided'` with audit logs.
4. **Atomic Serial Counters**: `receiptCounters/{counterId}` enforces strictly increasing integer `lastSeq` via Firestore transactions by authorized finance admins.
5. **Immutable Audit Trail**: `auditLogs/{logId}` is append-only (`allow update, delete: if false`).
6. **Public vs Private Boundary**: Public visitors can read published CMS content (`websiteSettings`, `pages`, `pageSections`, `menus`, `notices`, `news`, `galleries`, `members`, `dashboardSummaries/public`), and submit `contactMessages` (`isRead == false`), without seeing private financial ledgers or PII.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Privilege Escalation on Signup**: `create /users/attacker` with `{ role: "super_admin", status: "active" }` -> DENIED.
2. **Self-Role Mutation on Update**: `update /users/member1` by `member1` changing `{ role: "sub_admin", fullAccess: true }` -> DENIED.
3. **Forged Admin Registry Entry**: `create /admins/attacker` by non-Super-Admin -> DENIED.
4. **Unverified Email Admin Action**: `create /notices/n1` by a user with `email_verified: false` -> DENIED.
5. **PII Harvesting (User Private)**: `list /userPrivate` or `get /userPrivate/otherUid` by non-owner/non-admin -> DENIED.
6. **PII Harvesting (Member Private)**: `get /memberPrivate/m1` by public or standard member -> DENIED.
7. **Financial Record Deletion**: `delete /income/inc1` or `delete /expenses/exp1` even by admin -> DENIED (must void/reverse, never delete).
8. **Audit Log Tampering**: `update /auditLogs/log1` or `delete /auditLogs/log1` -> DENIED.
9. **Shadow Field Injection on Contact Form**: `create /contactMessages/c1` with `{ isRead: true, isAdmin: true }` -> DENIED.
10. **ID Poisoning**: `create /notices/<1500-char-id>` -> DENIED by `isValidId()`.
11. **Negative / Non-Integer Poisha Amount**: `create /income/inc1` with `{ amountPoisha: -500 }` or `{ amountPoisha: 12.345 }` -> DENIED.
12. **Suspended Admin Bypass**: `create /income/inc2` by an admin whose `/admins/{uid}.status == 'suspended'` -> DENIED.
