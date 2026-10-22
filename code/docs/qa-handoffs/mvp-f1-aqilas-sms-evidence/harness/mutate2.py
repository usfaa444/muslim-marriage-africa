import subprocess, sys, re, json
REPO='/home/claude/muslim-marriage-africa/code'
EV='/home/claude/muslim-marriage-africa/code/docs/qa-handoffs/mvp-f1-aqilas-sms-evidence/retest-g2-mutations.txt'
SMS='apps/api/src/sms-port.ts'
MUTS=[
 ('M14','F-1 remove redirect:manual (back to follow by default)',SMS,"          redirect: 'manual',\n","",False),
 ('M15','F-1 explicit redirect:follow',SMS,"redirect: 'manual',","redirect: 'follow',",False),
 ('M16','F-2 disable the AQILAS_API_KEY control-character check',SMS,"if (hasControl(env['AQILAS_API_KEY'] ?? '')) {","if (hasControl('')) {",True),
 ('M17','F-2 disable the AQILAS_SENDER_ID control-character check',SMS,"if (hasControl(env['AQILAS_SENDER_ID'] ?? '')) {","if (hasControl('')) {",True),
 ('M18','F-2 let newline and carriage return through (code < 9)',SMS,"if (code < 32 || code === 127) {","if (code < 9 || code === 127) {",True),
 ('M19','F-1 treat 3xx as success',SMS,"if (response.status < 200 || response.status > 299) {","if (response.status < 200 || response.status > 399) {",False),
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
