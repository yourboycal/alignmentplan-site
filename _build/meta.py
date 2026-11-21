"""Set the settings line (first line) of a content fragment from a Python dict. Keeps the body as it is.
Usage inside Python:  from meta import patch;  patch("vision-board.html", title="...", ...)"""
import json, os
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "content")
def patch(name, **kw):
    path = os.path.join(BASE, name)
    first, body = open(path, encoding="utf-8").read().split("\n", 1)
    m = json.loads(first); m.update(kw)
    open(path, "w", encoding="utf-8").write(json.dumps(m, ensure_ascii=False) + "\n" + body)
    print(name, "title", len(m.get("title", "")), "description", len(m.get("description", "")))
