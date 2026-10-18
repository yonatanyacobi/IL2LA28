"""Read-only access to the World Triathlon API (developers.triathlon.org) for results-assist (D-R1).

The key lives only in KEY_FILE, outside the repo and the task folder: one line, owned by the user running the job,
mode 600. There is deliberately no fallback (no env var, no default or documentation key): without a valid key
file, every call raises ApiKeyError and the job reads the official event page instead.
The key never appears in exceptions, logs or output. Only messages built here are raised, and they name the path.
"""
import json, os, stat, urllib.error, urllib.parse, urllib.request

KEY_FILE = os.path.expanduser("~/.config/il2la28/triathlon_api_key")
BASE = "https://api.triathlon.org/v1"


class ApiKeyError(Exception):
    pass


class ApiError(Exception):
    pass


def load_key(path=KEY_FILE):
    try:
        st = os.stat(path, follow_symlinks=False)
    except FileNotFoundError:
        raise ApiKeyError(f"no API key file at {path}") from None
    if not stat.S_ISREG(st.st_mode):
        raise ApiKeyError(f"{path} must be a regular file, not a link or directory")
    if st.st_uid != os.getuid():
        raise ApiKeyError(f"{path} must be owned by the user running the job")
    if st.st_mode & 0o077:
        raise ApiKeyError(f"{path} is readable by others; run: chmod 600 {path}")
    with open(path, encoding="utf-8") as f:
        key = f.read().strip()
    if not key or any(c.isspace() for c in key):
        raise ApiKeyError(f"{path} must hold the key on a single line")
    return key


def request(path, params=None, key_file=KEY_FILE):
    """The urllib Request for a GET on BASE + path; the key only goes in the apikey header."""
    if not path.startswith("/") or "://" in path:
        raise ValueError("path must be relative to the API base, e.g. /events/123")
    url = BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
    return urllib.request.Request(url, headers={"apikey": load_key(key_file), "Accept": "application/json"})


def get(path, params=None, key_file=KEY_FILE, timeout=20):
    req = request(path, params, key_file)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:  # e.code/e.reason only: the request headers carry the key
        raise ApiError(f"World Triathlon API {path}: HTTP {e.code} {e.reason}") from None
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        raise ApiError(f"World Triathlon API {path}: {type(e).__name__}") from None


def program_results(event_id, prog_id, **kw):
    return get(f"/events/{int(event_id)}/programs/{int(prog_id)}/results", **kw)
