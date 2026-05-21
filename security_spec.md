# Security Specification: Alpha Vault

## Data Invariants
1. **Profile Privacy**: A user's profile, including their `apiKey` and `email` (PII), is strictly private. Only the authenticated owner (`request.auth.uid == profileId`) can read, write, or update their profile.
2. **Read Control on Balances**: No user can read another user's balance. Access is restricted where `request.auth.uid == balanceId`.
3. **Cheating Prevention**: Balance changes (except initial welcome allocation of 100 AlphaCoin) must bypass direct client updates. They are handled by secure, server-side APIs that validate transaction integrity.
4. **Transaction Integrity**: Every transaction must have valid sender/receiver keys. Users can only query transactions where they are either the sender (`fromUserId == request.auth.uid`) or receiver (`toUserId == request.auth.uid`).

## The "Dirty Dozen" Malicious Payloads (Attempting to bypass security rules)
1. **Identity Spoofing**: Attempt to create/read a profile where document `ID != request.auth.uid`.
2. **API Key Hijacking**: Attempt to query other users' profiles to search or fetch secret `apiKey`.
3. **Balance Inflation**: Client trying to write `amount: 999999` to their own `/balances/{userId}` document.
4. **Balance Stealing**: Client trying to update someone else's balanced amount.
5. **PII Exposure Query**: Querying all emails from the `profiles` collection without an explicit individual document limit.
6. **Forged Transaction Sender**: Creating a transaction doc where `fromUserId = "victim_id"` instead of `request.auth.uid`.
7. **Negative Transaction**: Submitting a transfer with negative or fractional coins like `-50` representing theft.
8. **Shadow Fields Modification**: Injecting a ghost field like `isAdmin: true` into the profile document during creation or update.
9. **Tampering with Timestamps**: Submitting custom future client timestamps for `createdAt` instead of `request.time`.
10. **Orphaned Transactions**: Writing a transaction with a non-existent recipient ID.
11. **Spoofed Admin Role**: Claiming to be an admin by sending metadata flags in custom claims.
12. **Null/Malformed ID Injection**: Injecting raw script triggers or excessively long strings as variables inside path fields.
