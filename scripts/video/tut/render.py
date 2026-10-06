"""Renders one tutorial video (timeline + shots + assets) to a smooth 4K/30 fps MP4.
Usage: python3 render.py <slug> [--preview]   (--preview: 960x540, fast)"""
import json, math, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw

slug = sys.argv[1]
PREVIEW = "--preview" in sys.argv
D = Path(__file__).parent / "videos" / slug
W, H, FPS = 3840, 2160, 30
OW, OH = (960, 540) if PREVIEW else (W, H)
T = json.loads((D / "timeline.json").read_text())
A = D / "assets"
idx = json.loads((A / "index.json").read_text())
key = lambda o: json.dumps(o, sort_keys=True)
crop_alpha = lambda im: im.crop(im.getchannel("A").getbbox())
cap_imgs = {key(c): crop_alpha(Image.open(A / f"cap{i}.png").convert("RGBA")) for i, c in enumerate(idx["captions"])}
cursor = Image.open(A / "cursor.png").convert("RGBA")
TIP = (16, 12)
full = lambda f: Image.open(A / f).convert("RGB").resize((W, H), Image.LANCZOS)
end_img = full("end.png")
titles = [full(f"title{i}.png") for i in range(len(idx["titles"]))]
cards = [full(f"card{i}.png") for i in range(len(idx["cards"]))]
_cache = {}
from PIL import ImageFilter
BLUR = {e["shot"]: e["blur"] for e in T if "shot" in e and e.get("blur")}

def shot(name):
    if name not in _cache:
        if len(_cache) > 8:
            _cache.pop(next(iter(_cache)))
        im = Image.open(D / "shots" / name).convert("RGB")
        for x, y, w, h in BLUR.get(name, []):   # hide private details (e.g. register data of a real company)
            box = (max(0, x), max(0, y), min(W, x + w), min(H, y + h))
            im.paste(im.crop(box).filter(ImageFilter.GaussianBlur(28)), box[:2])
        _cache[name] = im
    return _cache[name]

def ease(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)

# ---- tracks ----------------------------------------------------------------------------------
t = 0.0
bg = []          # (start, kind, ref, fade)   kind: shot | img
cur = []         # (t0, t1, p0, p1)
clicks = []
caps = []        # (t, caption-key or None)
drags = []
zooms = [(0, 0, None, None)]  # (t0, t1, from_rect, to_rect)
hidden = []      # (t0, t1) cursor hidden (cards)
pos = (W // 2, int(H * 0.6))
zrect = None
ti = ci = 0
last_shot = None
hide_from = None

def full_rect():
    return (0, 0, W, H)

for e in T:
    if "title" in e or "card" in e or e.get("end"):
        img = titles[ti] if "title" in e else cards[ci] if "card" in e else end_img
        if "title" in e: ti += 1
        elif "card" in e: ci += 1
        bg.append((t, "img", img, e.get("fade", 0.5 if bg else 0)))
        caps.append((t, None))
        if hide_from is None: hide_from = t
    if "shot" in e:
        bg.append((t, "shot", e["shot"], e.get("fade", 0.45 if (bg and bg[-1][1] == "img") else 0)))
        last_shot = e["shot"]
        if hide_from is not None:
            hidden.append((hide_from, t + 0.2)); hide_from = None
    if "caption" in e:
        caps.append((t, key(e["caption"])))
    if "zoom" in e:
        new = tuple(e["zoom"]) if e["zoom"] else None
        zooms.append((t, t + e.get("dur", 0.9), zrect, new)); zrect = new
        t += e.get("dur", 0.9)
    if "move" in e:
        p1 = tuple(e["move"]); cur.append((t, t + e["dur"], pos, p1)); pos = p1; t += e["dur"]
    if "drag" in e:
        bx, by, bw, bh = e["drag"]["box"]; p1 = tuple(e["drag"]["to"])
        drags.append((t, t + e["dur"], (bx, by, bw, bh), (pos[0] - bx, pos[1] - by), last_shot))
        cur.append((t, t + e["dur"], pos, p1)); pos = p1; t += e["dur"]
    if e.get("click"):
        clicks.append(t)
    t += e.get("hold", 0)
if hide_from is not None:
    hidden.append((hide_from, t + 1))
total = t
print(f"{slug}: {total:.1f}s", file=sys.stderr)

def frame_bg(time):
    i = max(k for k, b in enumerate(bg) if b[0] <= time)
    def img(b): return shot(b[2]) if b[1] == "shot" else b[2]
    start, kind, ref, fade = bg[i]
    cur_img = img(bg[i])
    if fade and i > 0 and time < start + fade:
        return Image.blend(img(bg[i - 1]), cur_img, ease((time - start) / fade)), kind
    return cur_img.copy(), kind

def cursor_at(time):
    p = cur[0][2] if cur else pos
    for t0, t1, p0, p1 in cur:
        if time >= t1: p = p1
        elif time >= t0:
            k = ease((time - t0) / (t1 - t0)) if t1 > t0 else 1
            return (p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k)
    return p

def fit(r):
    """grow a rect to 16:9 around its centre, keep it inside the screen"""
    if r is None: return full_rect()
    x, y, w, h = r
    # leave room under the region for the caption (bottom ~22% of the frame)
    h = h / 0.78
    cx, cy = x + w / 2, y + h / 2
    if w / h < 16 / 9: w = h * 16 / 9
    else: h = w * 9 / 16
    w = min(W, max(w, W / 2.2)); h = w * 9 / 16
    x = min(max(0, cx - w / 2), W - w); y = min(max(0, cy - h / 2), H - h)
    return (x, y, w, h)

def view_at(time):
    t0, t1, a, b = [z for z in zooms if z[0] <= time][-1]
    A_, B_ = fit(a), fit(b)
    k = ease((time - t0) / (t1 - t0)) if t1 > t0 else 1
    return tuple(A_[j] + (B_[j] - A_[j]) * k for j in range(4))

def caption_at(time):
    past = [c for c in caps if c[0] <= time]
    if not past: return None, 0
    t0, k = past[-1]
    prev = past[-2][1] if len(past) > 1 else None
    if time - t0 < 0.25 and prev is not None:
        return prev, 1 - (time - t0) / 0.25
    if k is None: return None, 0
    start = t0 + (0.25 if prev is not None else 0)
    return k, min(1, max(0, (time - start) / 0.35))

def with_alpha(im, a):
    if a >= 1: return im
    im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * a))); return im

