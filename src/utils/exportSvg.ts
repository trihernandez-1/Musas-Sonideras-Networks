import { downloadBlob } from './download';
import { readCSSVar } from './colors';

/** Serializes an SVG element to a standalone, self-contained SVG string (explicit
 * width/height/xmlns, no CSS custom properties, since it may be opened outside the app). */
function serializeSvg(svg: SVGSVGElement, backgroundColor: string): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const viewBox = svg.getAttribute('viewBox');
  const [, , vbWidth, vbHeight] = viewBox ? viewBox.split(/\s+/).map(Number) : [0, 0, svg.clientWidth, svg.clientHeight];

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(vbWidth));
  clone.setAttribute('height', String(vbHeight));

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', String(vbWidth));
  bgRect.setAttribute('height', String(vbHeight));
  bgRect.setAttribute('fill', backgroundColor);
  clone.insertBefore(bgRect, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}

export function exportSvgAsSvgFile(svg: SVGSVGElement, fileName: string): void {
  const backgroundColor = readCSSVar('--color-bg', '#f6f4f2');
  const svgString = serializeSvg(svg, backgroundColor);
  downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), fileName);
}

export async function exportSvgAsPngFile(svg: SVGSVGElement, fileName: string, scale = 2): Promise<void> {
  const backgroundColor = readCSSVar('--color-bg', '#f6f4f2');
  const svgString = serializeSvg(svg, backgroundColor);
  const viewBox = svg.getAttribute('viewBox');
  const [, , vbWidth, vbHeight] = viewBox ? viewBox.split(/\s+/).map(Number) : [svg.clientWidth, svg.clientHeight];

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not rasterize the graph.'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = vbWidth * scale;
    canvas.height = vbHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not generate the PNG.');
    downloadBlob(blob, fileName);
  } finally {
    URL.revokeObjectURL(url);
  }
}
