export type Point = { x: number; y: number };

function invert3(m: number[]): number[] {
  // m is length 9 (row-major)
  const [a,b,c,d,e,f,g,h,i] = m;
  const A = e*i - f*h;
  const B = -(d*i - f*g);
  const C = d*h - e*g;
  const D = -(b*i - c*h);
  const E = a*i - c*g;
  const F = -(a*h - b*g);
  const G = b*f - c*e;
  const H = -(a*f - c*d);
  const I = a*e - b*d;
  const det = a*A + b*B + c*C;
  if (Math.abs(det) < 1e-12) return [1,0,0,0,1,0,0,0,1];
  const invDet = 1/det;
  return [A*invDet,D*invDet,G*invDet,B*invDet,E*invDet,H*invDet,C*invDet,F*invDet,I*invDet];
}

function multiply3(a: number[], b: number[]): number[] {
  const out = new Array(9).fill(0);
  for (let r=0;r<3;r++) {
    for (let c=0;c<3;c++) {
      out[r*3+c] = a[r*3+0]*b[0*3+c] + a[r*3+1]*b[1*3+c] + a[r*3+2]*b[2*3+c];
    }
  }
  return out;
}

function triToMatrix(p0: Point, p1: Point, p2: Point): number[] {
  // Build matrix mapping from triangle basis to world coords
  // [x y 1]^T = M * [u v 1]^T where u,v are barycentric-like affine coords
  return [
    p0.x, p1.x, p2.x,
    p0.y, p1.y, p2.y,
    1,    1,    1,
  ];
}

export function affineFromTriangles(src: [Point,Point,Point], dst: [Point,Point,Point]) {
  // Compute 3x3 matrix T such that dst = T * src (in homogeneous coords)
  const Ms = triToMatrix(src[0], src[1], src[2]);
  const Md = triToMatrix(dst[0], dst[1], dst[2]);
  const T = multiply3(Md, invert3(Ms));
  // Canvas 2D setTransform expects: [a c e; b d f; 0 0 1]
  const a = T[0], c = T[1], e = T[2];
  const b = T[3], d = T[4], f = T[5];
  return { a, b, c, d, e, f };
}

export function warpImageToCanvas(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  rows: number,
  cols: number,
  points: Point[] // normalized [0..1]
) {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0,0,canvas.width, canvas.height);

  const idx = (r: number, c: number) => r*cols + c;
  const getSrc = (r: number, c: number): Point => ({ x: (c/(cols-1))*w, y: (r/(rows-1))*h });
  const getDst = (r: number, c: number): Point => {
    const p = points[idx(r,c)];
    return { x: p.x * w, y: p.y * h };
  };

  for (let r=0;r<rows-1;r++) {
    for (let c=0;c<cols-1;c++) {
      // Two triangles per cell: (r,c)-(r,c+1)-(r+1,c) and (r+1,c)-(r,c+1)-(r+1,c+1)
      const srcA: [Point,Point,Point] = [getSrc(r,c), getSrc(r,c+1), getSrc(r+1,c)];
      const dstA: [Point,Point,Point] = [getDst(r,c), getDst(r,c+1), getDst(r+1,c)];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(dstA[0].x, dstA[0].y);
      ctx.lineTo(dstA[1].x, dstA[1].y);
      ctx.lineTo(dstA[2].x, dstA[2].y);
      ctx.closePath();
      ctx.clip();
      const TA = affineFromTriangles(srcA, dstA);
      ctx.setTransform(TA.a, TA.b, TA.c, TA.d, TA.e, TA.f);
      ctx.drawImage(image, 0, 0);
      ctx.restore();

      const srcB: [Point,Point,Point] = [getSrc(r+1,c), getSrc(r,c+1), getSrc(r+1,c+1)];
      const dstB: [Point,Point,Point] = [getDst(r+1,c), getDst(r,c+1), getDst(r+1,c+1)];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(dstB[0].x, dstB[0].y);
      ctx.lineTo(dstB[1].x, dstB[1].y);
      ctx.lineTo(dstB[2].x, dstB[2].y);
      ctx.closePath();
      ctx.clip();
      const TB = affineFromTriangles(srcB, dstB);
      ctx.setTransform(TB.a, TB.b, TB.c, TB.d, TB.e, TB.f);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
    }
  }
  // reset transform just in case
  ctx.setTransform(1,0,0,1,0,0);
}
