import os

src_dir = r"c:\Users\Designathon\Downloads\Designathon\MEP-TMS\frontend-vite\src"
keywords = ["finalstatus", "final_status", "cleared", "not cleared", "report-card", "reportcard"]

matches = []
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith((".ts", ".tsx", ".js", ".jsx")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                for kw in keywords:
                    if kw in content.lower():
                        matches.append((file, kw))

print("Frontend matches:", matches)
