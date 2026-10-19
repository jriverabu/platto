"""
Reemplaza los videos ilustrados de la demo por clips reales de bancos de uso libre
(Pexels, Pixabay, Mixkit). Recorta cada clip a vertical 9:16, lo deja en 9 s, quita el audio,
lo comprime para celular y genera su imagen de portada.

1. Descarga un clip por plato y nómbralo con el nombre del plato en la demo:
     chorizo-santarrosano   costilla-ahumada   picana-al-carbon
     mute-cucuteno          sobrebarriga-criolla  arepa-choclo
     ceviche-pesca          arroz-mariscos     bowl-quinua
   (cualquier extensión: .mp4, .mov, .webm)
2. Opcional: un archivo creditos.csv en la misma carpeta con columnas  plato,url,autor
   para dejar constancia de la fuente y la licencia de cada clip.
3. Corre:  python3 apps/web/scripts/import_stock_videos.py <carpeta> [--desde 2.5]
   --desde: segundo del clip original donde empieza el recorte (por defecto, el centro del clip).

Requiere ffmpeg y ffprobe.
"""
import argparse
import csv
import json
import pathlib
import subprocess
import sys

OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "videos"
SLUGS = [
    "chorizo-santarrosano", "costilla-ahumada", "picana-al-carbon",
    "mute-cucuteno", "sobrebarriga-criolla", "arepa-choclo",
    "ceviche-pesca", "arroz-mariscos", "bowl-quinua",
]
W, H, SECONDS = 540, 960, 9


def duration(path: pathlib.Path) -> float:
    info = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    )
    return float(json.loads(info.stdout)["format"]["duration"])


def convert(src: pathlib.Path, slug: str, start: float | None) -> None:
    total = duration(src)
    if total < 4:
        raise SystemExit(f"{src.name}: dura {total:.1f} s; se necesitan al menos 4 s.")
    length = min(SECONDS, total)
    begin = max(0.0, (total - length) / 2) if start is None else max(0.0, min(start, total - length))
    # Llena el cuadro vertical y recorta lo que sobra a los lados (o arriba y abajo).
    vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps=30,format=yuv420p"
    mp4 = OUT / f"{slug}.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{begin:.2f}", "-t", f"{length:.2f}", "-i", str(src),
         "-vf", vf, "-an", "-c:v", "libx264", "-profile:v", "main", "-preset", "slow", "-crf", "26",
         "-movflags", "+faststart", str(mp4)],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", "1", "-i", str(mp4), "-frames:v", "1", "-q:v", "4",
         str(OUT / f"{slug}.jpg")],
        check=True,
    )
    print(f"✓ {slug}: {length:.1f} s desde el segundo {begin:.1f} · {mp4.stat().st_size / 1e6:.1f} MB")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("carpeta", type=pathlib.Path)
    parser.add_argument("--desde", type=float, default=None)
    args = parser.parse_args()

    found = {}
    for f in sorted(args.carpeta.iterdir()):
        if f.stem in SLUGS and f.suffix.lower() in {".mp4", ".mov", ".webm", ".m4v", ".mkv"}:
            found[f.stem] = f
    if not found:
        sys.exit(f"No encontré clips con los nombres esperados en {args.carpeta}: {', '.join(SLUGS)}")
    for slug, src in found.items():
        convert(src, slug, args.desde)

    missing = [s for s in SLUGS if s not in found]
    if missing:
        print("Siguen ilustrados:", ", ".join(missing))

    credits = args.carpeta / "creditos.csv"
    if credits.exists():
        rows = list(csv.DictReader(credits.open(encoding="utf-8")))
        lines = [
            "# Créditos de los videos de la demo",
            "",
            "Clips de bancos de uso libre, recortados a 9 s en vertical. Son referenciales:",
            "no son los platos reales de los restaurantes de ejemplo.",
            "",
            "| Plato | Autor | Fuente |",
            "| --- | --- | --- |",
        ]
        lines += [f"| {r.get('plato', '')} | {r.get('autor', '')} | {r.get('url', '')} |" for r in rows]
        (OUT / "CREDITOS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("✓ Créditos en public/videos/CREDITOS.md")


if __name__ == "__main__":
    main()
