import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image
QA = Path("/dev-server/.qa"); START = "http://localhost:8080"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 800})
        page = await ctx.new_page()
        with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
            m = json.load(f)
        await page.goto(START)
        await page.evaluate("([k,v]) => window.localStorage.setItem(k,v)", [m["storage_key"], json.dumps(m["session"])])
        await page.goto(START + "/admin/navigation", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        info = await page.locator('[role="scrollbar"]').first.evaluate("""el => {
          const cs = getComputedStyle(el);
          return { bg: cs.backgroundImage, size: cs.height, top: cs.top, pos: cs.position, disp: cs.display };
        }""")
        print("thumb style:", info)
        box = await page.locator('[role="scrollbar"]').first.bounding_box()
        print("thumb box:", box)
        await page.screenshot(path=str(QA / "thumb.png"))
        # scroll to the very bottom and re-check overlap
        await page.locator("#admin-nav").evaluate("el => el.scrollTop = el.scrollHeight")
        await page.wait_for_timeout(400)
        last = page.get_by_role("link", name="Navigation Bar").first
        prof = page.locator("aside a[href*='/admin/profile']").last
        lb = await last.bounding_box(); pb = await prof.bounding_box()
        print(f"at bottom: last item bottom={lb['y']+lb['height']:.0f} profile top={pb['y']:.0f} cleared={lb['y']+lb['height'] <= pb['y']+1}")
        await page.screenshot(path=str(QA / "thumb_bottom.png"))
        await b.close()

    im = Image.open(QA / "thumb.png").convert("RGB")
    x0, y0 = int(box["x"]), int(box["y"])
    print("pixels down the thumb:", [im.getpixel((x0 + 3, y0 + d)) for d in (5, 30, 60, 90, 120, 150, 185)])

asyncio.run(main())
