import subprocess, sys, re, json
REPO='/home/claude/muslim-marriage-africa/code'
EV='/home/claude/muslim-marriage-africa/code/docs/qa-handoffs/mvp-f1-aqilas-sms-evidence/retest-g2-mutations-round1-set.txt'
SMS='apps/api/src/sms-port.ts'
MUTS=[
 ('M1','AC2 non-2xx must fail: treat 4xx as success',SMS,"if (response.status < 200 || response.status > 299) {","if (response.status >= 500) {",False),
 ('M2','AC1 send without the X-AUTH-TOKEN header',SMS,"headers: { 'X-AUTH-TOKEN': options.apiKey, 'Content-Type': 'application/json' },","headers: { 'Content-Type': 'application/json' },",False),
 ('M3','AC3 leak the phone into the failure log line',SMS,"write(`sms aqilas status ${response.status}\\n`)","write(`sms aqilas status ${response.status} ${message.phone_e164}\\n`)",False),
 ('M4','AC5 drop the boot assertion from main.ts','apps/api/src/main.ts',"  assertSmsBoot(process.env)\n","",True),
 ('M5','AC4 log/unset provider picks Aqilas instead',SMS,"if (smsProvider(env) === 'aqilas') {","if (smsProvider(env) !== 'aqilas') {",False),
 ('M6','AC2 no request timeout (drop abort signal)',SMS,"          signal: controller.signal,\n","",False),
 ('M7','AC1 send the code to the wrong phone','apps/api/src/phone-otp.ts',"log: () => input.send({ code, phone_e164: phone }),","log: () => input.send({ code, phone_e164: '+22600000000' }),",False),
 ('M8','AC5 invert the production log opt-in rule',SMS,"env['RECAPTCHA_ALLOW_TEST_KEYS'] !== '1') {\n    throw new Error('log SMS","env['RECAPTCHA_ALLOW_TEST_KEYS'] === '1') {\n    throw new Error('log SMS",False),
 ('M9','AC1 SMS text says 15 minutes',SMS,"Il expire dans 10 minutes.","Il expire dans 15 minutes.",False),
 ('M10','AC1 SMS carries a different code than the stored hash','apps/api/src/phone-otp.ts',"log: () => input.send({ code, phone_e164: phone }),","log: () => input.send({ code: newOtpCode(), phone_e164: phone }),",False),
 ('M11','AC2 swallow the vendor failure (no throw on non-2xx)',SMS,"        write(`sms aqilas status ${response.status}\\n`)\n        throw new Error('aqilas send failed')","        write(`sms aqilas status ${response.status}\\n`)",False),
 ('M12','AC2 network error not logged as fixed line (leak url)',SMS,"throw new Error('aqilas send failed')\n      } finally","throw new Error('aqilas send failed ' + options.url + ' ' + message.phone_e164)\n      } finally",False),
]
TESTS=['apps/api/src/sms-port.test.ts','apps/api/src/phone-otp-aqilas.test.ts','apps/api/src/phone-otp.test.ts','apps/api/src/worker-shell.test.ts']
only=sys.argv[1:]
out=open(EV,'a')
def run(cmd,**k): return subprocess.run(cmd,cwd=REPO,capture_output=True,text=True,**k)
for mid,desc,path,old,new,rebuild in MUTS:
    if only and mid not in only: continue
    full=f'{REPO}/{path}'
    src=open(full).read()
    if src.count(old)!=1:
        print(mid,'PATTERN NOT FOUND/UNIQUE',src.count(old)); out.write(f'{mid} {desc}: PATTERN ERROR\n'); continue
    open(full,'w').write(src.replace(old,new))
    try:
        if rebuild: run(['npm','run','build'])
        r=run(['npx','vitest','run','--config','vitest.unit.config.ts',*TESTS])
        txt=re.sub(r'\x1b\[[0-9;]*m','',r.stdout+r.stderr)
        fails=sorted(set(re.findall(r'^ FAIL  (.+)$',txt,re.M)))
        summary=re.findall(r'Tests\s+.*',txt)
        line=f'{mid} [{desc}] -> {"CAUGHT" if fails else "SURVIVED"}; {summary[-1].strip() if summary else ""}'
        print(line); out.write(line+'\n')
        for f in fails[:6]:
            out.write('    '+f[:200]+'\n'); print('    ',f[:160])
    finally:
        open(full,'w').write(src)
        run(['git','checkout','--',path])
        if rebuild: run(['npm','run','build'])
out.close()
