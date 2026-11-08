const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-gpu', '--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  const htmlPath = path.resolve(__dirname, '../workflow-visualization.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // 1. Capture Github PR view
  await page.click('#view-tab-github');
  await page.waitForTimeout(300);
  await page.evaluate(() => { if (typeof fitToScreen === 'function') fitToScreen(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve(__dirname, '../artifacts-github.png') });
  console.log('Saved artifacts-github.png');

  // 1b. Capture Github PR Zoomed 100% (Pan at 0, 0)
  await page.evaluate(() => {
    if (typeof resetZoom === 'function') resetZoom();
    // Pan to focus on Zone 1 and Zone 2
    panX = 20;
    panY = -30;
    const canvas = document.getElementById('canvas');
    if (canvas) canvas.style.transform = `matrix(1, 0, 0, 1, ${panX}, ${panY})`;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.resolve(__dirname, '../artifacts-github-zoom.png') });
  console.log('Saved artifacts-github-zoom.png');

  // 1c. Capture Swimlanes Zoomed 100% (Pan at 0, 0)
  await page.click('#view-tab-swimlanes');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    if (typeof resetZoom === 'function') resetZoom();
    panX = -280;
    panY = -20;
    const canvas = document.getElementById('canvas');
    if (canvas) canvas.style.transform = `matrix(1, 0, 0, 1, ${panX}, ${panY})`;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.resolve(__dirname, '../artifacts-swimlanes-zoom.png') });
  console.log('Saved artifacts-swimlanes-zoom.png');

  // 1d. Capture Lifecycle Zoomed 100%
  await page.click('#view-tab-lifecycle');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    if (typeof resetZoom === 'function') resetZoom();
    panX = 20;
    panY = -30;
    const canvas = document.getElementById('canvas');
    if (canvas) canvas.style.transform = `matrix(1, 0, 0, 1, ${panX}, ${panY})`;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.resolve(__dirname, '../artifacts-lifecycle-zoom.png') });
  console.log('Saved artifacts-lifecycle-zoom.png');

  // 2. Capture Swimlanes view
  await page.click('#view-tab-swimlanes');
  await page.waitForTimeout(300);
  await page.evaluate(() => { if (typeof fitToScreen === 'function') fitToScreen(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve(__dirname, '../artifacts-swimlanes.png') });
  console.log('Saved artifacts-swimlanes.png');

  // 3. Capture Lifecycle view
  await page.click('#view-tab-lifecycle');
  await page.waitForTimeout(300);
  await page.evaluate(() => { if (typeof fitToScreen === 'function') fitToScreen(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve(__dirname, '../artifacts-lifecycle.png') });
  console.log('Saved artifacts-lifecycle.png');

  await browser.close();
}

capture().catch(console.error);
