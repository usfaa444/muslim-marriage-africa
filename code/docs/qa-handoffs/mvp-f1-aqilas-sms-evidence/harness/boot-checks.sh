#!/bin/bash
OUT="$1"
runb() { name="$1"; shift; expect="$1"; shift
  cid=$(docker run -d --label qa=boot --network ankanu-qa_default -e DATABASE_URL=postgres://ankanu@postgres:5432/ankanu -e REDIS_HOST=redis -e REDIS_PORT=6379 -e ANKANU_PUBLIC_ORIGIN=http://localhost:4021 -e ANKANU_ALLOWED_ORIGINS=http://localhost:4021 -e S3_ENDPOINT=http://bucket:9000 -e S3_BUCKET=ankanu -e S3_ACCESS_KEY_ID=x -e S3_SECRET_ACCESS_KEY=y "$@" api:qa)
  for i in $(seq 1 40); do
    st=$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo gone)
    if [ "$st" != running ]; then break; fi
    if docker logs "$cid" 2>&1 | grep -qE 'successfully started|[Ww]orker'; then break; fi
    sleep 0.5
  done
  echo "=== $name (expect: $expect) state=$(docker inspect -f '{{.State.Status}} exit={{.State.ExitCode}}' "$cid" 2>/dev/null || echo exited-and-removed)" | tee -a "$OUT"
  docker logs "$cid" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -vE "RouterExplorer|InstanceLoader|RoutesResolver|^\s+at |^$|^Node.js|\^" | head -n 8 | cut -c1-250 | tee -a "$OUT"
  docker kill "$cid" >/dev/null 2>&1
}
REAL="-e RECAPTCHA_SITE_KEY=real-site-key-qa -e RECAPTCHA_SECRET_KEY=real-secret-key-qa"
TEST="-e RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI -e RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe -e RECAPTCHA_ALLOW_TEST_KEYS=1"


runb B7-bad-url "refuse AQILAS_API_URL, key value not echoed" $TEST -e SMS_PROVIDER=aqilas -e AQILAS_API_KEY=SECRETKEYVALUE -e AQILAS_API_URL=ftp://sms.test
runb B8-blank-key "refuse" $TEST -e SMS_PROVIDER=aqilas "-e AQILAS_API_KEY=   "
runb B9-worker-ignores-sms "worker boots even with unknown SMS provider" $TEST -e PROCESS_ROLE=worker -e SMS_PROVIDER=twilio
