import type { Canvas as FabricCanvas } from 'fabric/fabric-impl';

export interface CaptureViewportOptions {
  /**
   * Override the device pixel ratio used for the exported image. Falls back to the browser DPR.
   */
  pixelRatio?: number;
  /**
   * Override the canvas background colour while exporting. Use `null` to force transparency.
   * When omitted the existing background colour is preserved in the export.
   */
  backgroundColor?: string | null;
}

export interface DownloadViewportOptions extends CaptureViewportOptions {
  /**
   * Custom filename (without extension) for the exported file. When omitted, a timestamped name is generated.
   */
  fileNamePrefix?: string;
}

interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

const getViewportBounds = (canvas: FabricCanvas): ViewportBounds => {
  const viewportTransform = canvas.viewportTransform;

  if (!viewportTransform) {
    throw new Error('Cannot export canvas before the viewport transform is initialised.');
  }

  const [scaleX, , , scaleY, translateX, translateY] = viewportTransform;

  if (scaleX === 0 || scaleY === 0) {
    throw new Error('Invalid canvas viewport transform: scale cannot be zero.');
  }

  const width = canvas.getWidth();
  const height = canvas.getHeight();

  const zoom = scaleX;
  const left = -translateX / zoom;
  const top = -translateY / zoom;
  const scaledWidth = width / zoom;
  const scaledHeight = height / zoom;

  return {
    left,
    top,
    width: scaledWidth,
    height: scaledHeight,
  } satisfies ViewportBounds;
};

const resolvePixelRatio = (pixelRatio?: number): number => {
  const defaultRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;

  if (!pixelRatio || Number.isNaN(pixelRatio) || pixelRatio <= 0) {
    return defaultRatio;
  }

  return pixelRatio;
};

const normaliseBackgroundOverride = (
  value: CaptureViewportOptions['backgroundColor'],
): FabricCanvas['backgroundColor'] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return 'rgba(0, 0, 0, 0)';
  }

  return value;
};

const sanitiseFilePrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return 'canvas-export';
  }

  return trimmed.replace(/[^a-zA-Z0-9-_]+/g, '-');
};

const buildFileName = (prefix?: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safePrefix = sanitiseFilePrefix(prefix ?? 'canvas-export');
  return `${safePrefix}-${timestamp}.png`;
};

export const captureViewportAsPNG = (
  canvas: FabricCanvas,
  options: CaptureViewportOptions = {},
): string => {
  const bounds = getViewportBounds(canvas);
  const multiplier = resolvePixelRatio(options.pixelRatio);
  const backgroundOverride = normaliseBackgroundOverride(options.backgroundColor);
  const shouldOverrideBackground = backgroundOverride !== undefined;
  const previousBackground = canvas.backgroundColor;

  if (shouldOverrideBackground) {
    canvas.backgroundColor = backgroundOverride;
  }

  canvas.renderAll();

  try {
    return canvas.toDataURL({
      format: 'png',
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      enableRetinaScaling: false,
      withoutTransform: false,
      multiplier,
    });
  } finally {
    if (shouldOverrideBackground) {
      canvas.backgroundColor = previousBackground;
      canvas.renderAll();
    }
  }
};

export const downloadViewportAsPNG = (
  canvas: FabricCanvas,
  options: DownloadViewportOptions = {},
): { fileName: string; dataUrl: string } => {
  const { fileNamePrefix, ...captureOptions } = options;
  const dataUrl = captureViewportAsPNG(canvas, captureOptions);
  const fileName = buildFileName(fileNamePrefix);

  if (typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.position = 'absolute';
    link.style.left = '-9999px';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return { fileName, dataUrl };
};
