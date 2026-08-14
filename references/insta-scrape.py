#!/usr/bin/env python3
"""
insta-scrape.py — Raspagem de perfil do Instagram via instaloader (determinístico, ZERO IA).

USO:
  pip install instaloader
  python3 insta-scrape.py @usuario            # ou url completa
  python3 insta-scrape.py @usuario --max 6 --out out.json

SAÍDA (JSON):
  {
    "username": "...", "full_name": "...", "biography": "...",
    "profile_pic_url": "...", "is_private": false,
    "media": [ {"url":"...","caption":"...","is_video":false}, ... ]
  }

⚠️ LIMITAÇÕES (causa-raiz, não ignorar):
  - O Instagram exige frequentemente um cookie de sessão (sessionid) para baixar
    perfis que ele decide não-ser-triviais. Sem sessionid -> pode falhar com 401.
  - O sessionid NÃO vai no código. Exporte como ENV antes de rodar:
        export IG_SESSIONID="seu_cookie_sessionid"
    (pego em instagram.com -> DevTools -> Application -> Cookies -> sessionid,
     LOGADO na conta que tem permissão de raspar — própria ou do cliente c/ consentimento)
  - ToS: use só para contas que você tem autorização (própria ou do cliente).
    Scraping de terceiro sem consentimento viola os termos do Instagram.

Este script roda em SERVIDOR (VM/cron), NÃO no browser/Vercel estático.
O gerador.html (receita-zero/gerador.html) POSTa o @username para um endpoint seu
que executa este script e devolve o JSON.
"""
import sys, json, os, argparse

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("target", help="@usuario ou url do perfil")
    ap.add_argument("--max", type=int, default=6, help="máx de mídias")
    ap.add_argument("--out", help="arquivo de saída (default: stdout)")
    args = ap.parse_args()

    try:
        from instaloader import Instaloader, Profile
    except ImportError:
        sys.stderr.write("ERRO: instale o instaloader -> pip install instaloader\n")
        return 2

    L = Instaloader()
    sid = os.environ.get("IG_SESSIONID")
    if sid:
        # sessionid válido faz login sem usuário/senha
        L.context._session.cookies.set("sessionid", sid, domain=".instagram.com")

    # normaliza @usuario
    t = args.target.strip()
    if t.startswith("http"):
        # extrai @user da url
        import re
        m = re.search(r"instagram\.com/([^/?#]+)", t)
        username = m.group(1) if m else t
    else:
        username = t.lstrip("@")

    try:
        prof = Profile.from_username(L.context, username)
    except Exception as e:
        sys.stderr.write("ERRO ao carregar perfil %s: %s\n" % (username, e))
        return 1

    media = []
    try:
        for i, post in enumerate(prof.get_posts()):
            if i >= args.max:
                break
            url = (post.video_url if post.is_video else post.url)
            media.append({
                "url": url,
                "caption": (post.caption or "")[:280],
                "is_video": bool(post.is_video),
            })
    except Exception as e:
        sys.stderr.write("aviso: falha ao iterar mídias: %s\n" % e)

    out = {
        "username": prof.username,
        "full_name": prof.full_name,
        "biography": prof.biography,
        "profile_pic_url": prof.profile_pic_url,
        "is_private": bool(prof.is_private),
        "media": media,
    }
    txt = json.dumps(out, ensure_ascii=False, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(txt)
    else:
        print(txt)
    return 0

if __name__ == "__main__":
    sys.exit(main())
