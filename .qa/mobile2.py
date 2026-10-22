import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

S = Path("/dev-server/.qa")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await (await b.new_context(viewport={"width":393,"height":844})).new_page()
        await page.goto("http://localhost:8080/", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        for i in range(3):
            top = await page.evaluate("() => { const e=document.querySelector('.welcome-showcase-frame'); return e.getBoundingClientRect().top + window.scrollY - 90; }")
            await page.evaluate(f"window.scrollTo({{top:{round(top)}, behavior:'instant'}})")
            await page.wait_for_timeout(900)
        st = await page.evaluate("""() => { const e=document.querySelector('.welcome-showcase-frame'); const cs=getComputedStyle(e);
          return { rev: e.className.includes('is-revealed'), op: cs.opacity, y: Math.round(window.scrollY),
                   top: Math.round(e.getBoundingClientRect().top),
                   overflow: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth } }; }""")
        print("state:", st)
        await page.screenshot(path=str(S / "mobile.png"))
        await b.close()

asyncio.run(main())
