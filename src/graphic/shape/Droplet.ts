/**
 * 水滴形状
 */

import Path, { PathProps } from '../Path';
import rough from '../../handdrawn/RoughCanvas';

export class DropletShape {
    cx = 0
    cy = 0
    width = 0
    height = 0
}

export interface DropletProps extends PathProps {
    shape?: Partial<DropletShape>
}
class Droplet extends Path<DropletProps> {

    shape: DropletShape

    constructor(opts?: DropletProps) {
        super(opts);
    }

    getDefaultShape() {
        return new DropletShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: DropletShape) {
        const x = shape.cx;
        const y = shape.cy;
        const a = shape.width;
        const b = shape.height;

        if (this.roughness) {
            const rc = rough.canvas(ctx, {
                options: {
                    roughness: this.roughness,
                },
            });
            const d = `M ${x} ${y + a} C ${x + a} ${y + a} ${x + a * 3 / 2} ${y - a / 3} ${x} ${y - b} `
                + `C ${x - a * 3 / 2} ${y - a / 3} ${x - a} ${y + a} ${x} ${y + a} Z`;
            rc.path(d);
            return;
        }

        ctx.moveTo(x, y + a);
        ctx.bezierCurveTo(
            x + a,
            y + a,
            x + a * 3 / 2,
            y - a / 3,
            x,
            y - b
        );
        ctx.bezierCurveTo(
            x - a * 3 / 2,
            y - a / 3,
            x - a,
            y + a,
            x,
            y + a
        );
        ctx.closePath();
    }
}

Droplet.prototype.type = 'droplet';

export default Droplet;
