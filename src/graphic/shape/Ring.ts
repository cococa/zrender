/**
 * 圆环
 */

import Path, { PathProps } from '../Path';
import rough from '../../handdrawn/RoughCanvas';

export class RingShape {
    cx = 0
    cy = 0
    r = 0
    r0 = 0
}

export interface RingProps extends PathProps {
    shape?: Partial<RingShape>
}
class Ring extends Path<RingProps> {

    shape: RingShape

    constructor(opts?: RingProps) {
        super(opts);
    }

    getDefaultShape() {
        return new RingShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: RingShape) {
        const x = shape.cx;
        const y = shape.cy;
        const PI2 = Math.PI * 2;

        if (this.roughness) {
            const rc = rough.canvas(ctx, {
                options: {
                    roughness: this.roughness,
                },
            });
            const r = shape.r;
            const r0 = shape.r0;
            const outer = `M ${x + r} ${y} A ${r} ${r} 0 1 0 ${x - r} ${y} A ${r} ${r} 0 1 0 ${x + r} ${y} Z`;
            const inner = `M ${x + r0} ${y} A ${r0} ${r0} 0 1 1 ${x - r0} ${y} A ${r0} ${r0} 0 1 1 ${x + r0} ${y} Z`;
            rc.path(outer + ' ' + inner);
            return;
        }

        ctx.moveTo(x + shape.r, y);
        ctx.arc(x, y, shape.r, 0, PI2, false);
        ctx.moveTo(x + shape.r0, y);
        ctx.arc(x, y, shape.r0, 0, PI2, true);
    }
}

Ring.prototype.type = 'ring';
export default Ring;