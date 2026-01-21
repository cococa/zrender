/**
 * @module zrender/graphic/shape/Polyline
 */

import Path, { PathProps } from '../Path';
import * as polyHelper from '../helper/poly';
import { VectorArray } from '../../core/vector';
import rough from '../../handdrawn/RoughCanvas';

export class PolylineShape {
    points: VectorArray[] = null
    // Percent of displayed polyline. For animating purpose
    percent?: number = 1
    smooth?: number = 0
    smoothConstraint?: VectorArray[] = null
}

export interface PolylineProps extends PathProps {
    shape?: Partial<PolylineShape>
}
class Polyline extends Path<PolylineProps> {

    shape: PolylineShape

    constructor(opts?: PolylineProps) {
        super(opts);
    }

    getDefaultStyle() {
        return {
            stroke: '#000',
            fill: null as string
        };
    }

    getDefaultShape() {
        return new PolylineShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: PolylineShape) {
        if (this.roughness) {
            const rc = rough.canvas(ctx, {
                options: {
                    roughness: this.roughness,
                },
            });
            if (shape.points) {
                rc.linearPath(shape.points as [number, number][]);
            }
            return;
        }
        polyHelper.buildPath(ctx, shape, false);
    }
}

Polyline.prototype.type = 'polyline';
export default Polyline;