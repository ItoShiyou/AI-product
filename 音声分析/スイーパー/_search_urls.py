import subprocess, sys

artists = [
    "King Gnu",
    "Mrs. GREEN APPLE",
    "back number",
    "藤井風",
    "優里",
    "菅田将暉",
    "Ado",
    "LiSA",
    "宇多田ヒカル",
    "椎名林檎",
    "MISIA",
]

ytdlp = sys.argv[1] if len(sys.argv) > 1 else "yt-dlp"

for name in artists:
    query = f"ytsearch1:{name} official music video"
    p = subprocess.run(
        [ytdlp, "--no-warnings", "--skip-download", "--print", "webpage_url", query],
        capture_output=True, text=True
    )
    url = (p.stdout.strip().splitlines() or ["NOT_FOUND"])[-1]
    print(f"{name}\t{url}")
