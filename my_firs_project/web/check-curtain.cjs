const fs = require("fs");
const path = require("path");

async function main() {
  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch {
    // dynamic install via child won't work mid-script; expect npx to provide
    console.error("PUPPETEER_MISSING");
    process.exit(2);
  }

  const errors = [];
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(String(err.message || err)));

    await page.goto("http://localhost:5173/", { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const result = await page.evaluate(() => {
      const wrap = document.querySelector(".canvas-effect-wrapper");
      const root = document.querySelector(".curtain-effect-root");
      const canvas = document.querySelector(".curtain-effect-root canvas");
      const dim = (el) =>
        el
          ? {
              clientWidth: el.clientWidth,
              clientHeight: el.clientHeight,
              offsetWidth: el.offsetWidth,
              offsetHeight: el.offsetHeight,
            }
          : null;
      return {
        wrapper: dim(wrap),
        wrapperExists: !!wrap,
        root: dim(root),
        rootExists: !!root,
        canvasExists: !!canvas,
        canvas: canvas
          ? {
              widthAttr: canvas.getAttribute("width"),
              heightAttr: canvas.getAttribute("height"),
              widthProp: canvas.width,
              heightProp: canvas.height,
              styleWidth: canvas.style.width,
              styleHeight: canvas.style.height,
              clientWidth: canvas.clientWidth,
              clientHeight: canvas.clientHeight,
            }
          : null,
        bodySize: {
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
        },
      };
    });

    console.log(JSON.stringify({ ok: true, result, consoleErrors: errors }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e && e.stack ? e.stack : e) }));
  process.exit(1);
});
