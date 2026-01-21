import { Point, Line } from '../geometry';
import { ResolvedOptions } from '../core';

function rotatePoint(x: number, y: number, center: Point, angle: number): Point {
  const dx = x - center[0];
  const dy = y - center[1];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    center[0] + dx * cos - dy * sin,
    center[1] + dx * sin + dy * cos
  ];
}

function rotatePoints(points: Point[], center: Point, angle: number): Point[] {
  return points.map(p => rotatePoint(p[0], p[1], center, angle));
}

function rotateLines(lines: Line[], center: Point, angle: number): Line[] {
    return lines.map(l => [
        rotatePoint(l[0][0], l[0][1], center, angle),
        rotatePoint(l[1][0], l[1][1], center, angle)
    ]);
}

export function hachureLines(polygons: Point[][], gap: number, angle: number): Line[] {
    const angleRad = (angle * Math.PI) / 180;
    const center: Point = [0, 0];
    const allRotatedPoints: Point[][] = polygons.map(p => rotatePoints(p, center, -angleRad));

    let minY = Infinity;
    let maxY = -Infinity;

    for (const poly of allRotatedPoints) {
        for (const p of poly) {
            if (p[1] < minY) {
                minY = p[1];
            }
            if (p[1] > maxY) {
                maxY = p[1];
            }
        }
    }

    if (!isFinite(minY) || !isFinite(maxY)) {
        return [];
    }

    const startY = Math.ceil(minY / gap) * gap;
    const lines: Line[] = [];

    for (let y = startY; y <= maxY; y += gap) {
        const intersections: number[] = [];
        for (const poly of allRotatedPoints) {
            for (let i = 0; i < poly.length; i++) {
                const p1 = poly[i];
                const p2 = poly[(i + 1) % poly.length];
                if ((p1[1] <= y && p2[1] > y) || (p2[1] <= y && p1[1] > y)) {
                    const x = p1[0] + (y - p1[1]) * (p2[0] - p1[0]) / (p2[1] - p1[1]);
                    intersections.push(x);
                }
            }
        }
        intersections.sort((a, b) => a - b);
        for (let i = 0; i < intersections.length; i += 2) {
            if (i + 1 < intersections.length) {
                lines.push([[intersections[i], y], [intersections[i + 1], y]]);
            }
        }
    }
    return rotateLines(lines, center, angleRad);
}

export function polygonHachureLines(polygonList: Point[][], o: ResolvedOptions): Line[] {
  const angle = o.hachureAngle + 90;
  let gap = o.hachureGap;
  if (gap < 0) {
    gap = o.strokeWidth * 4;
  }
  gap = Math.round(Math.max(gap, 0.1));

  return hachureLines(polygonList, gap, angle);
}
