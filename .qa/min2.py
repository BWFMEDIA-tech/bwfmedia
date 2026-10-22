import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image
QA = Path("/dev-server/.qa")
ROWS = "".join('<p style="height:60px;margin:0;color:#fff">row</p>' for _ in range(20))
STYLED = """
.box{width:200px;height:300px;overflow:auto;background:#111}
.box::-webkit-scrollbar{width:10px}
.box::-webkit-scrollbar-track{background:rgba(255,255,255,.05)}
.box::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;background:linear-gradient(180deg,#00e6ff,#0000ff) padding-box}
"""
PLAIN = ".box{width:200px;height:300px;overflow:auto;background:#111}"
JS = "el => ({ow: el.offsetWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight})"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page(viewport={"width": 400, "height": 400})
        await pg.set_content(f"<!doctype html><style>{STYLED}</style><div class=box>{ROWS}</div>")
        print("styled box:", await pg.locator(".box").evaluate(JS))
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(QA / "min_styled.png"))
        await pg.set_content(f"<!doctype html><style>{PLAIN}</style><div class=box>{ROWS}</div>")
        print("plain box:", await pg.locator(".box").evaluate(JS))
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(QA / "min_plain.png"))
        await b.close()

    for name in ("min_styled.png", "min_plain.png"):
        im = Image.open(QA / name).convert("RGB")
        print(name, "size", im.size)
        for x in (189, 192, 195, 198):
            vals = [im.getpixel((x, y)) for y in range(10, 290, 30)]
            print("  x=", x, vals)

asyncio.run(main())
