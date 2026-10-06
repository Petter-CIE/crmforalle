"""Places a voiceover MP3 (one file per video, lines read in order) onto the video's scenes.
Usage: python3 voiceover.py <slug> <audio.mp3> [--dry]
Lines and their scene start times come from voice/<slug>.json: [{"t": seconds, "text": "..."}, ...]."""
import json, re, subprocess, sys
from pathlib import Path

D = Path(__file__).parent
slug, audio = sys.argv[1], sys.argv[2]
DRY = "--dry" in sys.argv
lines = json.loads((D / "voice" / f"{slug}.json").read_text())
video = D / "videos" / slug / f"{slug}.mp4"
vlen = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)]))
alen = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio]))

# speech chunks between pauses
out = subprocess.run(["ffmpeg", "-i", audio, "-af", "silencedetect=noise=-38dB:d=0.18", "-f", "null", "-"], capture_output=True, text=True).stderr
sil = [(float(a), float(b)) for a, b in re.findall(r"silence_start: ([\d.]+).*?silence_end: ([\d.]+)", out, re.S)]
chunks, pos = [], 0.0
for s, e in sil:
    if s - pos > 0.05: chunks.append((pos, s))
    pos = e
if alen - pos > 0.05: chunks.append((pos, alen))
gaps = [chunks[i + 1][0] - chunks[i][1] for i in range(len(chunks) - 1)]

# group chunks into the N lines: durations should follow the text lengths, and line breaks tend to be longer pauses
N = len(lines)
def syllables(t):
    t = t.lower().replace("allseats", "ålsits").replace("crm", "se er em").replace("14", "fjorten").replace(".no", " punktum no")
    return max(1, len(re.findall(r"[aeiouyæøå]+", t)))
w = [syllables(l["text"]) for l in lines]
speech = sum(e - s for s, e in chunks)
exp = [speech * x / sum(w) for x in w]
K = len(chunks)
INF = float("inf")
best = [[INF] * (K + 1) for _ in range(N + 1)]
back = [[0] * (K + 1) for _ in range(N + 1)]
best[0][0] = 0
for n in range(1, N + 1):
    for k in range(n, K + 1):
        for j in range(n - 1, k):
            if best[n - 1][j] == INF: continue
            dur = chunks[k - 1][1] - chunks[j][0]
            cost = best[n - 1][j] + ((dur - exp[n - 1]) / max(exp[n - 1], 0.8)) ** 2
            if k < K: cost -= 0.6 * min(gaps[k - 1], 0.8)   # reward cutting at a long pause
            if cost < best[n][k]: best[n][k], back[n][k] = cost, j
segs, k = [], K
for n in range(N, 0, -1):
    j = back[n][k]; segs.append((chunks[j][0], chunks[k - 1][1])); k = j
segs.reverse()

# place each line at its scene start (+0.25 s), never overlapping the previous line; keep inside the video
place, last_end = [], 0.0
for i, (l, (s, e)) in enumerate(zip(lines, segs)):
    at = max(l["t"] + 0.25, last_end + 0.15)
    place.append(at); last_end = at + (e - s)
# the last line may start a little earlier (down to its scene start) instead of lengthening the video
ls, le = segs[-1]
if last_end > vlen - 0.1:
    place[-1] = max(lines[-1]["t"] - 0.1, max(place[-2] + (segs[-2][1] - segs[-2][0]) + 0.15 if N > 1 else 0, vlen - 0.1 - (le - ls)))
    last_end = place[-1] + (le - ls)
over = last_end - (vlen - 0.05)
for i, (l, (s, e)) in enumerate(zip(lines, segs)):
    nxt = lines[i + 1]["t"] if i + 1 < N else vlen
    flag = "  <-- runs into next scene" if place[i] + (e - s) > nxt + 0.05 else ""
    print(f"{l['t']:5.1f}s scene | at {place[i]:5.2f}s | audio {s:5.2f}-{e:5.2f} ({e-s:4.2f}s){flag} | {l['text'][:60]}")
extend = max(0.0, over)
print(f"video {vlen:.2f}s, voice ends {last_end:.2f}s" + (f" -> extend video by {extend:.2f}s" if extend else ""))
if DRY: sys.exit()

# mix: each line cut from the file, delayed to its place; light loudness normalisation
inputs, parts = ["-i", str(video), "-i", audio], []
for i, ((s, e), at) in enumerate(zip(segs, place)):
    ms = int(at * 1000)
    parts.append(f"[1:a]atrim={max(0,s-0.04):.3f}:{e+0.08:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={e-s+0.06:.3f}:d=0.06,adelay={ms}|{ms}[a{i}]")
mix = "".join(f"[a{i}]" for i in range(N)) + f"amix=inputs={N}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]"
fc = ";".join(parts + [mix])
dst = D / "videos" / slug / f"{slug}-voice.mp4"
if extend:
    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc + f";[0:v]tpad=stop_mode=clone:stop_duration={extend + 0.3:.2f}[v]",
           "-map", "[v]", "-map", "[aout]", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(dst)]
else:
    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "0:v", "-map", "[aout]",
           "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{vlen:.3f}", "-movflags", "+faststart", str(dst)]
subprocess.run(cmd, check=True)
print("wrote", dst.name)
