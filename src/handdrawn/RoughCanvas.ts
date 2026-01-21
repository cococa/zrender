import { createPathProxyFromString } from '../tool/path';
import {
    Options,
    ResolvedOptions,
    _o,
    line,
    rectangle,
    circle,
    ellipse,
    linearPath,
    polygon,
    OpSet
} from './draw';

function drawOpsToContext(ctx: CanvasRenderingContext2D, opSet: OpSet) {
    for (const item of opSet.ops) {
        const data = item.data;
        switch (item.op) {
            case 'move':
                ctx.moveTo(data[0], data[1]);
                break;
            case 'bcurveTo':
                ctx.bezierCurveTo(data[0], data[1], data[2], data[3], data[4], data[5]);
                break;
            case 'lineTo':
                ctx.lineTo(data[0], data[1]);
                break;
        }
    }
}

class RoughPathWalker {
    private rc: RoughCanvas;
    private options?: Options;
    private currentX = 0;
    private currentY = 0;
    private startX = 0;
    private startY = 0;

    constructor(rc: RoughCanvas, options?: Options) {
        this.rc = rc;
        this.options = options;
    }

    moveTo(x: number, y: number) {
        this.currentX = x;
        this.currentY = y;
        this.startX = x;
        this.startY = y;
    }

    lineTo(x: number, y: number) {
        this.rc.line(this.currentX, this.currentY, x, y, this.options);
        this.currentX = x;
        this.currentY = y;
    }

    bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
        // Manual simple approximation for bezier curve
        const steps = 10;
        let lastX = this.currentX;
        let lastY = this.currentY;
        const p0 = [this.currentX, this.currentY];
        const p1 = [x1, y1];
        const p2 = [x2, y2];
        const p3 = [x3, y3];

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const t1 = 1 - t;
            const a = t1 * t1 * t1;
            const b = 3 * t1 * t1 * t;
            const c = 3 * t1 * t * t;
            const d = t * t * t;

            const x = a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0];
            const y = a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1];

            this.rc.line(lastX, lastY, x, y, this.options);
            lastX = x;
            lastY = y;
        }

        this.currentX = x3;
        this.currentY = y3;
    }

    quadraticCurveTo(x1: number, y1: number, x2: number, y2: number) {
        // Manual simple approximation for quadratic curve
        const steps = 10;
        let lastX = this.currentX;
        let lastY = this.currentY;
        const p0 = [this.currentX, this.currentY];

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const t1 = 1 - t;
            const a = t1 * t1;
            const b = 2 * t1 * t;
            const c = t * t;

            const x = a * p0[0] + b * x1 + c * x2;
            const y = a * p0[1] + b * y1 + c * y2;

            this.rc.line(lastX, lastY, x, y, this.options);
            lastX = x;
            lastY = y;
        }
        this.currentX = x2;
        this.currentY = y2;
    }

    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise: boolean) {
        // Approximate arc with lines
        let start = startAngle;
        let end = endAngle;

        if (anticlockwise) {
            if (end > start) {
                end -= Math.PI * 2;
            }
        }
        else {
            if (end < start) {
                end += Math.PI * 2;
            }
        }

        const step = 0.1; // radian step
        const count = Math.ceil(Math.abs(end - start) / step);
        const delta = (end - start) / count;

        let lastX = x + Math.cos(start) * radius;
        let lastY = y + Math.sin(start) * radius;

        // If the arc doesn't start at current point, move or line?
        // Standard canvas arc does lineTo start of arc.
        this.rc.line(this.currentX, this.currentY, lastX, lastY, this.options);

        for (let i = 1; i <= count; i++) {
            const angle = start + delta * i;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            this.rc.line(lastX, lastY, px, py, this.options);
            lastX = px;
            lastY = py;
        }

        this.currentX = lastX;
        this.currentY = lastY;
    }

    // Support ellipse (used by PathProxy for 'A' command sometimes)
    ellipse(
        x: number,
        y: number,
        radiusX: number,
        radiusY: number,
        rotation: number,
        startAngle: number,
        endAngle: number,
        anticlockwise: boolean
    ) {
        // Approximate ellipse arc
        let start = startAngle;
        let end = endAngle;

        if (anticlockwise) {
            if (end > start) {
                end -= Math.PI * 2;
            }
        }
        else {
            if (end < start) {
                end += Math.PI * 2;
            }
        }

        const step = 0.1;
        const count = Math.ceil(Math.abs(end - start) / step);
        const delta = (end - start) / count;

        const getPoint = (angle: number) => {
            const px = radiusX * Math.cos(angle);
            const py = radiusY * Math.sin(angle);
            // Rotate
            const tx = px * Math.cos(rotation) - py * Math.sin(rotation);
            const ty = px * Math.sin(rotation) + py * Math.cos(rotation);
            return [x + tx, y + ty];
        };

        const [startX, startY] = getPoint(start);
        this.rc.line(this.currentX, this.currentY, startX, startY, this.options);

        let [lastX, lastY] = [startX, startY];
        for (let i = 1; i <= count; i++) {
            const angle = start + delta * i;
            const [px, py] = getPoint(angle);
            this.rc.line(lastX, lastY, px, py, this.options);
            lastX = px;
            lastY = py;
        }
        this.currentX = lastX;
        this.currentY = lastY;
    }

    closePath() {
        if (Math.abs(this.currentX - this.startX) > 1e-4 || Math.abs(this.currentY - this.startY) > 1e-4) {
            this.rc.line(this.currentX, this.currentY, this.startX, this.startY, this.options);
            this.currentX = this.startX;
            this.currentY = this.startY;
        }
    }
}

