import json,sys
for slug in sys.argv[1:]:
    T=json.load(open(f"videos/{slug}/timeline.json")); t=0; ev=[]; last=None
    for e in T:
        txt=None
        if "title" in e: txt="TITLE: "+e["title"]["title"]
        elif "card" in e: c=e["card"]; txt="CARD: "+(c["title"].get("text") if isinstance(c["title"],dict) else c["title"])+" | "+" / ".join(c["lines"])
        elif e.get("end"): txt="END"
        elif "caption" in e:
            k=json.dumps(e["caption"])
            if k!=last: txt="CAP: "+e["caption"]["text"]
            last=k
        if txt: ev.append([round(t,1),txt])
        t+=e.get("dur",0.9) if "zoom" in e else 0
        t+=e.get("dur",0) if ("move" in e or "drag" in e) else 0
        t+=e.get("hold",0)
    print(f"== {slug} total {t:.1f}s")
    for i,(a,x) in enumerate(ev):
        b=ev[i+1][0] if i+1<len(ev) else t
        print(f"{a:5.1f} ({b-a:4.1f}s) {x[:150]}")
