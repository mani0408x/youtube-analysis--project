
print("--- Reading server_debug.md ---")
try:
    with open('server_debug.md', 'rb') as f:
        print(f.read().decode('utf-8', errors='ignore'))
except Exception as e:
    print(e)
