import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image
QA = Path("/dev-server/.qa"); START = "http://localhost:8080"
JS = "el => ({ow: el.offsetWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, st: el.scrollTop})"

async def run(b, w, h, tag, drawer=False):
    ctx = await b.new_context(viewport={"width": w, "height": h})
    page = await ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
        m = json.load(f)
    await page.goto(START)
    await page.evaluate("([k,v]) => window.localStorage.setItem(k,v)", [m["storage_key"], json.dumps(m["session"])])
    await page.goto(START + "/admin/navigation", wait_until="domcontentloaded")
    await page.wait_for_timeout(2500)
    if drawer:
        await page.get_by_label("Toggle sidebar").click()
        await page.wait_for_timeout(600)
    nav = page.locator("#admin-nav")
    bar = page.locator('[role="scrollbar"]')
    print(f"[{tag}] nav:", await nav.evaluate(JS))
    print(f"[{tag}] bar count:", await bar.count(), "box:", await bar.first.bounding_box())
    await page.screenshot(path=str(QA / f"drawn_{tag}_top.png"))
    bb = await bar.first.bounding_box()
    await page.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
    await page.mouse.down()
    await page.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2 + 170, steps=8)
    await page.mouse.up()
    await page.wait_for_timeout(400)
    after = await nav.evaluate(JS)
    print(f"[{tag}] after drag scrollTop={after['st']} of {after['sh'] - after['ch']}")
    await page.screenshot(path=str(QA / f"drawn_{tag}_dragged.png"))
    last = page.get_by_role("link", name="Navigation Bar").first
    prof = page.locator("aside a[href*='/admin/profile']").last
    lb = await last.bounding_box(); pb = await prof.bounding_box()
    print(f"[{tag}] last item bottom={lb['y']+lb['height']:.0f} profile top={pb['y']:.0f} cleared={lb['y']+lb['height'] <= pb['y']+1}")
    print(f"[{tag}] pageerrors: {errs[:2]}")
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        await run(b, 1280, 800, "desktop")
        await run(b, 393, 844, "mobile", drawer=True)
        await b.close()
    for tag in ("desktop", "mobile"):
        im = Image.open(QA / f"drawn_{tag}_top.png").convert("RGB")
        hits = [(x, y) for x in range(240, 258) for y in range(60, 760)
                if im.getpixel((x, y))[2] > 110 and im.getpixel((x, y))[1] > 90]
        print(tag, "thumb pixels in right strip:", len(hits), hits[:3])

asyncio.run(main())
