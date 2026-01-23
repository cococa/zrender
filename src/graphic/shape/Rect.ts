/**
 * 矩形
 * @module zrender/graphic/shape/Rect
 */

import Path, { PathProps } from '../Path';
import * as roundRectHelper from '../helper/roundRect';
import { subPixelOptimizeRect } from '../helper/subPixelOptimize';
import rough from '../../handdrawn/RoughCanvas';

export class RectShape {
  // 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
  // r缩写为1         相当于 [1, 1, 1, 1]
  // r缩写为[1]       相当于 [1, 1, 1, 1]
  // r缩写为[1, 2]    相当于 [1, 2, 1, 2]
  // r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
  r?: number | number[];

  x = 0;
  y = 0;
  width = 0;
  height = 0;
}

export interface RectProps extends PathProps {
  shape?: Partial<RectShape>;
}
// Avoid create repeatly.
const subPixelOptimizeOutputShape = {};

class Rect extends Path<RectProps> {
  shape: RectShape;

  constructor(opts?: RectProps) {
    super(opts);
  }

  getDefaultShape() {
    return new RectShape();
  }

  buildPath(ctx: CanvasRenderingContext2D, shape: RectShape) {
    let x: number;
    let y: number;
    let width: number;
    let height: number;

    if (this.subPixelOptimize) {
      const optimizedShape = subPixelOptimizeRect(
        subPixelOptimizeOutputShape,
        shape,
        this.style
      );
      x = optimizedShape.x;
      y = optimizedShape.y;
      width = optimizedShape.width;
      height = optimizedShape.height;
      optimizedShape.r = shape.r;
      shape = optimizedShape;
    }
    else {
      x = shape.x;
      y = shape.y;
      width = shape.width;
      height = shape.height;
    }

    // clipPath 不应该应用手绘效果
    // 检查是否有 __clipTarget 属性，或者检查 parent 是否有 __clipPaths
    const isClipPath = !!(this as any).__clipTarget;
    //&& !isClipPath && width > 0 && height > 0
    if (this.roughness && !shape.r ) {
      console.log('=== Rect.buildPath with roughness ===', {
        roughness: this.roughness,
        filler: this.filler,
        fill: this.style.fill,
        stroke: this.style.stroke,
        x, y, width, height
      });
      
      const fill = typeof this.style.fill === 'string' ? this.style.fill : undefined;
      const stroke = typeof this.style.stroke === 'string' ? this.style.stroke : undefined;
      
      if (fill || stroke) {
        const rc = rough.canvas(ctx, {
          options: {
            roughness: this.roughness,
            fillStyle: this.filler,
            fill: fill,
            stroke: stroke,
            strokeWidth: this.style.lineWidth || 1,
          },
        });
        rc.rectangle(x, y, width, height);
        return;
      }
    }

    if (!shape.r) {
      // 普通绘制矩形
      ctx.rect(x, y, width, height);
    }
    else {
      // 带圆角的矩形
      roundRectHelper.buildPath(ctx, shape);
    }
  }

  isZeroArea() {
    return !this.shape.width || !this.shape.height;
  }
}

Rect.prototype.type = 'rect';

export default Rect;
