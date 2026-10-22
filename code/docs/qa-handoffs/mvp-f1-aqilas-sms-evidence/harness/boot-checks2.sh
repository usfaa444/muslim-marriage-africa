#!/bin/bash
OUT="$1"
runb() { name="$1"; shift; expect="$1"; shift
  cid=$(docker run -d --label qa=boot --network ankanu-qa_default -e DATABASE_URL=postgres://ankanu@postgres:5432/ankanu -e REDIS_HOST=redis -e REDIS_PORT=6379 -e ANKANU_PUBLIC_ORIGIN=http://localhost:4021 -e ANKANU_ALLOWED_ORIGINS=http://localhost:4021 -e S3_ENDPOINT=http://bucket:9000 -e S3_BUCKET=ankanu -e S3_ACCESS_KEY_ID=x -e S3_SECRET_ACCESS_KEY=y "$@" api:qa2)
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
NL=$'\n'; CR=$'\r'; TAB=$'\t'
runb B1-aqilas-no-key "refuse, names AQILAS_API_KEY" $TEST -e SMS_PROVIDER=aqilas
runb B2-unknown-provider "refuse, value not echoed" $TEST -e SMS_PROVIDER=twilio-SECRETVALUE
runb B3-prod-log-explicit "refuse log SMS in production" $REAL -e SMS_PROVIDER=log
runb B4-prod-unset "refuse log SMS in production" $REAL
runb B5-prod-aqilas-ok "boots, production-valid" $REAL -e SMS_PROVIDER=aqilas -e AQILAS_API_KEY=test-key
runb B6-staging-log-optin "boots" $TEST -e SMS_PROVIDER=log
runb B7-bad-url "refuse URL, key not echoed" $TEST -e SMS_PROVIDER=aqilas -e AQILAS_API_KEY=SECRETKEYVALUE -e AQILAS_API_URL=ftp://sms.test
runb B8-blank-key "refuse" $TEST -e SMS_PROVIDER=aqilas -e "AQILAS_API_KEY=   "
runb B10-key-embedded-newline "F-2: refuse, names AQILAS_API_KEY only" $TEST -e SMS_PROVIDER=aqilas -e "AQILAS_API_KEY=abcSECRET${NL}defSECRET"
runb B11-key-embedded-CR "F-2: refuse" $TEST -e SMS_PROVIDER=aqilas -e "AQILAS_API_KEY=abcSECRET${CR}defSECRET"
runb B12-key-trailing-newline "F-2: refuse (pasted with newline)" $TEST -e SMS_PROVIDER=aqilas -e "AQILAS_API_KEY=abcSECRETdef${NL}"
runb B13-key-tab "F-2: refuse" $TEST -e SMS_PROVIDER=aqilas -e "AQILAS_API_KEY=abcSECRET${TAB}def"
runb B14-key-leading-newline "F-2: refuse" $TEST -e SMS_PROVIDER=aqilas -e "AQILAS_API_KEY=${NL}abcSECRETdef"
runb B15-sender-newline "F-2: refuse, names AQILAS_SENDER_ID only" $TEST -e SMS_PROVIDER=aqilas -e AQILAS_API_KEY=test-key -e "AQILAS_SENDER_ID=An${NL}Kanu"
runb B16-good-key-and-sender "boots" $TEST -e SMS_PROVIDER=aqilas -e AQILAS_API_KEY=test-key -e AQILAS_SENDER_ID=AnKanu
runb B17-log-mode-ignores-aqilas-vars "boots (log mode does not read them)" $TEST -e SMS_PROVIDER=log -e "AQILAS_API_KEY=abc${NL}def"
runb B18-key-en-dash-nonlatin1 "probe: key with U+2013 (outside Latin-1)" $TEST -e SMS_PROVIDER=aqilas -e "AQILAS_API_KEY=abc–def"
runb B9-worker-ignores-sms "worker boots even with bad SMS settings" $TEST -e PROCESS_ROLE=worker -e SMS_PROVIDER=aqilas -e "AQILAS_API_KEY=abc${NL}def"
