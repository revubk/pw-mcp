import { Page } from 'playwright';
import { A11yErrorDetail } from '../../types/audit';

/**
 * Injects a browser-side canvas layer overlay to sketch bounding outlines,
 * pointer line bridges, and perfect, non-overlapping rule labels.
 * Keeps the document body layout width original to prevent vertical scaling distortion.
 */
export async function injectBrowserCanvasChart(page: Page, violations: A11yErrorDetail[]): Promise<void> {
  const serializedErrors = violations.map(err => ({
    selector: err.targetSelector,
    id: err.id
  }));

  await page.evaluate((errors) => {
    // 1. Calculate the exact, unaltered document layout dimensions
    const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const docWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);

    // Remove any previous instances to prevent rendering ghosts
    const oldOverlay = document.getElementById('canvas-chart-overlay');
    if (oldOverlay) oldOverlay.remove();

    // 2. Instantiate an isolated, absolute-positioned container specifically for our canvas overlay
    const overlayContainer = document.createElement('div');
    overlayContainer.id = 'canvas-chart-overlay';
    overlayContainer.style.position = 'absolute';
    overlayContainer.style.top = '0';
    overlayContainer.style.left = '0';
    overlayContainer.style.width = `${docWidth}px`;
    overlayContainer.style.height = `${docHeight}px`;
    overlayContainer.style.zIndex = '2147483647';
    overlayContainer.style.pointerEvents = 'none';

    const canvas = document.createElement('canvas');
    canvas.width = docWidth;
    canvas.height = docHeight;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const occupiedLabelsRegistry: Array<{ top: number; bottom: number }> = [];

    errors.forEach((err) => {
      const el = document.querySelector(err.selector) as HTMLElement;
      if (!el || err.selector === 'html' || err.selector === 'body') return;

      const rect = el.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      const elX = rect.left + scrollLeft;
      const elY = rect.top + scrollTop;
      const elW = rect.width;
      const elH = rect.height;

      if (elW === 0 || elH === 0) return;

      // 3. Sketch Red Element Bounding Box
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.strokeRect(elX, elY, elW, elH);

      // 4. Compute Dynamic Placement to avoid stacking or clipping bounds
      // Push label to the right of the element box, staying within screen boundaries safely
      let labelX = elX + elW + 15;
      let labelY = elY + (elH / 2) - 11;

      if (labelX + 140 > docWidth) {
        labelX = elX - 150;
        if (labelX < 0) labelX = 10; 
      }

      let safetyLoopGuard = 0;
      while (safetyLoopGuard < 30) {
        let spaceIsClear = true;
        for (const occupied of occupiedLabelsRegistry) {
          if (!(labelY + 22 < occupied.top || labelY > occupied.bottom)) {
            spaceIsClear = false;
            break;
          }
        }
        if (!spaceIsClear) {
          labelY += 26; 
          safetyLoopGuard++;
        } else {
          break;
        }
      }

      occupiedLabelsRegistry.push({ top: labelY, bottom: labelY + 22 });

      ctx.beginPath();
      ctx.strokeStyle = '#dc2626'; 
      ctx.lineWidth = 1.5;
      const startX = (labelX > elX) ? (elX + elW) : elX;
      ctx.moveTo(startX, elY + (elH / 2));
      ctx.lineTo(labelX, labelY + 11);
      ctx.stroke();

      const labelText = `[${err.id}]`;
      ctx.font = "bold 11px monospace";
      
      const textMetrics = ctx.measureText(labelText);
      const boxWidth = textMetrics.width + 12;
      const boxHeight = 22;

      ctx.fillStyle = '#dc2626'; 
      ctx.fillRect(labelX, labelY, boxWidth, boxHeight);

      ctx.strokeStyle = '#ffff00'; 
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX, labelY, boxWidth, boxHeight);

      ctx.fillStyle = '#ffff00'; 
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, labelX + 6, labelY + 11);
    });

    overlayContainer.appendChild(canvas);
    document.body.appendChild(overlayContainer);
    
  }, serializedErrors);
}
