import json
from collections import Counter
from pathlib import Path

obj = json.loads(Path("../artists.generated.json").read_text(encoding="utf-8"))
arts = obj.get("artists", [])
failed = obj.get("meta", {}).get("failed", [])

print(f"成功: {len(arts)}件 / 失敗: {len(failed)}件")

if arts:
    print("--- 成功例 (先頭3件) ---")
    for a in arts[:3]:
        print(f"  {a['id']} {a['name']} centroid={a['timbre']['spectral_centroid']:.1f}")

if failed:
    print("--- 失敗理由の集計 ---")
    reasons: Counter = Counter()
    for f in failed:
        err = f.get("error", "")
        if "unavailable" in err.lower():
            reasons["Video unavailable"] += 1
        elif "403" in err or "Forbidden" in err:
            reasons["HTTP 403"] += 1
        elif "REPLACE_ME" in err or "truncated" in err.lower():
            reasons["invalid URL"] += 1
        else:
            reasons["other"] += 1
    for k, v in reasons.most_common():
        print(f"  {k}: {v}件")

if failed:
    print("--- 失敗アーティスト一覧 ---")
    for f in failed:
        print(f"  {f['artist_name']}: {f['error'][:80]}")
