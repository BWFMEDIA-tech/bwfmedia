import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

QA = Path(__file__).parent
START = "http://localhost:8080"

async def restore(page, ctx):
    with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
        m = json.load(f)
    key, sess = m["storage_key"], json.dumps(m["session"])
    cookies = m.get("cookies") or []
    if cookies:
        await ctx.add_cookies([{**c, "url": START} for c in cookies])
    await page.goto(START)
    await page.evaluate("([k,v]) => window.localStorage.setItem(k,v)", [key, sess])

async def run(b, w, h, tag, open_drawer=False):
    ctx = await b.new_context(viewport={"width": w, "height": h})
    page = await ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    await restore(page, ctx)
    await page.goto(START + "/admin/navigation", wait_until="domcontentloaded")
    await page.wait_for_timeout(2500)
    if open_drawer:
        await page.get_by_label("Toggle sidebar").click()
        await page.wait_for_timeout(600)
    nav = page.locator("aside nav").first
    info = await nav.evaluate("el => ({sh: el.scrollHeight, ch: el.clientHeight, sw: getComputedStyle(el).scrollbarWidth, overflow: getComputedStyle(el).overflowY})")
    print(f"[{tag}] nav:", info)
    await page.screenshot(path=str(QA / f"{tag}_top.png"))
    await nav.evaluate("el => el.scrollTop = el.scrollHeight")
    await page.wait_for_timeout(500)
    await page.screenshot(path=str(QA / f"{tag}_bottom.png"))
    last = page.get_by_role("link", name="Navigation Bar").first
    prof = page.locator("aside a[href*='/admin/profile']").last
    lb = await last.bounding_box(); pb = await prof.bounding_box()
    print(f"[{tag}] last item bottom={lb['y']+lb['height']:.0f} profile top={pb['y']:.0f} cleared={lb['y']+lb['height'] <= pb['y']+1}")
    print(f"[{tag}] scrolled to bottom: {(await nav.evaluate('el => el.scrollTop + el.clientHeight >= el.scrollHeight - 2'))}")
    print(f"[{tag}] pageerrors: {errs[:3]}")
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        await run(b, 1280, 800, "desktop")
        await run(b, 393, 844, "mobile", open_drawer=True)
        await b.close()

asyncio.run(main())
