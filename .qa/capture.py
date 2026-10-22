import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

S = Path("/dev-server/.qa"); S.mkdir(parents=True, exist_ok=True)

async def shoot(page, sel, out):
    top = await page.evaluate(f"() => {{ const e=document.querySelector('{sel}'); return e.getBoundingClientRect().top + window.scrollY - 120; }}")
    await page.evaluate(f"window.scrollTo({{top:{top}, behavior:'instant'}})")
    await page.wait_for_timeout(1600)
    state = await page.evaluate(f"""() => {{ const e=document.querySelector('{sel}'); const cs=getComputedStyle(e); return {{rev:e.className.includes('is-revealed'), op:cs.opacity}}; }}""")
    print(out, state)
    await page.locator(sel).screenshot(path=str(S / out))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await (await b.new_context(viewport={"width":1280,"height":900})).new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto("http://localhost:8080/", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        for name, sel in [("poster.png", ".welcome-poster-frame"), ("battle.png", ".welcome-battle-frame"), ("showcase.png", ".welcome-showcase-frame")]:
            await shoot(page, sel, name)
        await page.set_viewport_size({"width": 393, "height": 844})
        await page.wait_for_timeout(800)
        await shoot(page, ".welcome-showcase-frame", "showcase-mobile.png")
        print("errs:", errs[:3])
        await b.close()

asyncio.run(main())
