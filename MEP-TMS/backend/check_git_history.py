import subprocess

try:
    # Get all commit messages and diffs containing "password" or "key" or "supabase" or "postgres"
    cmd = "git log -p -S password"
    res = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT)
    print("Found in git history:")
    print(res[:2000].decode("utf-8", errors="ignore"))
except Exception as e:
    print("Git search error or no matches:", e)
