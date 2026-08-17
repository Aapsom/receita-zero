import os, json, re
from http.server import BaseHTTPRequestHandler

# Vercel Python Function: POST /api/insta  {username:"@user"}
# Rota o insta-scrape.py (instaloader) com IG_SESSIONID de env var.
# Sem sessionid -> Instagram 429 (esperado). Com sessionid -> perfil + fotos.

def _run(username):
    try:
        from instaloader import Instaloader, Profile
    except ImportError:
        return None, "instaloader nao instalado no build"

    L = Instaloader()
    sid = os.environ.get("IG_SESSIONID")
    if sid:
        L.context._session.cookies.set("sessionid", sid, domain=".instagram.com")

    u = username.strip().lstrip("@")
    try:
        prof = Profile.from_username(L.context, u)
    except Exception as e:
        return None, "falha perfil %s: %s" % (u, e)

    media = []
    try:
        for i, post in enumerate(prof.get_posts()):
            if i >= 6:
                break
            media.append({
                "url": (post.video_url if post.is_video else post.url),
                "caption": (post.caption or "")[:280],
                "is_video": bool(post.is_video),
            })
    except Exception as e:
        pass

    return {
        "username": prof.username,
        "full_name": prof.full_name,
        "biography": prof.biography,
        "profile_pic_url": prof.profile_pic_url,
        "is_private": bool(prof.is_private),
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
            username = body.get("username", "")
            if not username:
                return self._send(400, {"error": "username obrigatorio"})
            data, err = _run(username)
            if err:
                return self._send(502, {"error": err})
            return self._send(200, data)
        except Exception as e:
            return self._send(500, {"error": str(e)})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
