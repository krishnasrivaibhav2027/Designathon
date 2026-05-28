import os

dashboards = [
    r"c:\Users\Designathon\Downloads\Designathon\MEP-TMS\frontend-vite\src\pages\dashboards\AdminDashboard.tsx",
    r"c:\Users\Designathon\Downloads\Designathon\MEP-TMS\frontend-vite\src\pages\dashboards\CoordinatorDashboard.tsx"
]

for path in dashboards:
    print(f"=== Matches in {os.path.basename(path)} ===")
    with open(path, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f, 1):
            if "cleared" in line.lower():
                print(f"{idx}: {line.strip()}")
