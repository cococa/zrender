import PathProxy from "../../core/PathProxy";

export function buildPath(
  ctx: CanvasRenderingContext2D | PathProxy,
  shape: {
    x: number;
    y: number;
    width: number;
    height: number;
    r?: number | number[];
    roughness?: number; // 手绘风格的粗糙度
  }
) {
  let x = shape.x;
  let y = shape.y;
  let width = shape.width;
  let height = shape.height;
  let r = shape.r;
  let roughness = shape.roughness || 1; // 默认粗糙度为1
  let r1;
  let r2;
  let r3;
  let r4;

  // Convert width and height to positive for better borderRadius
  if (width < 0) {
    x = x + width;
    width = -width;
  }
  if (height < 0) {
    y = y + height;
    height = -height;
  }

  if (typeof r === "number") {
    r1 = r2 = r3 = r4 = r;
  }
  else if (r instanceof Array) {
    if (r.length === 1) {
      r1 = r2 = r3 = r4 = r[0];
    }
    else if (r.length === 2) {
      r1 = r3 = r[0];
      r2 = r4 = r[1];
    }
    else if (r.length === 3) {
      r1 = r[0];
      r2 = r4 = r[1];
      r3 = r[2];
    }
    else {
      r1 = r[0];
      r2 = r[1];
      r3 = r[2];
      r4 = r[3];
    }
  }
  else {
    r1 = r2 = r3 = r4 = 0;
  }

  let total;
  if (r1 + r2 > width) {
    total = r1 + r2;
    r1 *= width / total;
    r2 *= width / total;
  }
  if (r3 + r4 > width) {
    total = r3 + r4;
    r3 *= width / total;
    r4 *= width / total;
  }
  if (r2 + r3 > height) {
    total = r2 + r3;
    r2 *= height / total;
    r3 *= height / total;
  }
  if (r1 + r4 > height) {
    total = r1 + r4;
    r1 *= height / total;
    r4 *= height / total;
  }

  // 内嵌的手绘风格的偏移量计算方法
  function getRandomOffset(radius: number): number {
    return Math.random() * radius * 2 - radius;
  }

  // 手绘风格的线条绘制方法
  function drawHandDrawnLine(
    context: CanvasRenderingContext2D | PathProxy,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    roughness: number = 1
  ) {
    const steps = Math.floor(Math.hypot(x2 - x1, y2 - y1) / 10);
    context.moveTo(
      x1 + getRandomOffset(roughness),
      y1 + getRandomOffset(roughness)
    );

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + t * (x2 - x1);
      const y = y1 + t * (y2 - y1);
      context.lineTo(
        x + getRandomOffset(roughness),
        y + getRandomOffset(roughness)
      );
    }

    context.lineTo(
      x2 + getRandomOffset(roughness),
      y2 + getRandomOffset(roughness)
    );
    // context.stroke();
  }

  // 使用手绘风格的线条绘制矩形
  ctx.beginPath();
  drawHandDrawnLine(ctx, x + r1, y, x + width - r2, y, roughness);
  r2 !== 0 && ctx.arc(x + width - r2, y + r2, r2, -Math.PI / 2, 0);
  drawHandDrawnLine(
    ctx,
    x + width,
    y + r2,
    x + width,
    y + height - r3,
    roughness
  );
  r3 !== 0 && ctx.arc(x + width - r3, y + height - r3, r3, 0, Math.PI / 2);
  drawHandDrawnLine(
    ctx,
    x + width - r3,
    y + height,
    x + r4,
    y + height,
    roughness
  );
  r4 !== 0 && ctx.arc(x + r4, y + height - r4, r4, Math.PI / 2, Math.PI);
  drawHandDrawnLine(ctx, x, y + height - r1, x, y + r1, roughness);
  r1 !== 0 && ctx.arc(x + r1, y + r1, r1, Math.PI, Math.PI * 1.5);
//   ctx.stroke();
}
