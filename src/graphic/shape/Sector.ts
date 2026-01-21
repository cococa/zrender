import Path, { PathProps } from '../Path';
import * as roundSectorHelper from '../helper/roundSector';
import rough from '../../handdrawn/RoughCanvas';

export class SectorShape {
    cx = 0
    cy = 0
    r0 = 0
    r = 0
    startAngle = 0
    endAngle = Math.PI * 2
    clockwise = true
    /**
     * Corner radius of sector
     *
     * clockwise, from inside to outside, four corners are
     * inner start -> inner end
     * outer start -> outer end
     *
     * 5               => [5, 5, 5, 5]
     * [5]             => [5, 5, 0, 0]
     * [5, 10]         => [5, 5, 10, 10]
     * [5, 10, 15]     => [5, 10, 15, 15]
     * [5, 10, 15, 20] => [5, 10, 15, 20]
     */
    cornerRadius: number | number[] = 0
}

export interface SectorProps extends PathProps {
    shape?: Partial<SectorShape>
}

class Sector extends Path<SectorProps> {

    shape: SectorShape

    constructor(opts?: SectorProps) {
        super(opts);
    }

    getDefaultShape() {
        return new SectorShape();
    }

    buildPath(ctx: CanvasRenderingContext2D, shape: SectorShape) {
        if (this.roughness) {
            const fill = typeof this.style.fill === 'string' ? this.style.fill : undefined;
            const rc = rough.canvas(ctx, {
                options: {
          roughness: this.roughness,
          fillStyle: this.filler,
          fill: fill,
        },
            });

            const recorder = {
                d: [] as string[],
                moveTo(x: number, y: number) {
                    this.d.push(`M ${x} ${y}`);
                },
                lineTo(x: number, y: number) {
                    this.d.push(`L ${x} ${y}`);
                },
                bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
                    this.d.push(`C ${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`);
                },
                quadraticCurveTo(x1: number, y1: number, x2: number, y2: number) {
                    this.d.push(`Q ${x1} ${y1} ${x2} ${y2}`);
                },
                arc(x: number, y: number, r: number, startAngle: number, endAngle: number, anticlockwise: boolean) {
                    const endX = x + r * Math.cos(endAngle);
                    const endY = y + r * Math.sin(endAngle);
                    let largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
                    if (Math.abs(endAngle - startAngle) > Math.PI * 2 - 1e-4) {
                         largeArc = 1; // Full circle case
                    }
                    const sweep = anticlockwise ? 0 : 1;
                    this.d.push(`A ${r} ${r} 0 ${largeArc} ${sweep} ${endX} ${endY}`);
                },
                closePath() {
                    this.d.push('Z');
                }
            };

            roundSectorHelper.buildPath(recorder as any, shape);
            rc.path(recorder.d.join(' '));
            return;
        }
        roundSectorHelper.buildPath(ctx, shape);
    }

    isZeroArea() {
        return this.shape.startAngle === this.shape.endAngle
            || this.shape.r === this.shape.r0;
    }
}

Sector.prototype.type = 'sector';

export default Sector;
