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
            const stroke = typeof this.style.stroke === 'string' ? this.style.stroke : undefined;
            
            console.log('=== Sector.buildPath with roughness ===', {
                roughness: this.roughness,
                filler: this.filler,
                fill: fill,
                stroke: stroke,
                shape: shape
            });
            
            const { cx, cy, r0, r, startAngle, endAngle, clockwise } = shape;
            
            // 将扇形转换为多边形点集
            const steps = Math.max(20, Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 18))); // 至少20个点
            const points: [number, number][] = [];
            
            // 如果有内半径，需要构建圆环扇形
            if (r0 > 0) {
                // 外弧的点
                for (let i = 0; i <= steps; i++) {
                    const angle = startAngle + (endAngle - startAngle) * i / steps;
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    points.push([x, y]);
                }
                // 内弧的点（反向）
                for (let i = steps; i >= 0; i--) {
                    const angle = startAngle + (endAngle - startAngle) * i / steps;
                    const x = cx + r0 * Math.cos(angle);
                    const y = cy + r0 * Math.sin(angle);
                    points.push([x, y]);
                }
            } else {
                // 从圆心开始
                points.push([cx, cy]);
                // 圆弧的点
                for (let i = 0; i <= steps; i++) {
                    const angle = startAngle + (endAngle - startAngle) * i / steps;
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    points.push([x, y]);
                }
            }
            
            console.log('Sector polygon points:', points.length);
            
            // 使用 rough.js 的 polygon 方法绘制
            const rc = rough.canvas(ctx, {
                options: {
                    roughness: this.roughness,
                    fillStyle: this.filler,
                    fill: fill,
                    stroke: stroke,
                    strokeWidth: this.style.lineWidth || 1,
                },
            });
            
            rc.polygon(points);
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
