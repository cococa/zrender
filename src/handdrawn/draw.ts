import {Random } from './math'


export interface Options {
    maxRandomnessOffset?: number;
    roughness?: number;
    bowing?: number;
    stroke?: string;
    strokeWidth?: number;
    curveFitting?: number;
    curveTightness?: number;
    curveStepCount?: number;
    fill?: string;
    fillStyle?: string;
    fillWeight?: number;
    hachureAngle?: number;
    hachureGap?: number;
    simplification?: number;
    dashOffset?: number;
    dashGap?: number;
    zigzagOffset?: number;
    seed?: number;
    strokeLineDash?: number[];
    strokeLineDashOffset?: number;
    fillLineDash?: number[];
    fillLineDashOffset?: number;
    disableMultiStroke?: boolean;
    disableMultiStrokeFill?: boolean;
    preserveVertices?: boolean;
    fixedDecimalPlaceDigits?: number;
    fillShapeRoughnessGain?: number;
  }

  export interface ResolvedOptions extends Options {
    maxRandomnessOffset: number;
    roughness: number;
    bowing: number;
    stroke: string;
    strokeWidth: number;
    curveFitting: number;
    curveTightness: number;
    curveStepCount: number;
    fillStyle: string;
    fillWeight: number;
    hachureAngle: number;
    hachureGap: number;
    dashOffset: number;
    dashGap: number;
    zigzagOffset: number;
    seed: number;
    randomizer?: Random;
    disableMultiStroke: boolean;
    disableMultiStrokeFill: boolean;
    preserveVertices: boolean;
    fillShapeRoughnessGain: number;
  }


  interface EllipseParams {
    rx: number;
    ry: number;
    increment: number;
  }
  export type Point = [number, number];

  export declare type OpType = 'move' | 'bcurveTo' | 'lineTo';
  export declare type OpSetType = 'path' | 'fillPath' | 'fillSketch';
  
  export interface Op {
    op: OpType;
    data: number[];
  }
  
  export interface OpSet {
    type: OpSetType;
    ops: Op[];
    size?: Point;
    path?: string;
  }


  export interface EllipseResult {
    opset: OpSet;
    estimatedPoints: Point[];
  }

  function random(ops: ResolvedOptions): number {
    if (!ops.randomizer) {
      ops.randomizer = new Random(ops.seed || 0);
    }
    return ops.randomizer.next();
  }
  
  function _offset(min: number, max: number, ops: ResolvedOptions, roughnessGain = 1): number {
    return ops.roughness * roughnessGain * ((random(ops) * (max - min)) + min);
  }
  
  function _offsetOpt(x: number, ops: ResolvedOptions, roughnessGain = 1): number {
    return _offset(-x, x, ops, roughnessGain);
  }

  function _line(x1: number, y1: number, x2: number, y2: number, o: ResolvedOptions, move: boolean, overlay: boolean): Op[] {
    const lengthSq = Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2);
    const length = Math.sqrt(lengthSq);
    let roughnessGain = 1;
    if (length < 200) {
      roughnessGain = 1;
    } else if (length > 500) {
      roughnessGain = 0.4;
    } else {
      roughnessGain = (-0.0016668) * length + 1.233334;
    }
  
    let offset = o.maxRandomnessOffset || 0;
    if ((offset * offset * 100) > lengthSq) {
      offset = length / 10;
    }
    const halfOffset = offset / 2;
    const divergePoint = 0.2 + random(o) * 0.2;
    let midDispX = o.bowing * o.maxRandomnessOffset * (y2 - y1) / 200;
    let midDispY = o.bowing * o.maxRandomnessOffset * (x1 - x2) / 200;
    midDispX = _offsetOpt(midDispX, o, roughnessGain);
    midDispY = _offsetOpt(midDispY, o, roughnessGain);
    const ops: Op[] = [];
    const randomHalf = () => _offsetOpt(halfOffset, o, roughnessGain);
    const randomFull = () => _offsetOpt(offset, o, roughnessGain);
    const preserveVertices = o.preserveVertices;
    if (move) {
      if (overlay) {
        ops.push({
          op: 'move', data: [
            x1 + (preserveVertices ? 0 : randomHalf()),
            y1 + (preserveVertices ? 0 : randomHalf()),
          ],
        });
      } else {
        ops.push({
          op: 'move', data: [
            x1 + (preserveVertices ? 0 : _offsetOpt(offset, o, roughnessGain)),
            y1 + (preserveVertices ? 0 : _offsetOpt(offset, o, roughnessGain)),
          ],
        });
      }
    }
    if (overlay) {
      ops.push({
        op: 'bcurveTo',
        data: [
          midDispX + x1 + (x2 - x1) * divergePoint + randomHalf(),
          midDispY + y1 + (y2 - y1) * divergePoint + randomHalf(),
          midDispX + x1 + 2 * (x2 - x1) * divergePoint + randomHalf(),
          midDispY + y1 + 2 * (y2 - y1) * divergePoint + randomHalf(),
          x2 + (preserveVertices ? 0 : randomHalf()),
          y2 + (preserveVertices ? 0 : randomHalf()),
        ],
      });
    } else {
      ops.push({
        op: 'bcurveTo',
        data: [
          midDispX + x1 + (x2 - x1) * divergePoint + randomFull(),
          midDispY + y1 + (y2 - y1) * divergePoint + randomFull(),
          midDispX + x1 + 2 * (x2 - x1) * divergePoint + randomFull(),
          midDispY + y1 + 2 * (y2 - y1) * divergePoint + randomFull(),
          x2 + (preserveVertices ? 0 : randomFull()),
          y2 + (preserveVertices ? 0 : randomFull()),
        ],
      });
    }
    return ops;
  }
  


  export function generateEllipseParams(width: number, height: number, o: ResolvedOptions): any {
    const psq = Math.sqrt(Math.PI * 2 * Math.sqrt((Math.pow(width / 2, 2) + Math.pow(height / 2, 2)) / 2));
    const stepCount = Math.ceil(Math.max(o.curveStepCount, (o.curveStepCount / Math.sqrt(200)) * psq));
    const increment = (Math.PI * 2) / stepCount;
    let rx = Math.abs(width / 2);
    let ry = Math.abs(height / 2);
    const curveFitRandomness = 1 - o.curveFitting;
    rx += _offsetOpt(rx * curveFitRandomness, o);
    ry += _offsetOpt(ry * curveFitRandomness, o);
    return { increment, rx, ry };
  }

  function _computeEllipsePoints(increment: number, cx: number, cy: number, rx: number, ry: number, offset: number, overlap: number, o: ResolvedOptions): Point[][] {
    const coreOnly = o.roughness === 0;
    const corePoints: Point[] = [];
    const allPoints: Point[] = [];
  
    if (coreOnly) {
      increment = increment / 4;
      allPoints.push([
        cx + rx * Math.cos(-increment),
        cy + ry * Math.sin(-increment),
      ]);
      for (let angle = 0; angle <= Math.PI * 2; angle = angle + increment) {
        const p: Point = [
          cx + rx * Math.cos(angle),
          cy + ry * Math.sin(angle),
        ];
        corePoints.push(p);
        allPoints.push(p);
      }
      allPoints.push([
        cx + rx * Math.cos(0),
        cy + ry * Math.sin(0),
      ]);
      allPoints.push([
        cx + rx * Math.cos(increment),
        cy + ry * Math.sin(increment),
      ]);
    } else {
      const radOffset = _offsetOpt(0.5, o) - (Math.PI / 2);
      allPoints.push([
        _offsetOpt(offset, o) + cx + 0.9 * rx * Math.cos(radOffset - increment),
        _offsetOpt(offset, o) + cy + 0.9 * ry * Math.sin(radOffset - increment),
      ]);
      const endAngle = Math.PI * 2 + radOffset - 0.01;
      for (let angle = radOffset; angle < endAngle; angle = angle + increment) {
        const p: Point = [
          _offsetOpt(offset, o) + cx + rx * Math.cos(angle),
          _offsetOpt(offset, o) + cy + ry * Math.sin(angle),
        ];
        corePoints.push(p);
        allPoints.push(p);
      }
      allPoints.push([
        _offsetOpt(offset, o) + cx + rx * Math.cos(radOffset + Math.PI * 2 + overlap * 0.5),
        _offsetOpt(offset, o) + cy + ry * Math.sin(radOffset + Math.PI * 2 + overlap * 0.5),
      ]);
      allPoints.push([
        _offsetOpt(offset, o) + cx + 0.98 * rx * Math.cos(radOffset + overlap),
        _offsetOpt(offset, o) + cy + 0.98 * ry * Math.sin(radOffset + overlap),
      ]);
      allPoints.push([
        _offsetOpt(offset, o) + cx + 0.9 * rx * Math.cos(radOffset + overlap * 0.5),
        _offsetOpt(offset, o) + cy + 0.9 * ry * Math.sin(radOffset + overlap * 0.5),
      ]);
    }
  
  
    return [allPoints, corePoints];
}
  
  
    function _curve(points: Point[], closePoint: Point | null, o: ResolvedOptions): Op[] {
        const len = points.length;
        const ops: Op[] = [];
        if (len > 3) {
          const b = [];
          const s = 1 - o.curveTightness;
          ops.push({ op: 'move', data: [points[1][0], points[1][1]] });
          for (let i = 1; (i + 2) < len; i++) {
            const cachedVertArray = points[i];
            b[0] = [cachedVertArray[0], cachedVertArray[1]];
            b[1] = [cachedVertArray[0] + (s * points[i + 1][0] - s * points[i - 1][0]) / 6, cachedVertArray[1] + (s * points[i + 1][1] - s * points[i - 1][1]) / 6];
            b[2] = [points[i + 1][0] + (s * points[i][0] - s * points[i + 2][0]) / 6, points[i + 1][1] + (s * points[i][1] - s * points[i + 2][1]) / 6];
            b[3] = [points[i + 1][0], points[i + 1][1]];
            ops.push({ op: 'bcurveTo', data: [b[1][0], b[1][1], b[2][0], b[2][1], b[3][0], b[3][1]] });
          }
          if (closePoint && closePoint.length === 2) {
            const ro = o.maxRandomnessOffset;
            ops.push({ op: 'lineTo', data: [closePoint[0] + _offsetOpt(ro, o), closePoint[1] + _offsetOpt(ro, o)] });
          }
        } else if (len === 3) {
          ops.push({ op: 'move', data: [points[1][0], points[1][1]] });
          ops.push({
            op: 'bcurveTo',
            data: [
              points[1][0], points[1][1],
              points[2][0], points[2][1],
              points[2][0], points[2][1],
            ],
          });
        } else if (len === 2) {
          ops.push(..._line(points[0][0], points[0][1], points[1][0], points[1][1], o, true, true));
        }
        return ops;
      }


  export function ellipseWithParams(x: number, y: number, o: ResolvedOptions, ellipseParams: EllipseParams): EllipseResult {
    const [ap1, cp1] = _computeEllipsePoints(ellipseParams.increment, x, y, ellipseParams.rx, ellipseParams.ry, 1, ellipseParams.increment * _offset(0.1, _offset(0.4, 1, o), o), o);
    let o1 = _curve(ap1, null, o);
    if ((!o.disableMultiStroke) && (o.roughness !== 0)) {
      const [ap2] = _computeEllipsePoints(ellipseParams.increment, x, y, ellipseParams.rx, ellipseParams.ry, 1.5, 0, o);
      const o2 = _curve(ap2, null, o);
      o1 = o1.concat(o2);
    }
    return {
      estimatedPoints: cp1,
      opset: { type: 'path', ops: o1 },
    };
  }
  

