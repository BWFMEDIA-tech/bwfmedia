import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright
QA = Path(__file__).parent
START = "http://localhost:8080"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 800})
        page = await ctx.new_page()
        with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
            m = json.load(f)
        await page.goto(START)
        await page.evaluate("([k,v]) => window.localStorage.setItem(k,v)",
                            [m["storage_key"], json.dumps(m["session"])])
        await page.goto(START + "/admin/navigation", wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        nav = page.locator("aside nav").first
        await nav.hover()
        await nav.evaluate("el => el.scrollTop = 320")
        await page.wait_for_timeout(400)
        info = await nav.evaluate("el => ({ow: el.offsetWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight})")
        print("nav:", info, "| scrollbar space:", info["ow"] - info["cw"])
        await page.locator("aside").first.screenshot(path=str(QA / "aside.png"))
        await b.close()

asyncio.run(main())
