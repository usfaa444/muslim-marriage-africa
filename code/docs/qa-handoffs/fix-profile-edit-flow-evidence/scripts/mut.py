#!/usr/bin/env python3
"""usage: mut.py <label> <file (relative to repo root)> <old> <new> <vitest args...>
Applies one exact-string mutation, runs vitest on the given files, restores the file with git checkout, prints the outcome."""
import subprocess, sys, os, re
label, rel, old, new = sys.argv[1:5]
tests = sys.argv[5:]
root = '/home/claude/ankanu-profile-fix'
path = os.path.join(root, rel)
src = open(path, encoding='utf8').read()
old = old.encode().decode('unicode_escape') if '\\n' in old and '\n' not in old else old
new = new.encode().decode('unicode_escape') if '\\n' in new and '\n' not in new else new
n = src.count(old)
if n != 1:
    print(f'[{label}] mutation target found {n} times (need exactly 1)'); sys.exit(2)
try:
    open(path, 'w', encoding='utf8').write(src.replace(old, new))
    env = dict(os.environ, ANKANU_CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    r = subprocess.run(['npx', 'vitest', 'run', '--config', 'vitest.unit.config.ts', *tests], cwd=os.path.join(root, 'code'), env=env, capture_output=True, text=True, timeout=900)
    out = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout + r.stderr)
    open(f'/tmp/claude-0/-home-claude/6e1b1367-c24b-5f8d-8946-aab9e4dcf519/scratchpad/qa3/mut/{label}.log', 'w').write(out)
    fails = [l.strip() for l in out.splitlines() if l.strip().startswith(('FAIL', '×')) ]
    summ = [l.strip() for l in out.splitlines() if l.strip().startswith(('Test Files', 'Tests '))]
    print(f'[{label}] vitest exit={r.returncode}'); print('\n'.join(summ)); print('\n'.join(fails[:8]))
finally:
    subprocess.run(['git', 'checkout', '--', rel], cwd=root, check=True)
    print(f'[{label}] restored {rel}')
