"""
Genera los videos de demostración de Platto: ilustraciones animadas de cada plato,
grabadas como MP4 vertical (540 × 960, 9 s, H.264) con su imagen de portada.

Son marcadores de lugar para la demo; en producción cada restaurante sube su video real.
Requisitos: Python 3, Playwright con Chromium, ffmpeg.
Uso: python3 apps/web/scripts/make_demo_videos.py
"""
import pathlib
import subprocess
import tempfile

from playwright.sync_api import sync_playwright

OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "videos"
W, H = 540, 960
SECONDS = 9

CSS = """
html,body{margin:0;width:540px;height:960px;overflow:hidden;background:#000}
svg{display:block}
.push{transform-box:fill-box;transform-origin:center;animation:push 9s ease-in-out forwards}
.turn{transform-box:fill-box;transform-origin:center;animation:turn 9s ease-in-out forwards}
.drop{opacity:0;animation:drop .9s cubic-bezier(.2,1.3,.4,1) forwards}
.steam{opacity:0;animation:steam 3s ease-out infinite}
.pour{stroke-dasharray:900;stroke-dashoffset:900;animation:pour 2.4s ease-in-out forwards}
@keyframes push{from{transform:scale(1)}to{transform:scale(1.12)}}
@keyframes turn{from{transform:rotate(-6deg)}to{transform:rotate(8deg)}}
@keyframes drop{0%{opacity:0;transform:translateY(-140px) scale(1.4)}100%{opacity:1;transform:none}}
@keyframes steam{0%{opacity:0;transform:translateY(20px)}30%{opacity:.55}100%{opacity:0;transform:translateY(-60px)}}
@keyframes pour{to{stroke-dashoffset:0}}
"""


def drops(items, start=1.2, step=0.35):
    """Guarniciones que caen al plato una por una."""
    out = []
    for i, shape in enumerate(items):
        out.append(f'<g class="drop" style="animation-delay:{start + i * step:.2f}s">{shape}</g>')
    return "".join(out)


def steam(xs, y=250, color="#FFF7EC"):
    paths = []
    for i, x in enumerate(xs):
        paths.append(
            f'<path class="steam" style="animation-delay:{i * 0.9:.1f}s" d="M{x} {y} c -18 -24 18 -46 0 -74 c -18 -24 18 -46 0 -74" '
            f'fill="none" stroke="{color}" stroke-width="7" stroke-linecap="round"/>'
        )
    return "".join(paths)


def plate(cx=270, cy=430, rim="#E7DED0", well="#F4EEE3", r=232):
    return (
        f'<circle cx="{cx}" cy="{cy + 10}" r="{r + 4}" fill="#000" opacity=".28"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{rim}"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{int(r * 0.8)}" fill="{well}"/>'
    )


def wood(base="#2A1C13", grain="#35241A"):
    lines = "".join(
        f'<path d="M-20 {y} C 160 {y - 24}, 360 {y + 40}, 560 {y + 10}" stroke="{grain}" stroke-width="9" fill="none" stroke-linecap="round"/>'
        for y in range(60, 960, 110)
    )
    return f'<rect width="540" height="960" fill="{base}"/>{lines}'


def tiles(base, line):
    rows = "".join(f'<path d="M0 {y}H540" stroke="{line}" stroke-width="4"/>' for y in range(0, 960, 135))
    cols = "".join(f'<path d="M{x} 0V960" stroke="{line}" stroke-width="4"/>' for x in range(0, 540, 135))
    return f'<rect width="540" height="960" fill="{base}"/>{rows}{cols}'


def slate(base="#22272A", dot="#2C3236"):
    dots = "".join(
        f'<circle cx="{(i * 97) % 540}" cy="{(i * 173) % 960}" r="{2 + i % 3}" fill="{dot}"/>' for i in range(40)
    )
    return f'<rect width="540" height="960" fill="{base}"/>{dots}'


