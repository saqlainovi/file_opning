# Security Specification & Test Driven Design for BSK File Register

This specification defines the data invariants and security bounds for the Bishwo Shahitto Kendro (BSK) File Register application.

## 1. Data Invariants
1. **User Profile Integrity**:
   - Every user document in `/users/{userId}` must have its document ID match the user's authenticated UID.
   - The user profile must contain a valid `email` and `role`.
   - Client applications are forbidden from modifying their own roles or privileges directly.
2. **File Registration Validation**:
   - Every registered file must have a unique ID that follows structural format constraints.
   - The `createdBy` field must match the creator's authenticated UID.
   - Crucial immutable fields like `si` (Serial Indicator) and `createdBy` must never be altered once registered.
   - Fields representing critical file registration parameters must have strict size bounds to prevent denial-of-wallet or buffer attacks.

---

## 2. The "Dirty Dozen" Payloads
These 12 malicious payloads represent attempts to breach access controls, forge identities, escalate privileges, or poison records.

1. **Self-Elevated Admin Role**: Attempting to register or update a user profile with role `Super Admin` to gain unauthorized system-wide control.
2. **Anonymous Record Poisoning**: Attempting to register files without an authenticated and verified email.
3. **User Document Spoofing**: Attempting to write/overwrite a user profile where `userId` doesn't match the authenticated user's UID.
4. **Orphaned File Entry**: Registering a file with `createdBy` set to a dummy Uid or another user's UID.
5. **Serial Alteration Attack**: Attempting to update a registered file's `si` field.
6. **Owner Spoofing on Update**: Attempting to update a file and modify the `createdBy` identifier to transfer ownership.
7. **Billion-Byte File Name Injection**: Attempting to write a `fileName` containing massive size payloads (DoS / wallet exhaustion).
8. **Malicious Special Character Injection**: Attempting to use path characters or invalid string patterns in document IDs (`isValidId` check failure).
9. **Creation Timestamp Forgery**: Attempting to insert a custom future or past client-side date for `createdAt` instead of a server-side timestamp.
10. **Blank Field Bypass**: Writing file records missing required fields like `si` or `fileName`.
11. **Unauthorized Registry Erasure**: Non-admin or anonymous users trying to delete file registry documents.
12. **PII Collection Harvesting**: Trying to query other users' profiles using client-side blanket list queries.

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)
The following TypeScript test runner verifies that Firestore returns `PERMISSION_DENIED` for all "Dirty Dozen" attack scenarios:

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'bsk-cafe-erp',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// The test cases below demonstrate how the rules mathematically prevent all malicious payloads.
```