out = D / (f"{slug}-preview.mp4" if PREVIEW else f"{slug}.mp4")
proc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "veryfast" if PREVIEW else "medium", "-crf", "16", "-profile:v", "high", "-level", "5.2",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)], stdin=subprocess.PIPE)

frames = int(math.ceil(total * FPS))
for f in range(frames):
    time = f / FPS
    frame, kind = frame_bg(time)
    if kind == "shot":
        for t0, t1, (bx, by, bw, bh), (ox, oy), src in drags:
            if t0 <= time <= t1:
                card = shot(src).crop((bx, by, bx + bw, by + bh)).convert("RGBA")
                veil = Image.new("RGBA", (bw, bh), (255, 255, 255, 140)); frame.paste(veil, (bx, by), veil)
                cx, cy = cursor_at(time)
                sh = Image.new("RGBA", (bw + 60, bh + 60), (0, 0, 0, 0))
                ImageDraw.Draw(sh).rounded_rectangle([30, 42, bw + 30, bh + 42], 30, fill=(0, 0, 0, 55))
                frame.paste(sh, (int(cx - ox - 30), int(cy - oy - 30)), sh)
                rot = card.rotate(-2, expand=True, resample=Image.BICUBIC)
                frame.paste(rot, (int(cx - ox), int(cy - oy)), rot)
        cx, cy = cursor_at(time)
        for tc in clicks:
            d = time - tc
            if 0 <= d < 0.6:
                k = d / 0.6; r = int(84 * (0.3 + 1.1 * k))
                ov = Image.new("RGBA", (r * 2 + 20, r * 2 + 20), (0, 0, 0, 0))
                ImageDraw.Draw(ov).ellipse([10, 10, r * 2 + 10, r * 2 + 10], outline=(22, 163, 74, int(255 * (1 - k))), width=12)
                frame.paste(ov, (int(cx - r - 10), int(cy - r - 10)), ov)
        vx, vy, vw, vh = view_at(time)
        if vw < W - 1:
            frame = frame.resize((W, H), Image.LANCZOS if not PREVIEW else Image.BILINEAR, box=(vx, vy, vx + vw, vy + vh))
        s = W / vw
        if not any(a <= time < b for a, b in hidden):
            pressed = any(0 <= time - tc < 0.14 for tc in clicks)
            sc = (0.86 if pressed else 1) * min(1.35, s ** 0.5)
            cimg = cursor.resize((int(cursor.width * sc), int(cursor.height * sc)))
            px, py = (cx - vx) * s, (cy - vy) * s
            frame.paste(cimg, (int(px - TIP[0] * sc), int(py - TIP[1] * sc)), cimg)
    k, a = caption_at(time)
    if k is not None and a > 0:
        c = with_alpha(cap_imgs[k], a)
        # if the zoomed region reaches the bottom of the frame, show the caption at the top instead
        top = False
        if kind == "shot":
            tgt = [z for z in zooms if z[0] <= time][-1][3]
            if tgt:
                vx, vy, vw, vh = view_at(time); s_ = W / vw
                top = (tgt[1] + tgt[3] - vy) * s_ > H - c.height - 100
        y = 90 - int((1 - a) * 45) if top else H - c.height - 110 + int((1 - a) * 45)
        frame.paste(c, ((W - c.width) // 2, y), c)
    if PREVIEW: frame = frame.resize((OW, OH), Image.BILINEAR)
    proc.stdin.write(frame.tobytes())
proc.stdin.close(); proc.wait()
print(f"{slug}: wrote {out.name}", file=sys.stderr)
