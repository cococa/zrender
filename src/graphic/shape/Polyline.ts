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
        console.log('=== zrender Polyline.buildPath ===', {
            roughness: this.roughness,
            filler: this.filler,
            points: shape.points ? shape.points.length : 0,
            stroke: this.style.stroke
        });
        
        if (this.roughness) {
            const stroke = typeof this.style.stroke === 'string' ? this.style.stroke : undefined;
            const rc = rough.canvas(ctx, {
                options: {
                    roughness: this.roughness,
                    fillStyle: this.filler,
                    stroke: stroke,
                    strokeWidth: this.style.lineWidth || 1,
                },
            });
            if (shape.points) {
                console.log('Drawing rough polyline with stroke:', stroke);
                rc.linearPath(shape.points as [number, number][]);
            }
            return;
        }
        polyHelper.buildPath(ctx, shape, false);
    }
}

Polyline.prototype.type = 'polyline';
export default Polyline;