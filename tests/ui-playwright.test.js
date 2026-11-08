const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runUITests() {
  console.log('=== STARTING PLAYWRIGHT UI TESTS FOR WORKFLOW VISUALIZATION ===\n');

  const htmlPath = path.resolve(__dirname, '../workflow-visualization.html');
  if (!fs.existsSync(htmlPath)) {
    throw new Error('workflow-visualization.html not found at ' + htmlPath);
  }
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-gpu', '--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[BROWSER CONSOLE ERROR]:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('[BROWSER PAGE ERROR]:', err.message);
    pageErrors.push(err.message);
  });

  console.log('Navigating to:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const report = {
    viewsTested: [],
    overlapIssues: [],
    labelOverlapIssues: [],
    textClippingIssues: [],
    connectorIssues: [],
    interactionIssues: [],
    zoneCoverageIssues: [],
    laneCoverageIssues: [],
    genericProcessIssues: [],
    canvasBoundsIssues: [],
    consoleErrors,
    pageErrors
  };

  const views = [
    { key: 'lifecycle', tabId: '#view-tab-lifecycle' },
    { key: 'swimlanes', tabId: '#view-tab-swimlanes' },
    { key: 'github', tabId: '#view-tab-github' }
  ];

  for (const v of views) {
    console.log(`\n========================================`);
    console.log(`Testing View: ${v.key}`);
    console.log(`========================================`);

    // Click tab
    await page.click(v.tabId);
    await page.waitForTimeout(400);

    // Call fitToScreen for consistent coordinates
    await page.evaluate(() => {
      if (typeof fitToScreen === 'function') fitToScreen();
    });
    // Wait for setTimeout in createEdgeElements (10ms) to attach SVG rects
    await page.waitForTimeout(300);

    report.viewsTested.push(v.key);

    // Collect all nodes, edge labels, and paths in view
    const viewMetrics = await page.evaluate((viewKey) => {
      const nodeElements = Array.from(document.querySelectorAll('.wf-node'));
      const labelGroups = Array.from(document.querySelectorAll('#svg-edge-labels g'));
      const edgePaths = Array.from(document.querySelectorAll('#svg-edges path'));

      const nodeData = nodeElements.map(el => {
        const rect = el.getBoundingClientRect();
        const id = el.getAttribute('data-node-id') || el.id.replace(/^node-/, '');
        const titleEl = el.querySelector('.node-title');
        const subEl = el.querySelector('.node-sub');
        const artifactEl = el.querySelector('.node-artifact');
        const phaseEl = el.querySelector('.node-phase');

        const title = titleEl ? titleEl.textContent.trim() : (el.getAttribute('data-node-label') || '');
        const sub = subEl ? subEl.textContent.trim() : '';
        const artifact = artifactEl ? artifactEl.textContent.trim() : '';
        const phase = phaseEl ? phaseEl.textContent.trim() : '';

        const rawLeft = parseFloat(el.style.left) || 0;
        const rawTop = parseFloat(el.style.top) || 0;
        const rawWidth = parseFloat(el.style.width) || el.offsetWidth;
        const rawHeight = parseFloat(el.style.height) || el.offsetHeight;

        // Check text clipping / overflow / ellipsis
        let hasOverflow = false;
        let overflowInfo = [];

        // Check vertical overflow: content must fit completely inside card (skip rotated decision diamonds)
        const isDecision = el.classList.contains('rotate-45');
        if (!isDecision && el.scrollHeight > el.clientHeight + 4) {
          hasOverflow = true;
          overflowInfo.push({
            reason: 'Card vertical content overflow',
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight
          });
        }

        // Check if subtitle contains truncation ellipsis
        if (sub.includes('...')) {
          hasOverflow = true;
          overflowInfo.push({ reason: 'Contains truncation ellipsis (...)', text: sub });
        }

        [titleEl, subEl, artifactEl].forEach(item => {
          if (item) {
            if (item.scrollWidth > item.clientWidth + 4) {
              const hasTooltip = !!item.getAttribute('title');
              if (!hasTooltip) {
                hasOverflow = true;
                overflowInfo.push({
                  text: item.textContent.trim(),
                  scrollWidth: item.scrollWidth,
                  clientWidth: item.clientWidth
                });
              }
            }
          }
        });

        return {
          id: el.id,
          nodeId: id,
          title,
          sub,
          artifact,
          phase,
          rawLeft,
          rawTop,
          rawWidth,
          rawHeight,
          rect: {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          },
          hasOverflow,
          overflowInfo
        };
      });

      const zoneElements = Array.from(document.querySelectorAll('#svg-background-zones rect'));
      const canvasEl = document.getElementById('canvas');
      const svgLayerEl = document.getElementById('svg-layer');

      const canvasMetrics = {
        width: canvasEl ? parseFloat(canvasEl.style.width) || canvasEl.clientWidth : 0,
        height: canvasEl ? parseFloat(canvasEl.style.height) || canvasEl.clientHeight : 0,
        svgWidth: svgLayerEl ? parseFloat(svgLayerEl.style.width) || svgLayerEl.clientWidth : 0,
        svgHeight: svgLayerEl ? parseFloat(svgLayerEl.style.height) || svgLayerEl.clientHeight : 0
      };

      const zoneData = zoneElements.map(r => ({
        x: parseFloat(r.getAttribute('x')) || 0,
        y: parseFloat(r.getAttribute('y')) || 0,
        width: parseFloat(r.getAttribute('width')) || 0,
        height: parseFloat(r.getAttribute('height')) || 0
      }));

      const labelData = labelGroups.map((g, idx) => {
        const textEl = g.querySelector('text');
        const text = textEl ? textEl.textContent.trim() : '';
        const rect = g.getBoundingClientRect();
        return {
          idx,
          text,
          rect: {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          }
        };
      }).filter(l => l.rect.width > 0 && l.rect.height > 0 && l.text.length > 0);

      const pathData = edgePaths.map(p => {
        const d = p.getAttribute('d') || '';
        return {
          id: p.id,
          d,
          hasNaN: d.includes('NaN'),
          empty: d.length === 0
        };
      });

      return {
        nodeCount: nodeData.length,
        nodeData,
        labelCount: labelData.length,
        labelData,
        pathCount: pathData.length,
        pathData,
        canvasMetrics,
        zoneData
      };
    }, v.key);

    console.log(`- Nodes: ${viewMetrics.nodeCount}`);
    console.log(`- Edge Labels: ${viewMetrics.labelCount}`);
    console.log(`- Edge Paths: ${viewMetrics.pathCount}`);
    console.log(`- Canvas Width: ${viewMetrics.canvasMetrics.width}px, SVG Width: ${viewMetrics.canvasMetrics.svgWidth}px`);

    // Check 1: Node-to-node overlap
    for (let i = 0; i < viewMetrics.nodeData.length; i++) {
      for (let j = i + 1; j < viewMetrics.nodeData.length; j++) {
        const n1 = viewMetrics.nodeData[i];
        const n2 = viewMetrics.nodeData[j];
        const r1 = n1.rect;
        const r2 = n2.rect;

        const intersects = (r1.left + 4 < r2.right && r1.right - 4 > r2.left && r1.top + 4 < r2.bottom && r1.bottom - 4 > r2.top);
        if (intersects) {
          const issue = `[VIEW: ${v.key}] Node overlap between "${n1.title || n1.id}" and "${n2.title || n2.id}"`;
          console.warn('  ⚠️ ' + issue);
          report.overlapIssues.push(issue);
        }
      }
    }

    // Check 2: Edge label overlapping any node card
    for (const label of viewMetrics.labelData) {
      for (const node of viewMetrics.nodeData) {
        const lr = label.rect;
        const nr = node.rect;

        const intersects = (lr.left + 2 < nr.right && lr.right - 2 > nr.left && lr.top + 2 < nr.bottom && lr.bottom - 2 > nr.top);
        if (intersects) {
          const issue = `[VIEW: ${v.key}] Edge label "${label.text}" overlaps Node "${node.title || node.id}"`;
          console.warn('  ⚠️ ' + issue);
          report.labelOverlapIssues.push(issue);
        }
      }
    }

    // Check 3: Text clipping / truncation issues
    for (const node of viewMetrics.nodeData) {
      if (node.hasOverflow) {
        const issue = `[VIEW: ${v.key}] Unhandled text clipping in Node "${node.title || node.id}": ${JSON.stringify(node.overflowInfo)}`;
        console.warn('  ⚠️ ' + issue);
        report.textClippingIssues.push(issue);
      }

      // Check 3b: No node should have generic 'PROCESS' as phase
      if (node.phase === 'PROCESS') {
        const issue = `[VIEW: ${v.key}] Node "${node.title || node.id}" has generic fallback phase "PROCESS"`;
        console.warn('  ⚠️ ' + issue);
        report.genericProcessIssues.push(issue);
      }
    }

    // Check 4: Canvas & SVG bounds coverage
    let maxNodeRawX = 0;
    viewMetrics.nodeData.forEach(n => {
      maxNodeRawX = Math.max(maxNodeRawX, n.rawLeft + n.rawWidth);
    });
    if (viewMetrics.canvasMetrics.width < maxNodeRawX) {
      const issue = `[VIEW: ${v.key}] Canvas width (${viewMetrics.canvasMetrics.width}px) is smaller than max node bound (${maxNodeRawX}px)`;
      console.warn('  ⚠️ ' + issue);
      report.canvasBoundsIssues.push(issue);
    }
    if (viewMetrics.canvasMetrics.svgWidth < maxNodeRawX) {
      const issue = `[VIEW: ${v.key}] SVG width (${viewMetrics.canvasMetrics.svgWidth}px) is smaller than max node bound (${maxNodeRawX}px)`;
      console.warn('  ⚠️ ' + issue);
      report.canvasBoundsIssues.push(issue);
    }

    // Check 5: Zone & Lane coverage
    if (v.key === 'github') {
      for (const node of viewMetrics.nodeData) {
        const insideAnyZone = viewMetrics.zoneData.some(z => {
          return (
            node.rawLeft >= z.x - 5 &&
            node.rawLeft + node.rawWidth <= z.x + z.width + 15 &&
            node.rawTop >= z.y - 5 &&
            node.rawTop + node.rawHeight <= z.y + z.height + 15
          );
        });
        if (!insideAnyZone) {
          const issue = `[VIEW: github] Node "${node.title || node.id}" (x: ${node.rawLeft}, w: ${node.rawWidth}) is outside all zone rectangles!`;
          console.warn('  ⚠️ ' + issue);
          report.zoneCoverageIssues.push(issue);
        }
      }
    }

    if (v.key === 'swimlanes') {
      const maxLaneWidth = Math.max(...viewMetrics.zoneData.map(z => z.width), 0);
      if (maxLaneWidth < maxNodeRawX - 50) {
        const issue = `[VIEW: swimlanes] Lane background width (${maxLaneWidth}px) does not cover all nodes (${maxNodeRawX}px)`;
        console.warn('  ⚠️ ' + issue);
        report.laneCoverageIssues.push(issue);
      }
    }

    // Check 6: Edge path validity
    for (const p of viewMetrics.pathData) {
      if (p.hasNaN || p.empty) {
        const issue = `[VIEW: ${v.key}] Invalid path ${p.id}: d="${p.d}"`;
        console.warn('  ⚠️ ' + issue);
        report.connectorIssues.push(issue);
      }
    }

    // Check 7: Node click opens Inspector Drawer and displays node info
    const testNodes = viewMetrics.nodeData.slice(0, 3);
    for (const tn of testNodes) {
      await page.click(`#${tn.id}`);
      await page.waitForTimeout(200);

      const isDrawerOpen = await page.evaluate(() => {
        const drawer = document.getElementById('inspector-drawer');
        if (!drawer) return false;
        const transform = drawer.style.transform;
        return transform === 'translateX(0px)' || transform === 'translateX(0)' || transform === '';
      });

      if (!isDrawerOpen) {
        const issue = `[VIEW: ${v.key}] Clicking node ${tn.id} did not open inspector drawer`;
        console.warn('  ⚠️ ' + issue);
        report.interactionIssues.push(issue);
      } else {
        const inspectorTitle = await page.evaluate(() => document.getElementById('ins-title')?.textContent?.trim() || '');
        if (tn.title && !inspectorTitle.includes(tn.title)) {
          const issue = `[VIEW: ${v.key}] Inspector title mismatch: expected "${tn.title}" inside "${inspectorTitle}"`;
          console.warn('  ⚠️ ' + issue);
          report.interactionIssues.push(issue);
        }
      }
    }

    // Close inspector
    await page.evaluate(() => {
      if (typeof closeInspector === 'function') closeInspector();
    });
    await page.waitForTimeout(150);
  }

  // --- Search functionality test ---
  console.log('\n--- Testing Search & Filter ---');
  await page.click('#view-tab-github');
  await page.waitForTimeout(300);

  await page.fill('#search-input', 'Audit');
  await page.waitForTimeout(200);

  const searchStats = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.wf-node'));
    const dimmed = Array.from(document.querySelectorAll('.wf-node.wf-dimmed'));
    return { total: all.length, dimmed: dimmed.length };
  });

  console.log(`Search 'Audit': ${searchStats.total - searchStats.dimmed} matched out of ${searchStats.total}`);
  if (searchStats.dimmed === 0) {
    report.interactionIssues.push('Search filter failed to dim non-matching nodes');
  }

  // Clear search
  await page.fill('#search-input', '');
  await page.waitForTimeout(150);
  const clearedDimmed = await page.evaluate(() => document.querySelectorAll('.wf-node.wf-dimmed').length);
  if (clearedDimmed > 0) {
    report.interactionIssues.push('Clearing search did not reset dimmed nodes');
  }

  // --- Zoom controls test ---
  console.log('\n--- Testing Zoom & Fit ---');
  const getScale = () => page.evaluate(() => {
    const canvas = document.getElementById('canvas');
    if (!canvas) return 1;
    const match = canvas.style.transform.match(/matrix\(([^,]+)/);
    return match ? parseFloat(match[1]) : 1;
  });

  const baseScale = await getScale();
  await page.click('button[onclick="zoomIn()"]');
  await page.waitForTimeout(150);
  const zoomInScale = await getScale();
  console.log(`Zoom In: ${baseScale} -> ${zoomInScale}`);
  if (zoomInScale <= baseScale) {
    report.interactionIssues.push('Zoom In did not increase scale');
  }

  await page.click('button[onclick="zoomOut()"]');
  await page.waitForTimeout(150);
  const zoomOutScale = await getScale();
  console.log(`Zoom Out: ${zoomInScale} -> ${zoomOutScale}`);
  if (zoomOutScale >= zoomInScale) {
    report.interactionIssues.push('Zoom Out did not decrease scale');
  }

  await page.click('button[onclick="fitToScreen()"]');
  await page.waitForTimeout(200);
  const fitScale = await getScale();
  console.log(`Fit Scale: ${fitScale}`);
  if (fitScale <= 0 || isNaN(fitScale)) {
    report.interactionIssues.push('Fit to Screen resulted in invalid scale: ' + fitScale);
  } else if (fitScale < 0.35) {
    report.interactionIssues.push(`Fit to Screen scale too small (${fitScale} < 0.35), diagram will be unreadable`);
  }

  // --- Multi-viewport responsiveness test ---
  console.log('\n--- Testing Viewport Responsiveness ---');
  const viewports = [
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1280, height: 720, name: '1280x720' }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.evaluate(() => { if (typeof fitToScreen === 'function') fitToScreen(); });
    await page.waitForTimeout(200);

    const vpCheck = await page.evaluate(() => {
      const vpEl = document.getElementById('viewport');
      const drawer = document.getElementById('inspector-drawer');
      return {
        viewportW: vpEl ? vpEl.clientWidth : 0,
        viewportH: vpEl ? vpEl.clientHeight : 0,
        drawerExists: !!drawer
      };
    });

    if (vpCheck.viewportW < 200 || vpCheck.viewportH < 200) {
      report.interactionIssues.push(`Viewport collapsed at ${vp.name}: ${vpCheck.viewportW}x${vpCheck.viewportH}`);
    }
  }

  await browser.close();

  console.log('\n========================================');
  console.log('PLAYWRIGHT TEST EXECUTION COMPLETE');
  console.log(`- Overlap Issues: ${report.overlapIssues.length}`);
  console.log(`- Label Overlap Issues: ${report.labelOverlapIssues.length}`);
  console.log(`- Text Clipping Issues: ${report.textClippingIssues.length}`);
  console.log(`- Zone Coverage Issues: ${report.zoneCoverageIssues.length}`);
  console.log(`- Lane Coverage Issues: ${report.laneCoverageIssues.length}`);
  console.log(`- Generic Phase Issues: ${report.genericProcessIssues.length}`);
  console.log(`- Canvas Bounds Issues: ${report.canvasBoundsIssues.length}`);
  console.log(`- Connector Issues: ${report.connectorIssues.length}`);
  console.log(`- Interaction Issues: ${report.interactionIssues.length}`);
  console.log(`- Console Errors: ${report.consoleErrors.length}`);
  console.log(`- Page Errors: ${report.pageErrors.length}`);
  console.log('========================================\n');

  const allPassed = (
    report.overlapIssues.length === 0 &&
    report.labelOverlapIssues.length === 0 &&
    report.textClippingIssues.length === 0 &&
    report.zoneCoverageIssues.length === 0 &&
    report.laneCoverageIssues.length === 0 &&
    report.genericProcessIssues.length === 0 &&
    report.canvasBoundsIssues.length === 0 &&
    report.connectorIssues.length === 0 &&
    report.interactionIssues.length === 0 &&
    report.consoleErrors.length === 0 &&
    report.pageErrors.length === 0
  );

  return { success: allPassed, report };
}

if (require.main === module) {
  runUITests().then(res => {
    if (!res.success) {
      console.error('FAIL: One or more UI checks failed. See details above.');
      process.exit(1);
    } else {
      console.log('SUCCESS: All UI checks passed cleanly!');
      process.exit(0);
    }
  }).catch(err => {
    console.error('Fatal error during UI test execution:', err);
    process.exit(1);
  });
}

module.exports = { runUITests };
