import os
import re

# Sensitive patterns to look for
PATTERNS = [
    r"hf_[a-zA-Z0-9]{34}", # Hugging Face
    r"AIzaSy[a-zA-Z0-9_-]{33}", # Google/YouTube
    r"sk-[a-zA-Z0-9]{48}", # OpenAI (just in case)
]

def scan_files(root_dir):
    hits = []
    for root, dirs, files in os.walk(root_dir):
        # Skip git and venv
        if '.git' in dirs: dirs.remove('.git')
        if 'venv' in dirs: dirs.remove('venv')
        if '__pycache__' in dirs: dirs.remove('__pycache__')
        
        for file in files:
            if file in ['.env', 'database.db', 'app.db']: continue
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    for pattern in PATTERNS:
                        matches = re.findall(pattern, content)
                        if matches:
                            hits.append((path, matches))
            except:
                continue
    return hits

if __name__ == "__main__":
    print("Scanning for hardcoded secrets...")
    results = scan_files(".")
    if results:
        print(f"FOUND {len(results)} files with potential secrets:")
        for path, matches in results:
            print(f"  {path}: {matches}")
    else:
        print("No hardcoded secrets found in tracked files.")