def herbs(points, color="#4F6B22", r=7):
    return [f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/>' for x, y in points]


DISHES = {
    "costilla-ahumada": wood()
    + '<g class="push">'
    + plate()
    + '<g class="turn">'
    + '<rect x="120" y="330" width="300" height="72" rx="35" fill="#6E2C14" transform="rotate(-16 270 366)"/>'
    + '<rect x="108" y="410" width="324" height="78" rx="38" fill="#843617" transform="rotate(-16 270 449)"/>'
    + '<rect x="136" y="494" width="276" height="70" rx="34" fill="#6A2913" transform="rotate(-16 274 529)"/>'
    + '<g stroke="#2A100A" stroke-width="7" stroke-linecap="round" opacity=".8">'
    + "".join(f'<path d="M{x} {y} l 24 -40"/>' for x, y in [(170, 390), (230, 372), (295, 352), (160, 476), (225, 456), (292, 436), (350, 418), (200, 548), (265, 528)])
    + "</g>"
    + drops(herbs([(200, 360), (330, 384), (270, 420), (180, 440), (360, 466), (245, 494), (318, 510), (215, 560)]))
    + "</g>"
    + drops(['<path d="M372 610 a 64 64 0 0 1 64 -64 l 0 64 z" fill="#B8C95A"/><path d="M380 602 a 50 50 0 0 1 48 -48 l 0 48 z" fill="#DCE69A"/>'], start=4.2)
    + "</g>"
    + steam([220, 280, 340]),
    "picana-al-carbon": wood("#241812", "#2F2018")
    + '<g class="push">'
    + plate(rim="#E2D8C8", well="#EFE7DA")
    + '<g class="turn">'
    + "".join(
        f'<path d="M{150 + i * 46} 330 q 26 -10 40 6 l -18 190 q -20 8 -42 -4 z" fill="#8E3B1E" stroke="#5A220E" stroke-width="4"/>'
        f'<path d="M{158 + i * 46} 350 q 18 -4 26 6 l -14 150 q -12 4 -26 -2 z" fill="#C25B4A"/>'
        for i in range(6)
    )
    + "</g>"
    + drops([f'<rect x="{x}" y="{y}" width="46" height="22" rx="6" fill="#F2D27A" transform="rotate({a} {x + 23} {y + 11})"/>' for x, y, a in [(170, 560, 20), (230, 580, -10), (300, 566, 14), (350, 540, -24)]], start=1.4)
    + drops(['<circle cx="380" cy="350" r="34" fill="#C0392B"/><circle cx="380" cy="350" r="24" fill="#E25A3E"/>'], start=3.4)
    + "</g>"
    + steam([230, 310]),
    "chorizo-santarrosano": tiles("#2B2320", "#352B27")
    + '<g class="push">'
    + plate(rim="#E9E0D0", well="#F6F0E4")
    + '<g class="turn">'
    + "".join(
        f'<rect x="150" y="{y}" width="230" height="58" rx="29" fill="#9C3A20" transform="rotate({a} 265 {y + 29})"/>'
        f'<path d="M175 {y + 20} h 180" stroke="#C25B3A" stroke-width="6" stroke-linecap="round" transform="rotate({a} 265 {y + 29})"/>'
        for y, a in [(330, -12), (400, -6), (470, -14)]
    )
    + '<circle cx="355" cy="560" r="62" fill="#F1E3B8"/><circle cx="355" cy="560" r="62" fill="none" stroke="#D9C38A" stroke-width="6"/>'
    + "</g>"
    + drops(['<circle cx="190" cy="575" r="30" fill="#B8C95A"/><circle cx="190" cy="575" r="22" fill="#DCE69A"/>'], start=2.0)
    + "</g>"
    + steam([210, 290]),
    "ajiaco-santafereno": tiles("#1C3533", "#24423F")
    + '<g class="push">'
    + plate(rim="#EEE6D6", well="#DDAF38", r=236)
    + '<g class="turn">'
    + '<path class="pour" d="M190 360 c 60 -60 160 -40 180 22 c 18 56 -50 100 -106 76 c -40 -18 -40 -60 -8 -70" fill="none" stroke="#FBF5E8" stroke-width="18" stroke-linecap="round"/>'
    + "".join(f'<ellipse cx="{x}" cy="{y}" rx="44" ry="22" fill="#F6D66A" stroke="#E2B53F" stroke-width="3" transform="rotate({a} {x} {y})"/>' for x, y, a in [(160, 470, 30), (360, 500, -25), (270, 550, 0)])
    + "</g>"
    + drops([f'<ellipse cx="{x}" cy="{y}" rx="13" ry="6" fill="#3B5423" transform="rotate({a} {x} {y})"/>' for x, y, a in [(240, 330, 20), (330, 430, -30), (190, 410, 60), (300, 580, 10), (390, 450, 80)]], start=1.0)
    + drops(['<g fill="#4B5A26"><circle cx="270" cy="440" r="7"/><circle cx="286" cy="456" r="7"/><circle cx="256" cy="458" r="7"/></g>'], start=3.0)
    + "</g>"
    + drops(['<g transform="translate(460 700) rotate(-20)"><ellipse rx="80" ry="108" fill="#5E7A2A"/><ellipse cy="6" rx="64" ry="88" fill="#D3DD8A"/><circle cy="20" r="34" fill="#6A3B1C"/></g>'], start=4.6)
    + steam([220, 300, 360], y=240),
    "sobrebarriga-criolla": wood("#2E2219", "#3A2B20")
    + '<g class="push">'
    + plate(rim="#E8DFD0", well="#F4EEE3")
    + '<g class="turn">'
    + '<path d="M150 360 q 120 -50 240 0 q 20 100 -20 170 q -100 40 -200 0 q -40 -80 -20 -170 z" fill="#B23A1F"/>'
    + '<path d="M180 380 q 90 -36 180 0 q 14 76 -14 128 q -76 30 -152 0 q -30 -60 -14 -128 z" fill="#7A3418"/>'
    + "".join(f'<path d="M{x} 390 l 0 110" stroke="#5A220E" stroke-width="5"/>' for x in (215, 250, 285, 320))
    + '<ellipse cx="380" cy="560" rx="70" ry="44" fill="#FBF7EE"/>'
    + "</g>"
    + drops(herbs([(200, 470), (260, 400), (330, 450), (300, 520)], color="#E25A3E", r=9), start=1.3)
    + drops(['<circle cx="175" cy="575" r="34" fill="#EFD9A0"/><circle cx="215" cy="590" r="28" fill="#EFD9A0"/>'], start=3.2)
    + "</g>"
    + steam([230, 300]),
    "ceviche-pesca": slate()
    + drops(['<g fill="#E7BE5C" stroke="#C99A3A" stroke-width="3"><circle cx="70" cy="180" r="44"/><circle cx="118" cy="120" r="38"/><circle cx="52" cy="262" r="32"/></g>'], start=0.6)
    + '<g class="push">'
    + plate(rim="#E5ECEE", well="#F2E8D6", r=230)
    + '<g class="turn">'
    + "".join(f'<rect x="{x}" y="{y}" width="56" height="50" rx="12" fill="#F8E7DC" stroke="#E6CBBB" stroke-width="3" transform="rotate({a} {x + 28} {y + 25})"/>' for x, y, a in [(190, 350, 12), (270, 332, -8), (330, 398, 20), (240, 412, -14), (176, 440, 6), (300, 470, -18), (236, 500, 10)])
    + "</g>"
    + drops([f'<path d="{d}" fill="none" stroke="#9A2D5C" stroke-width="7" stroke-linecap="round"/>' for d in ["M160 400 a 44 44 0 0 1 44 -52", "M366 344 a 38 38 0 0 1 32 44", "M200 552 a 40 40 0 0 0 58 18", "M384 484 a 34 34 0 0 1 -12 48"]], start=1.4)
    + drops([f'<path d="M{x} {y} c 9 -14 24 -14 27 0 c -9 9 -18 9 -27 0 z" fill="#4D8A38"/>' for x, y in [(258, 326), (400, 430), (196, 520), (288, 446)]], start=2.8)
    + drops(['<g fill="none" stroke="#D63F27" stroke-width="6"><circle cx="320" cy="310" r="12"/><circle cx="160" cy="490" r="10"/><circle cx="372" cy="530" r="12"/></g>'], start=4.4)
    + "</g>",
    "arroz-mariscos": tiles("#2A2E36", "#333844")
    + '<g class="push">'
    + plate(rim="#2F3A40", well="#E2A04A", r=236)
    + '<g class="turn">'
    + "".join(f'<circle cx="{150 + (i * 53) % 240}" cy="{330 + (i * 37) % 210}" r="5" fill="#F2C27A"/>' for i in range(50))
    + "</g>"
    + drops([f'<path d="M{x} {y} c 30 -30 70 -10 64 26 c -6 26 -36 34 -50 18" fill="none" stroke="#F07850" stroke-width="16" stroke-linecap="round"/>' for x, y in [(180, 360), (300, 340), (200, 480), (320, 470)]], start=1.2, step=0.5)
    + drops(['<g fill="#3B2A2A"><ellipse cx="250" cy="420" rx="26" ry="14"/><ellipse cx="350" cy="560" rx="26" ry="14"/></g>'], start=3.4)
    + drops(herbs([(230, 330), (380, 420), (170, 540), (290, 590)], color="#4F8A38", r=8), start=4.4)
    + "</g>"
    + steam([220, 300, 350]),
    "bowl-quinua": tiles("#E9E2D3", "#DCD3C1")
    + '<g class="push">'
    + plate(rim="#C9D3C4", well="#F2EBDD", r=232)
    + '<g class="turn">'
    + '<path d="M270 430 L 270 230 A 200 200 0 0 1 460 380 Z" fill="#E7D9B0"/>'
    + "".join(f'<circle cx="{290 + (i * 29) % 140}" cy="{270 + (i * 41) % 120}" r="4" fill="#C9B47A"/>' for i in range(30))
    + '<path d="M270 430 L 460 380 A 200 200 0 0 1 330 620 Z" fill="#7A4A8E"/>'
    + '<path d="M270 430 L 330 620 A 200 200 0 0 1 90 480 Z" fill="#E8833A"/>'
    + '<path d="M270 430 L 90 480 A 200 200 0 0 1 270 230 Z" fill="#5E8A3A"/>'
    + "</g>"
    + drops(['<g transform="translate(270 430)"><ellipse rx="70" ry="48" fill="#6E8B2F"/><ellipse rx="56" ry="38" fill="#D8E08A"/></g>'], start=1.6)
    + drops([f'<circle cx="{x}" cy="{y}" r="6" fill="#2B2B2B"/>' for x, y in [(240, 410), (300, 420), (270, 450)]], start=3.0, step=0.2)
    + "</g>",
    "arepa-choclo": wood("#3A2716", "#45301C")
    + '<g class="push">'
    + plate(rim="#E4DACB", well="#F4EEE3")
    + '<g class="turn">'
    + '<circle cx="270" cy="430" r="150" fill="#E9B947"/><circle cx="270" cy="430" r="150" fill="none" stroke="#C78F2A" stroke-width="10"/>'
    + "".join(f'<circle cx="{200 + (i * 41) % 150}" cy="{360 + (i * 59) % 150}" r="10" fill="#C78F2A" opacity=".5"/>' for i in range(14))
    + "</g>"
    + drops(['<path d="M190 420 q 80 -60 160 0 q -80 50 -160 0 z" fill="#FBF5E8"/>'], start=1.2)
    + drops([f'<rect x="{x}" y="{y}" width="20" height="16" rx="4" fill="#D6402A"/>' for x, y in [(220, 380), (260, 400), (300, 380), (240, 450), (290, 460)]], start=2.4, step=0.2)
    + drops(herbs([(230, 420), (320, 430), (270, 480)], color="#4F8A38", r=6), start=4.0)
    + "</g>"
    + steam([240, 310]),
}


def render(name: str, art: str, tmp: pathlib.Path, browser) -> None:
    html = f'<!doctype html><html><head><style>{CSS}</style></head><body><svg viewBox="0 0 {W} {H}" width="{W}" height="{H}">{art}</svg></body></html>'
    context = browser.new_context(viewport={"width": W, "height": H}, record_video_dir=str(tmp), record_video_size={"width": W, "height": H})
    page = context.new_page()
    page.set_content(html)
    page.wait_for_timeout(int((SECONDS + 0.8) * 1000))
    video_path = page.video.path()
    context.close()

    mp4 = OUT / f"{name}.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5", "-t", str(SECONDS), "-i", video_path,
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow", "-r", "30",
         "-movflags", "+faststart", "-an", str(mp4)],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", "4", "-i", str(mp4), "-frames:v", "1", "-q:v", "5", str(OUT / f"{name}.jpg")],
        check=True,
    )
    print(f"  {name}.mp4  {mp4.stat().st_size // 1024} KB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        browser = p.chromium.launch()
        for name, art in DISHES.items():
            render(name, art, pathlib.Path(tmp), browser)
        browser.close()


if __name__ == "__main__":
    main()
