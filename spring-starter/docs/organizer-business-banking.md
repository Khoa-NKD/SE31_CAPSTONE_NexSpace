# Organizer business banking

`GET /api/organizer/business-profile` and `PUT /api/organizer/business-profile` remain restricted to the active, email-verified ORGANIZER who owns an APPROVED profile. Updating contacts or banking does not change legal identity, review outcomes, documents, roles or approval.

The PUT request retains required `address`, `contactEmail`, `contactPhone` and optionally accepts:

```json
{
  "bankDetails": {
    "bankName": "Example Bank",
    "bankAccountHolder": "EXAMPLE COMPANY",
    "bankAccountNumber": "001234567890"
  }
}
```

Bank name and holder are trimmed, nonblank, at most 100 characters. Account numbers preserve leading zeros and accept 6–34 ASCII digits. Omitting `bankDetails` preserves all existing banking data. An omitted or blank number preserves an existing decryptable account; first-time or unreadable legacy accounts require a new number. Clearing a stored bank account is outside this endpoint's scope. Unknown fields remain rejected.

The response adds `bankName`, `bankAccountHolder`, `bankAccountLastFour`, `bankAccountConfigured`, and `bankingAvailable`. It never returns the full account number or ciphertext. These fields describe stored details, not bank ownership verification or payout eligibility. Saving does not initiate payments.

Numbers are encrypted with AES-256-GCM, fresh 12-byte nonces and profile-bound authenticated data, using the existing `bank_account_number` column. Configure `ORGANIZER_BANK_ENCRYPTION_KEY` (Base64 of 32 random bytes), or `app.organizer.bank.encryption-key` in the ignored Local properties. Keep this key separate from JWT credentials and back it up securely. Do not rotate or remove it without an explicit re-encryption plan. Missing or malformed keys disable bank updates while leaving contact updates available. Legacy unreadable values are preserved until the owner explicitly replaces them; they are not interpreted as plaintext numbers.

No schema changes or automatic data migrations are required. Local testing uses mocked repositories and MVC security tests; it does not write to the configured shared database.

## Bank directory selector

The public GET `/api/public/banks` proxies the fixed VietQR bank-list endpoint and returns validated `code`, `bin`, `name`, `shortName`, and `logo` metadata in the existing response envelope. It sends no organizer details or credentials to VietQR. Successful snapshots are cached in memory for one day; a failed refresh retains the last good snapshot and uses a one-minute retry cooldown. Initial failures return sanitized HTTP 503. Requests have connect/request timeouts, no redirects, a 256 KiB body limit and bounded entry counts. Logos are restricted to HTTPS `/img/` paths on VietQR's API/CDN hosts.

The FE selector supports Vietnamese accent-insensitive search, logo fallback, keyboard selection, loading/error/retry states and preserves legacy bank names. Selection saves the provider short name to the existing `bank_name` field; BIN remains directory metadata because no schema change was approved. Bank account-holder lookup is not included; the owner still enters that name manually. The provider catalog may include supported financial services besides banks and is not a guarantee of complete national coverage.
