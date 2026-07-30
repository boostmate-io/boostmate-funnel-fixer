## Root cause — what I found before touching anything

Evidence gathered read-only:

| Check | Result |
|---|---|
| Sender domain `notify.app.boostmate.io` | Verified |
| Project email setup | **"Send path not ready — Timed out waiting for email delivery path verification"** |
| Queue infrastructure (`pgmq.q_auth_emails`, `_dlq`, `q_transactional_emails`) | Exists, all empty |
| `email_send_state` | 1 config row present |
| `suppressed_emails` | 0 rows — nothing is blocking the test address |
| `cron.job` | empty (expected — on-demand scheduling with empty queues) |
| `auth-email-hook` invocation logs | **none, ever** — only boot/shutdown from deploys |
| `process-email-queue` invocation logs | **none, ever** |

So: infrastructure reconciliation did create the database side correctly. Nothing failed in SQL. The break is that **neither edge function has ever been invoked once**, which is exactly the signature of the platform's delivery-path verification never reaching the project.

The one non-default deviation in this project is in `supabase/config.toml`:

```toml
[functions.process-email-queue]
  verify_jwt = true
```

That block was added during earlier setup work. Lovable-managed email functions are expected to deploy with the default `verify_jwt = false` and do their own auth check in code (which `process-email-queue` already does — it parses the bearer token and rejects anything that is not `service_role`). With `verify_jwt = true`, the API gateway rejects the platform's delivery-path verification call **before** it reaches the function — which is precisely why there are zero invocation logs rather than a 401 logged inside the function.

Verification times out → project email setup never flips to active → the Supabase auth hook is never pointed at `auth-email-hook` → signup produces an auth event with no delivery path → account created, no email. That chain accounts for every symptom, including the ones from the very first test.

Answering your list directly:
- Infrastructure reconciliation: **completed** (DB objects all present).
- Required function missing/not deployed: **no**, both are deployed.
- `auth-email-hook` failed to register: **yes, as a consequence** — registration is gated on the send path verifying.
- Platform reconciliation failed: **it timed out**, caused by our own gateway config, not a platform defect.
- Platform-side issue: **no evidence of one.**

## Fix

1. Remove the `[functions.process-email-queue] verify_jwt = true` override from `supabase/config.toml` so it deploys with the managed default. Its in-code `service_role` claim check stays — the function is still not publicly usable.
2. Redeploy `process-email-queue` and `auth-email-hook`.
3. Re-run email infrastructure setup so the platform re-attempts delivery-path verification, then re-check status until it reports active (not "setting up", not "timed out"). If it times out a second time with the gateway override gone, that *is* platform-side and I will say so with the exact status instead of guessing again.

## Remove the wrong-lane fallback

Once the auth lane is active:
- `auth-signup-email` stops calling the send API directly with `purpose: "transactional"`. Signup and resend go through native auth (`signUp` / `auth.resend`) so the auth run, the hook, and the auth queue are used. Account-name generation moves into the existing signup metadata (already handled by the `handle_new_user_role` trigger via `account_name`).
- No unsubscribe token is added to any auth email.
- `confirm-auth-email` / `/auth/confirm` custom HMAC route is retired in favour of the standard confirmation link, so there is one confirmation path, not two.
- `AuthModal` keeps the honest failure states: no "check your email" unless the send was accepted, plus the existing inline "account exists, resend confirmation" handling.

## End-to-end verification

With a brand-new address (not `markwalkercoaching1@gmail.com`, which now carries failed runs), I will produce evidence for each link:

1. Auth user created — auth log entry
2. `auth-email-hook` invoked — function invocation log with the signup action type
3. Email queued — row in `email_send_log` with `status = pending` on the `auth_emails` queue
4. Provider accepted — `status = sent`, no `missing_unsubscribe`
5. Gmail receipt — you confirm arrival and Boostmate branding
6. Confirmation link confirms the account and lands in the right flow
7. Resend delivers a second email
8. Already-confirmed address is rejected with the inline message

I will not call this resolved until steps 1–4 are in the logs and you confirm 5–6.
