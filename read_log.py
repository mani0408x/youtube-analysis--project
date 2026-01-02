
try:
    with open('server_debug.md', 'r', encoding='utf-16') as f:
        print(f.read())
except:
    try:
        with open('server_debug.md', 'r', encoding='utf-8') as f:
            print(f.read())
    except Exception as e:
        print(f"FAILED TO READ: {e}")
