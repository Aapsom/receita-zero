import os, json, time, urllib.parse
from http.server import BaseHTTPRequestHandler
import urllib.request, urllib.error

# Vercel Function: POST /api/insta  {username:"@user"}
# Usa Apify Instagram Scraper (anti-bot do IG resolvido pelo Apify).
# APIFY_TOKEN vem de env var (nunca hardcoded). Cache 24h em memoria p/ nao gastar run.

APIFY_ACTOR = "apify/instagram-scraper"
_cache = {}  # username -> {ts, data}
CACHE_TTL = 24 * 3600

def _apify(token, username):
    url = ("https://api.apify.com/v2/acts/%s/run-sync-get-dataset-items?token=%s"
           % (urllib.parse.quote(APIFY_ACTOR), token))
    payload = json.dumps({
        "usernames": [username],
        "resultsLimit": 8,
        "addParentData": False,
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=55) as r:
        rows = json.loads(r.read().decode("utf-8"))
    if not rows:
        return None, "perfil vazio ou privado"
    p = rows[0]
    media = []
    for post in (p.get("latestPosts") or [])[:6]:
        u = post.get("url") or post.get("displayUrl") or post.get("imageUrl")
        if u:
            media.append({"url": u, "caption": (post.get("caption") or "")[:280],
                          "is_video": bool(post.get("type") == "Video")})
    return {
        "username": p.get("username"),
        "full_name": p.get("fullName") or p.get("username"),
        "biography": p.get("biography") or "",
        "profile_pic_url": p.get("profilePicUrl") or "",
        "is_private": bool(p.get("private")),
        "media": media,
    }, None

class handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(obj, ensure_ascii=False).encode("utf-8"))

    def do_POST(self):
        try:
            ln = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(ln) or b"{}")
            username = (body.get("username") or "").strip().lstrip("@")
            if not username:
                return self._send(400, {"error": "username obrigatorio"})
            token = os.environ.get("APIFY_TOKEN")
            if not token:
                return self._send(502, {"error": "APIFY_TOKEN nao configurado na Vercel"})
            # cache
            c = _cache.get(username)
            if c and (time.time() - c["ts"]) < CACHE_TTL:
                return self._send(200, c["data"])
            data, err = _apify(token, username)
            if err:
                return self._send(502, {"error": err})
            _cache[username] = {"ts": time.time(), "data": data}
            return self._send(200, data)
        except urllib.error.HTTPError as e:
            return self._send(502, {"error": "apify http %s" % e.code})
        except Exception as e:
            return self._send(500, {"error": str(e)})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
