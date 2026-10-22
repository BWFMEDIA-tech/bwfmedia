import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image
QA = Path("/dev-server/.qa"); START = "http://localhost:8080"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        # desktop: sticky sidebar while the page scrolls
        ctx = await b.new_context(viewport={"width": 1280, "height": 800})
        page = await ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
            m = json.load(f)
        await page.goto(START)
        await page.evaluate("([k,v]) => window.localStorage.setItem(k,v)", [m["storage_key"], json.dumps(m["session"])])
        await page.goto(START + "/admin/navigation", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        await page.mouse.wheel(0, 500)
        await page.wait_for_timeout(500)
        aside = await page.locator("aside").first.bounding_box()
        bar = await page.locator('[role="scrollbar"]').first.bounding_box()
        print("desktop after page scroll: aside y=", aside["y"], "bar box=", bar)
        await page.screenshot(path=str(QA / "final_desktop.png"))
        print("desktop pageerrors:", errs[:2])
        await ctx.close()

        # mobile drawer
        ctx = await b.new_context(viewport={"width": 393, "height": 844})
        page = await ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(START)
        await page.evaluate("([k,v]) => window.localStorage.setItem(k,v)", [m["storage_key"], json.dumps(m["session"])])
        await page.goto(START + "/admin/navigation", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        await page.get_by_label("Toggle sidebar").click()
        await page.wait_for_timeout(700)
        bar = await page.locator('[role="scrollbar"]').first.bounding_box()
        print("mobile bar box:", bar)
        await page.screenshot(path=str(QA / "final_mobile.png"))
        await page.locator("#admin-nav").evaluate("el => el.scrollTop = el.scrollHeight")
        await page.wait_for_timeout(400)
        last = page.get_by_role("link", name="Navigation Bar").first
        prof = page.locator("aside a[href*='/admin/profile']").last
        lb = await last.bounding_box(); pb = await prof.bounding_box()
        print(f"mobile at bottom: last item bottom={lb['y']+lb['height']:.0f} profile top={pb['y']:.0f} cleared={lb['y']+lb['height'] <= pb['y']+1}")
        await page.screenshot(path=str(QA / "final_mobile_bottom.png"))
        print("mobile pageerrors:", errs[:2])
        await ctx.close()

    for name, box in (("final_desktop.png", bar),):
        pass
    im = Image.open(QA / "final_mobile.png").convert("RGB")
    x0, y0 = int(bar["x"]), int(bar["y"])
    print("mobile thumb pixels:", [im.getpixel((x0 + 3, y0 + d)) for d in (5, 40, 90, 140, 200)])

asyncio.run(main())