export class RoughCanvas {
    private ctx: CanvasRenderingContext2D;
    private config: any;

    constructor(canvas: HTMLCanvasElement | CanvasRenderingContext2D, config?: any) {
        if (canvas instanceof CanvasRenderingContext2D) {
            this.ctx = canvas;
        }
        else {
            this.ctx = canvas.getContext('2d')!;
        }
        this.config = config || {};
    }

    private _getOptions(options?: Options): ResolvedOptions {
        const defaults = this.config && this.config.options ? this.config.options : {};
        const merged = { ...defaults, ...options };
        return _o(merged);
    }

    line(x1: number, y1: number, x2: number, y2: number, options?: Options) {
        const o = this._getOptions(options);
        const ops = line(x1, y1, x2, y2, o);
        drawOpsToContext(this.ctx, ops);
    }

    rectangle(x: number, y: number, width: number, height: number, options?: Options) {
        const o = this._getOptions(options);
        const ops = rectangle(x, y, width, height, o);
        drawOpsToContext(this.ctx, ops);
    }

    circle(x: number, y: number, diameter: number, options?: Options) {
        const o = this._getOptions(options);
        const ops = circle(x, y, diameter, o);
        drawOpsToContext(this.ctx, ops);
    }

    ellipse(x: number, y: number, width: number, height: number, options?: Options) {
        const o = this._getOptions(options);
        const ops = ellipse(x, y, width, height, o);
        drawOpsToContext(this.ctx, ops);
    }

    linearPath(points: [number, number][], options?: Options) {
        const o = this._getOptions(options);
        const ops = linearPath(points, false, o);
        drawOpsToContext(this.ctx, ops);
    }

    polygon(points: [number, number][], options?: Options) {
        const o = this._getOptions(options);
        const ops = polygon(points, o);
        drawOpsToContext(this.ctx, ops);
    }

    arc(
        x: number,
        y: number,
        radius: number,
        start: number,
        end: number,
        anticlockwise: boolean = false,
        options?: Options
    ) {
        const o = this._getOptions(options);
        const walker = new RoughPathWalker(this, o);
        const startX = x + Math.cos(start) * radius;
        const startY = y + Math.sin(start) * radius;
        walker.moveTo(startX, startY);
        walker.arc(x, y, radius, start, end, anticlockwise);
    }

    path(d: string, options?: Options) {
        const o = this._getOptions(options);
        const proxy = createPathProxyFromString(d);
        const walker = new RoughPathWalker(this, o);
        proxy.rebuildPath(walker as any, 1);
    }
}

export default {
    canvas: (canvas: any, config?: any) => new RoughCanvas(canvas, config)
};
