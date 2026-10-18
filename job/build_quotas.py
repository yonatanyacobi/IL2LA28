"""Build the public site/quotas.json from the reviewed master data/quotas/quotas.json.

Usage: python3 build_quotas.py <master.json> <out.json>
Only items the fact-checker signed off (review.status "ok" or "fixed") are published; "partial" and
"unchecked" stay in the master until reviewed. The review field itself never leaves the master.
Edit the master, never site/quotas.json: the next build overwrites it.
"""
import json, sys

PUBLISH = {"ok", "fixed"}


def build(master):
    items = [{k: v for k, v in it.items() if k != "review"}
             for it in master["items"] if (it.get("review") or {}).get("status") in PUBLISH]
    return {"updatedAt": master["updatedAt"], "items": items}


def main(master_file, out_file):
    with open(master_file, encoding="utf-8") as f:
        out = build(json.load(f))
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"published {len(out['items'])} items -> {out_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: python3 build_quotas.py <master.json> <out.json>")
    main(*sys.argv[1:3])
