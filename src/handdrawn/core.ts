import { Random } from "./math";

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

export declare type OpType = "move" | "bcurveTo" | "lineTo";
export declare type OpSetType = "path" | "fillPath" | "fillSketch";

export interface Op {
  op: OpType;
  data: number[];
}

export interface OpSet {
  type: OpSetType;
  ops: Op[];
  size?: [number, number];
  path?: string;
  fillOps?: Op[];
}
