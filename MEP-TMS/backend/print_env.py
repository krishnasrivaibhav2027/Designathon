import os
for k, v in sorted(os.environ.items()):
    if "pass" in k.lower() or "secret" in k.lower() or "key" in k.lower() or "db" in k.lower() or "supabase" in k.lower():
        print(f"{k} = {v}")
    else:
        print(f"{k} = <hidden>")
