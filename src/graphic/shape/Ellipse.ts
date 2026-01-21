/**
 * 椭圆形状
 */

import Path, { PathProps } from '../Path';
import rough from '../../handdrawn/RoughCanvas';

export class EllipseShape {
    cx = 0
    cy = 0
    rx = 0
    ry = 0
}

export interface EllipseProps extends PathProps {
    shape?: Partial<EllipseShape>
}
class Ellipse extends Path<EllipseProps> {

    shape: EllipseShape

    constructor(opts?: EllipseProps) {
        super(opts);
    }

    getDefaultShape() {
        return new EllipseShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: EllipseShape) {
        if (this.roughness) {
            const rc = rough.canvas(ctx, {
                options: {
                    roughness: this.roughness,
                },
            });
            rc.ellipse(shape.cx, shape.cy, shape.rx * 2, shape.ry * 2);
            return;
        }

        const k = 0.5522848;
        const x = shape.cx;
        const y = shape.cy;
        const a = shape.rx;
        const b = shape.ry;
        const ox = a * k; // 水平控制点偏移量
        const oy = b * k; // 垂直控制点偏移量
        // 从椭圆的左端点开始顺时针绘制四条三次贝塞尔曲线
        ctx.moveTo(x - a, y);
        ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
        ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
        ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
        ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
        ctx.closePath();
    }
}

Ellipse.prototype.type = 'ellipse';

export default Ellipse;