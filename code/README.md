Application code, tests, and QA handoffs live here.

## Full local stack

From `code/`, with a host env file outside the repo (see `.factory/config.md`, "Local deployment"):

```bash
docker compose -p ankanu-local --env-file ~/.ankanu/local.env \
  -f compose.yaml -f ~/.ankanu/compose.local.yml up -d --build --wait
```

## SMS (phone codes)

The api sends phone codes through `SmsPort` (`apps/api/src/sms-port.ts`). These settings come from the host env file. Never commit a key.

| Variable | Default | Meaning |
| --- | --- | --- |
| `SMS_PROVIDER` | `log` | `log` writes `otp <code>` to the api log. `aqilas` sends a real SMS. Any other value refuses to boot. |
| `AQILAS_API_KEY` | none | Required when `SMS_PROVIDER=aqilas`, or the api refuses to boot. |
| `AQILAS_SENDER_ID` | `AnKanu` | Sender name shown on the phone. |
| `AQILAS_API_URL` | `https://www.aqilas.com/api/v1/sms` | Point it at a local stub for QA. |

A request times out after 10 seconds. A timeout, network error or non-2xx answer is a failed send: the member gets 503 `L'envoi du code a échoué.` and nothing is stored. With `aqilas`, the log shows only `sms aqilas status <n>`, `sms aqilas timeout` or `sms aqilas network error`, never the code, the phone or the key.

The image runs with `NODE_ENV=production`, so `log` there needs `RECAPTCHA_ALLOW_TEST_KEYS=1` (local and staging set it). A real production boot must use `aqilas`.
