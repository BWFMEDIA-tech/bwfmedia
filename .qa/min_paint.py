import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image
QA = Path("/dev-server/.qa")
ROWS = "".join('<p style="height:60px;margin:0">row</p>' for _ in range(20))
HTML = """<!doctype html><meta charset=utf-8><style>
body{background:#0a0a14;margin:0}
.box{width:200px;height:300px;overflow:auto;background:#111}
.box::-webkit-scrollbar{width:10px}
.box::-webkit-scrollbar-track{background:rgba(255,255,255,.05)}
.box::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;background:linear-gradient(180deg,#00e6ff,#0000ff) padding-box}
</style><div class=box>""" + ROWS + "</div>"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page(viewport={"width": 400, "height": 400})
        await pg.set_content(HTML)
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(QA / "min.png"))
        await b.close()
    im = Image.open(QA / "min.png").convert("RGB")
    hits = [(x, y, im.getpixel((x, y))) for x in range(188, 200) for y in range(0, 300)
            if im.getpixel((x, y))[2] > 90 and im.getpixel((x, y))[1] > 60]
    print("min-test thumb pixels:", len(hits), hits[:3])

asyncio.run(main())
