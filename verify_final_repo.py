import subprocess

def run_git(cmd):
    try:
        return subprocess.check_output(["git"] + cmd, stderr=subprocess.STDOUT).decode('utf-8', errors='ignore')
    except Exception as e:
        return str(e).strip()

print("Verifying HEAD Tree Content...")
files = run_git(["ls-tree", "-r", "HEAD", "--name-only"]).splitlines()

bad_files = [f for f in files if f.endswith('.txt') or f.endswith('.py')]
# Allow run.py and any backend py files
essential_py = ["run.py", "backend/","tests/","frontend/"]
junk_py = [f for f in bad_files if f.endswith('.py') and not any(f.startswith(e) for e in essential_py)]
junk_txt = [f for f in bad_files if f.endswith('.txt')]

if junk_py or junk_txt:
    print("WARNING: Junk files detected in HEAD!")
    for f in junk_py: print(f"  [PY] {f}")
    for f in junk_txt: print(f"  [TXT] {f}")
else:
    print("SUCCESS: HEAD is clean of diagnostic junk.")

print("\nFiles in HEAD:")
for f in files:
    print(f"  {f}")