//   export function patternFillPolygons(polygonList: Point[][], o: ResolvedOptions): OpSet {
//     return getFiller(o, helper).fillPolygons(polygonList, o);
//   }
  
function _o(options?: Options): ResolvedOptions {
    return options ? Object.assign({}, defaultOptions, options) : defaultOptions;
  }

function ellipse(x: number, y: number, width: number, height: number, options?: Options) : any {
    console.log('g ellipse', x, y ,width, height, options );
    const o = _o(options);
    const paths: OpSet[] = [];
    const ellipseParams = generateEllipseParams(width, height, o);
    console.log('g ellipse ellipseParams', ellipseParams);
    const ellipseResponse = ellipseWithParams(x, y, o, ellipseParams);
    console.log('g ellipse ellipseResponse', ellipseResponse);
    if (o.fill) {
      if (o.fillStyle === 'solid') {
        const shape = ellipseWithParams(x, y, o, ellipseParams).opset;
        shape.type = 'fillPath';
        paths.push(shape);
      } else {
        // const x = patternFillPolygons([ellipseResponse.estimatedPoints], o)
        // console.log('g ellipse x', x);
        // paths.push(x);
      }
    }
    // if (o.stroke !== NOS) {
    //   paths.push(ellipseResponse.opset);
    // }
    // return this._d('ellipse', paths, o);
    console.log(paths);
  }

  function  circle(x: number, y: number, diameter: number, options?: Options): any {
    const ret = ellipse(x, y, diameter, diameter, options);
    ret.shape = 'circle';
    return ret;
  }



 const defaultOptions: ResolvedOptions = {
    maxRandomnessOffset: 2,
    roughness: 1,
    bowing: 1,
    stroke: '#000',
    strokeWidth: 1,
    curveTightness: 0,
    curveFitting: 0.95,
    curveStepCount: 9,
    fillStyle: 'hachure',
    fillWeight: -1,
    hachureAngle: -41,
    hachureGap: -1,
    dashOffset: -1,
    dashGap: -1,
    zigzagOffset: -1,
    seed: 0,
    disableMultiStroke: false,
    disableMultiStrokeFill: false,
    preserveVertices: false,
    fillShapeRoughnessGain: 0.8,
  };