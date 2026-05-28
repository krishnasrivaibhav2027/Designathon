import json

log_path = r"C:\Users\Designathon\.gemini\antigravity-ide\brain\687bbbb7-61df-4592-bcae-e46b125d0646\.system_generated\logs\transcript.jsonl"

terms = ["alter", "table", "password", "supabase", "connection", "sql", "migration"]

matches = []
with open(log_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        try:
            obj = json.loads(line)
            content = str(obj.get("content", "")) + str(obj.get("tool_calls", ""))
            for term in terms:
                if term in content.lower():
                    matches.append((i, term, content[:300]))
                    break
        except Exception as e:
            pass

print(f"Total matches found: {len(matches)}")
for idx, term, snippet in matches[:20]:
    print(f"Line {idx} (term: {term}): {snippet}...")
