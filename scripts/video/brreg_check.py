import json,sys,urllib.parse,urllib.request
names=sys.argv[1:]
for n in names:
    # check the distinctive first word
    key=n.split()[0]
    url="https://data.brreg.no/enhetsregisteret/api/enheter?size=5&navn="+urllib.parse.quote(key)
    d=json.load(urllib.request.urlopen(url,timeout=15))
    hits=[e['navn'] for e in d.get('_embedded',{}).get('enheter',[]) if key.upper() in e['navn'].upper()]
    print(f"{n:32} {d['page']['totalElements']:5}  {hits[:3]}")
