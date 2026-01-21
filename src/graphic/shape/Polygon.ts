/**
 * 多边形
 * @module zrender/shape/Polygon
 */

import Path, { PathProps } from '../Path';
import * as polyHelper from '../helper/poly';
import { VectorArray } from '../../core/vector';
import rough from '../../handdrawn/RoughCanvas';

export class PolygonShape {
    points: VectorArray[] = null
    smooth?: number = 0
    smoothConstraint?: VectorArray[] = null
}

export interface PolygonProps extends PathProps {
    shape?: Partial<PolygonShape>
}
class Polygon extends Path<PolygonProps> {

    shape: PolygonShape

    constructor(opts?: PolygonProps) {
        super(opts);
    }

    getDefaultShape() {
        return new PolygonShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: PolygonShape) {
        if (this.roughness) {
            const rc = rough.canvas(ctx, {
                options: {
                    roughness: this.roughness,
                },
            });
            // roughjs polygon expects [number, number][]
            // shape.points is VectorArray[] which is number[][]
            // We might need to cast or ensure it matches
            if (shape.points) {
                rc.polygon(shape.points as [number, number][]);
            }
            return;
        }
        polyHelper.buildPath(ctx, shape, true);
    }
};

Polygon.prototype.type = 'polygon';

export default Polygon;