#!/usr/bin/env python3
"""Genera el SQL de una marca real a partir de su JSON (packages/demo/src/brands/<marca>.json).

El JSON es la única fuente del menú: la demo lo usa tal cual y este script lo vuelca a
supabase/seed_<marca>.sql para la base de datos local (`supabase db reset`).

    python3 scripts/brand-to-sql.py tadeo
"""
import json
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def arr(items: list[str]) -> str:
    return q("{" + ",".join('"' + t.replace('"', '\\"') + '"' for t in items) + "}")


def main(brand: str) -> None:
    src = ROOT / "packages/demo/src/brands" / f"{brand}.json"
    data = json.loads(src.read_text(encoding="utf-8"))
    r = data["restaurant"]
    rid = r["uuid"]
    # IDs estables derivados del ID de la demo, para que regenerar no cambie nada.
    ns = uuid.UUID(rid)
    cid = lambda key: str(uuid.uuid5(ns, key))

    out = [
        f"-- {r['name']}: marca real del piloto. Generado por scripts/brand-to-sql.py desde",
        f"-- packages/demo/src/brands/{brand}.json. No lo edites a mano: cambia el JSON y vuelve a generarlo.",
        f"-- Los videos se suben desde el panel del restaurante (Cloudflare/Bunny); aquí van solo los datos.",
        "",
        "insert into public.restaurants (id, slug, name, cuisine, zone, address, lat, lng, price_level, description, status) values",
        f"  ({q(rid)}, {q(r['slug'])}, {q(r['name'])}, {q(r['cuisine'])}, {q(r['zone'])},",
        f"   {q(r['address'])}, {r['lat']}, {r['lng']}, {r['priceLevel']},",
        f"   {q(r['description'])}, 'active');",
        "",
        "insert into public.subscriptions (restaurant_id, plan, status, provider, current_period_end) values",
        f"  ({q(rid)}, {q(r['plan'])}, 'active', 'manual', now() + interval '30 days');",
        "",
        "insert into public.menu_categories (id, restaurant_id, name, position) values",
    ]
    cats = data["categories"]
    out.append(",\n".join(f"  ({q(cid(c['id']))}, {q(rid)}, {q(c['name'])}, {i + 1})" for i, c in enumerate(cats)) + ";")
    out += ["", "insert into public.dishes (restaurant_id, category_id, name, description, price_cop, tags, position) values"]
    rows = []
    for c in cats:
        for j, d in enumerate(c["dishes"]):
            assert 2 <= len(d["name"]) <= 60, d["name"]
            assert len(d.get("description", "")) <= 240, d["name"]
            rows.append(
                f"  ({q(rid)}, {q(cid(c['id']))}, {q(d['name'])},\n"
                f"   {q(d.get('description', ''))}, {d['price']}, {arr(d.get('tags', []))}, {j + 1})"
            )
    out.append(",\n".join(rows) + ";")
    hours = ", ".join(f"({q(h['start'])}::time, {q(h['end'])}::time)" for h in r["hours"])
    out += [
        "",
        f"-- Horario: {' y '.join(h['start'] + '–' + h['end'] for h in r['hours'])}, todos los días.",
        "insert into public.availability_rules (restaurant_id, weekday, start_time, end_time, slot_minutes, capacity_people)",
        f"select {q(rid)}::uuid, d.weekday, h.start_time, h.end_time, 30, {r['capacity']}",
        "from generate_series(0, 6) as d(weekday)",
        f"cross join (values {hours}) as h(start_time, end_time);",
        "",
    ]
    dest = ROOT / "supabase" / f"seed_{brand}.sql"
    dest.write_text("\n".join(out), encoding="utf-8")
    n = sum(len(c["dishes"]) for c in cats)
    print(f"{dest.relative_to(ROOT)}: {len(cats)} categorías, {n} platos")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tadeo")
