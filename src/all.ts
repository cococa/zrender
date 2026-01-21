export * from './zrender';
export * from './export';

import {registerPainter} from './zrender';
import CanvasPainter from './canvas/Painter';
import SVGPainter from './svg/Painter';
registerPainter('canvas', CanvasPainter);
registerPainter('svg', SVGPainter);

// Export handdrawn module for roughness support
export * from './handdrawn/RoughCanvas';
