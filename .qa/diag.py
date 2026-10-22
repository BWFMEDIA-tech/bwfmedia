import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await (await b.new_context(viewport={"width":1280,"height":900})).new_page()
        await page.goto("http://localhost:8080/", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        for step in (600, 1200, 1800):
            await page.evaluate(f"window.scrollTo({{top:{step}, behavior:'instant'}})")
            for wait in (200, 900, 1800):
                await page.wait_for_timeout(wait if wait == 200 else wait - 200)
                print(step, wait, await page.evaluate("""() => { const f=document.querySelector('.welcome-showcase-frame'); const w=f.parentElement;
                  return { y: Math.round(window.scrollY), top: Math.round(w.getBoundingClientRect().top), rev: f.className.includes('is-revealed') }; }"""))
        await b.close()

asyncio.run(main())
