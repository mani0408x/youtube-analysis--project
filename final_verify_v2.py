import subprocess
import os

def check_repo():
    with open("repo_status.log", "w", encoding="utf-8") as log:
        # 1. List all files in HEAD
        log.write("--- HEAD TREE ---\n")
        try:
            tree = subprocess.check_output(["git", "ls-tree", "-r", "HEAD", "--name-only"], stderr=subprocess.STDOUT).decode('utf-8', errors='ignore')
            log.write(tree)
        except Exception as e:
            log.write(f"Error listing tree: {e}\n")
        
        # 2. Check for the specific problematic file
        log.write("\n--- CHECKING FOR BAD_COMMITS_REPORT ---\n")
        if "bad_commits_report_utf8.txt" in tree:
             log.write("CRITICAL: bad_commits_report_utf8.txt IS STILL PRESENT!\n")
        else:
             log.write("CLEAN: bad_commits_report_utf8.txt is absent.\n")

if __name__ == "__main__":
    check_repo()
    print("Verification complete. Check repo_status.log")
