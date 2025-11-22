export interface MeshPoint { x: number; y: number; }

export function generateUniformMesh(width: number, height: number, cols: number, rows: number): MeshPoint[] {
  const pts: MeshPoint[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      pts.push({ x: (i / cols) * width, y: (j / rows) * height });
    }
  }
  return pts;
}

// Forward warp: sample source quad -> write to destination warped quad using bilinear interpolation of destination corners.
// This is approximate and may leave tiny holes; acceptable for prototype.
export function warpDataUrlWithMesh(dataUrl: string, width: number, height: number, mesh: MeshPoint[], cols: number, rows: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = width; srcCanvas.height = height;
        const sctx = srcCanvas.getContext('2d');
        if (!sctx) { reject(new Error('2d ctx unavailable')); return; }
        sctx.drawImage(img, 0, 0, width, height);
        const srcData = sctx.getImageData(0,0,width,height);

        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = width; dstCanvas.height = height;
        const dctx = dstCanvas.getContext('2d');
        if (!dctx) { reject(new Error('2d ctx unavailable')); return; }
        const dstData = dctx.createImageData(width, height);

        const uniform = generateUniformMesh(width, height, cols, rows); // original grid

        // Helper to get point index
        const idx = (i: number, j: number) => j * (cols + 1) + i;

        for (let cj = 0; cj < rows; cj++) {
          for (let ci = 0; ci < cols; ci++) {
            const p00s = uniform[idx(ci,cj)];
            const p10s = uniform[idx(ci+1,cj)];
            const p01s = uniform[idx(ci,cj+1)];
            const p11s = uniform[idx(ci+1,cj+1)];
            const p00d = mesh[idx(ci,cj)];
            const p10d = mesh[idx(ci+1,cj)];
            const p01d = mesh[idx(ci,cj+1)];
            const p11d = mesh[idx(ci+1,cj+1)];

            const x0 = Math.round(p00s.x); const x1 = Math.round(p10s.x);
            const y0 = Math.round(p00s.y); const y1 = Math.round(p01s.y);

            for (let sy = y0; sy <= y1; sy++) {
              for (let sx = x0; sx <= x1; sx++) {
                const u = (sx - x0) / (x1 - x0 || 1);
                const v = (sy - y0) / (y1 - y0 || 1);
                const dx = (1-u)*(1-v)*p00d.x + u*(1-v)*p10d.x + (1-u)*v*p01d.x + u*v*p11d.x;
                const dy = (1-u)*(1-v)*p00d.y + u*(1-v)*p10d.y + (1-u)*v*p01d.y + u*v*p11d.y;
                const di = (Math.round(dy) * width + Math.round(dx)) * 4;
                const si = (sy * width + sx) * 4;
                if (di < 0 || di >= dstData.data.length) continue;
                dstData.data[di] = srcData.data[si];
                dstData.data[di+1] = srcData.data[si+1];
                dstData.data[di+2] = srcData.data[si+2];
                dstData.data[di+3] = srcData.data[si+3];
              }
            }
          }
        }

        dctx.putImageData(dstData,0,0);
        resolve(dstCanvas.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

// Improved inverse-mapping warp: iterate destination pixels, locate containing deformed quad, compute (u,v) and sample source via bilinear interpolation.
export function warpDataUrlWithMeshInverse(dataUrl: string, width: number, height: number, mesh: MeshPoint[], cols: number, rows: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = width; srcCanvas.height = height;
        const sctx = srcCanvas.getContext('2d');
        if (!sctx) { reject(new Error('2d ctx unavailable')); return; }
        sctx.drawImage(img, 0, 0, width, height);
        const srcData = sctx.getImageData(0,0,width,height);

        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = width; dstCanvas.height = height;
        const dctx = dstCanvas.getContext('2d');
        if (!dctx) { reject(new Error('2d ctx unavailable')); return; }
        const dstData = dctx.createImageData(width, height);

        const uniform = generateUniformMesh(width, height, cols, rows);
        const idx = (i:number,j:number) => j*(cols+1)+i;

        // Precompute cell quads
        interface Quad { s:[MeshPoint,MeshPoint,MeshPoint,MeshPoint]; d:[MeshPoint,MeshPoint,MeshPoint,MeshPoint]; bbox:{x0:number;y0:number;x1:number;y1:number}; }
        const quads: Quad[] = [];
        for (let cj=0;cj<rows;cj++) {
          for (let ci=0;ci<cols;ci++) {
            const s00 = uniform[idx(ci,cj)], s10 = uniform[idx(ci+1,cj)], s01 = uniform[idx(ci,cj+1)], s11 = uniform[idx(ci+1,cj+1)];
            const d00 = mesh[idx(ci,cj)], d10 = mesh[idx(ci+1,cj)], d01 = mesh[idx(ci,cj+1)], d11 = mesh[idx(ci+1,cj+1)];
            const xs = [d00.x,d10.x,d01.x,d11.x];
            const ys = [d00.y,d10.y,d01.y,d11.y];
            const x0 = Math.max(0, Math.floor(Math.min(...xs))); const x1 = Math.min(width-1, Math.ceil(Math.max(...xs)));
            const y0 = Math.max(0, Math.floor(Math.min(...ys))); const y1 = Math.min(height-1, Math.ceil(Math.max(...ys)));
            quads.push({ s:[s00,s10,s01,s11], d:[d00,d10,d01,d11], bbox:{x0,y0,x1,y1} });
          }
        }

        // Utility: bilinear interpolate inside source quad given (u,v)
        const bilinear = (quad:MeshPoint[], u:number, v:number): MeshPoint => {
          const [q00,q10,q01,q11] = quad;
          return {
            x: (1-u)*(1-v)*q00.x + u*(1-v)*q10.x + (1-u)*v*q01.x + u*v*q11.x,
            y: (1-u)*(1-v)*q00.y + u*(1-v)*q10.y + (1-u)*v*q01.y + u*v*q11.y,
          };
        };

        // Point in quad via dividing into two triangles and barycentric solving
        function insideAndUV(dQuad:MeshPoint[], x:number, y:number): {u:number;v:number}|null {
          const [p00,p10,p01,p11] = dQuad;
          // Split into triangles (p00,p10,p11) and (p00,p11,p01)
          const triA = [p00,p10,p11];
          const triB = [p00,p11,p01];
          const resA = barycentricUV(triA,x,y);
          if (resA) {
            // Map barycentric (a,b,c) to (u,v) for quad approximation
            const {a,b,c} = resA; // a corresponds p00, b->p10, c->p11
            // For triangle A, approximate u along p00->p10/p11 blend, v along p00->p11
            const v = c + (b*0); // simplistic: use weight of p11 for v
            const u = b + (c*0); // weight of p10 for u
            return {u, v};
          }
          const resB = barycentricUV(triB,x,y);
            if (resB) {
              const {a,b,c} = resB; // a->p00, b->p11, c->p01
              const v = b; // weight toward p11
              const u = c; // weight toward p01 horizontal
              return {u, v};
            }
          return null;
        }

        function barycentricUV(tri:MeshPoint[], x:number, y:number): {a:number;b:number;c:number}|null {
          const [p0,p1,p2] = tri;
          const v0x = p1.x - p0.x, v0y = p1.y - p0.y;
          const v1x = p2.x - p0.x, v1y = p2.y - p0.y;
          const v2x = x - p0.x, v2y = y - p0.y;
          const denom = v0x * v1y - v1x * v0y;
          if (Math.abs(denom) < 1e-5) return null;
          const a = (v2x * v1y - v1x * v2y) / denom;
          const b = (v0x * v2y - v2x * v0y) / denom;
          const c = 1 - a - b;
          if (a >= -1e-4 && b >= -1e-4 && c >= -1e-4) {
            return {a,b,c};
          }
          return null;
        }

        // Bilinear sample with subpixel interpolation
        const sample = (imgData:ImageData, sx:number, sy:number) => {
          if (sx < 0) sx = 0; if (sy < 0) sy = 0; if (sx > width-1) sx = width-1; if (sy > height-1) sy = height-1;
          const x0 = Math.floor(sx), x1 = Math.min(width-1, x0+1);
          const y0 = Math.floor(sy), y1 = Math.min(height-1, y0+1);
          const fx = sx - x0; const fy = sy - y0;
          const i00 = (y0*width + x0)*4;
          const i10 = (y0*width + x1)*4;
          const i01 = (y1*width + x0)*4;
          const i11 = (y1*width + x1)*4;
          const out = [0,0,0,0];
          for (let k=0;k<4;k++) {
            const v00 = imgData.data[i00+k];
            const v10 = imgData.data[i10+k];
            const v01 = imgData.data[i01+k];
            const v11 = imgData.data[i11+k];
            const v0 = v00*(1-fx)+v10*fx;
            const v1 = v01*(1-fx)+v11*fx;
            out[k] = v0*(1-fy)+v1*fy;
          }
          return out as [number,number,number,number];
        };

        // For each quad, iterate bounding box; compute uv; fill dest
        for (const quad of quads) {
          const {x0,y0,x1,y1} = quad.bbox;
          for (let y=y0; y<=y1; y++) {
            for (let x=x0; x<=x1; x++) {
              const uv = insideAndUV(quad.d, x, y);
              if (!uv) continue;
              let {u,v} = uv;
              // clamp
              if (u<0) u=0; if (u>1) u=1; if (v<0) v=0; if (v>1) v=1;
              const srcPt = bilinear(quad.s, u, v);
              const color = sample(srcData, srcPt.x, srcPt.y);
              const di = (y*width + x)*4;
              dstData.data[di] = color[0];
              dstData.data[di+1] = color[1];
              dstData.data[di+2] = color[2];
              dstData.data[di+3] = color[3];
            }
          }
        }

        dctx.putImageData(dstData,0,0);
        resolve(dstCanvas.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

// Triangle-based inverse warp (affine per triangle) - more robust and avoids UV heuristics.
export async function warpDataUrlWithMeshTrianglesInverse(dataUrl: string, width: number, height: number, mesh: MeshPoint[], cols: number, rows: number, options?: { oversample?: number }): Promise<string> {
  const oversample = Math.max(1, options?.oversample || 1);
  const img = await loadImage(dataUrl);
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width; srcCanvas.height = height;
  const sctx = srcCanvas.getContext('2d');
  if (!sctx) throw new Error('2d ctx unavailable');
  sctx.drawImage(img, 0, 0, width, height);
  const srcData = sctx.getImageData(0,0,width,height);
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = width; dstCanvas.height = height;
  const dctx = dstCanvas.getContext('2d');
  if (!dctx) throw new Error('2d ctx unavailable');
  const dstData = dctx.createImageData(width, height);

  const uniform = generateUniformMesh(width, height, cols, rows);
  const idx = (i:number,j:number) => j*(cols+1)+i;

  interface Tri { s: [MeshPoint,MeshPoint,MeshPoint]; d: [MeshPoint,MeshPoint,MeshPoint]; bbox: {x0:number;y0:number;x1:number;y1:number}; }
  const tris: Tri[] = [];
  for (let j=0;j<rows;j++) {
    for (let i=0;i<cols;i++) {
      const s00 = uniform[idx(i,j)], s10 = uniform[idx(i+1,j)], s01 = uniform[idx(i,j+1)], s11 = uniform[idx(i+1,j+1)];
      const d00 = mesh[idx(i,j)], d10 = mesh[idx(i+1,j)], d01 = mesh[idx(i,j+1)], d11 = mesh[idx(i+1,j+1)];
      // two triangles: (00,10,11) and (00,11,01)
      pushTri([s00,s10,s11],[d00,d10,d11]);
      pushTri([s00,s11,s01],[d00,d11,d01]);
      function pushTri(s:[MeshPoint,MeshPoint,MeshPoint], d:[MeshPoint,MeshPoint,MeshPoint]) {
        const xs = d.map(p=>p.x); const ys = d.map(p=>p.y);
        tris.push({ s, d, bbox:{ x0:clampFloor(Math.min(...xs),0,width-1), y0:clampFloor(Math.min(...ys),0,height-1), x1:clampCeil(Math.max(...xs),0,width-1), y1:clampCeil(Math.max(...ys),0,height-1) } });
      }
    }
  }

  for (const tri of tris) {
    const { d, s, bbox } = tri;
    for (let y=bbox.y0; y<=bbox.y1; y++) {
      for (let x=bbox.x0; x<=bbox.x1; x++) {
        const bc = barycentric(d, x+0.5, y+0.5);
        if (!bc) continue;
        const { a, b, c } = bc; // weights for d[0], d[1], d[2]
        // Use same weights to interpolate source triangle
        const sx = s[0].x * a + s[1].x * b + s[2].x * c;
        const sy = s[0].y * a + s[1].y * b + s[2].y * c;
        const color = sampleBilinear(srcData, sx, sy, width, height);
        const di = (y*width + x)*4;
        dstData.data[di] = color[0];
        dstData.data[di+1] = color[1];
        dstData.data[di+2] = color[2];
        dstData.data[di+3] = color[3];
      }
    }
  }

  dctx.putImageData(dstData,0,0);
  return dstCanvas.toDataURL('image/png');

  function barycentric(tri:[MeshPoint,MeshPoint,MeshPoint], px:number, py:number): {a:number;b:number;c:number}|null {
    const [p0,p1,p2] = tri;
    const v0x = p1.x - p0.x, v0y = p1.y - p0.y;
    const v1x = p2.x - p0.x, v1y = p2.y - p0.y;
    const v2x = px - p0.x, v2y = py - p0.y;
    const denom = v0x * v1y - v1x * v0y;
    if (Math.abs(denom) < 1e-8) return null;
    const a = (v2x * v1y - v1x * v2y) / denom;
    const b = (v0x * v2y - v2x * v0y) / denom;
    const c = 1 - a - b;
    if (a >= -1e-4 && b >= -1e-4 && c >= -1e-4) return {a,b,c};
    return null;
  }
  function sampleBilinear(img:ImageData, sx:number, sy:number, w:number, h:number): [number,number,number,number] {
    if (sx < 0) sx = 0; if (sy < 0) sy = 0; if (sx > w-1) sx = w-1; if (sy > h-1) sy = h-1;
    const x0 = Math.floor(sx), x1 = Math.min(w-1, x0+1);
    const y0 = Math.floor(sy), y1 = Math.min(h-1, y0+1);
    const fx = sx - x0, fy = sy - y0;
    const i00 = (y0*w + x0)*4;
    const i10 = (y0*w + x1)*4;
    const i01 = (y1*w + x0)*4;
    const i11 = (y1*w + x1)*4;
    const out = [0,0,0,0];
    for (let k=0;k<4;k++) {
      const v00 = img.data[i00+k];
      const v10 = img.data[i10+k];
      const v01 = img.data[i01+k];
      const v11 = img.data[i11+k];
      const v0 = v00*(1-fx)+v10*fx;
      const v1 = v01*(1-fx)+v11*fx;
      out[k] = v0*(1-fy)+v1*fy;
    }
    return out as [number,number,number,number];
  }
  function clampFloor(v:number,min:number,max:number){ return Math.max(min, Math.floor(v)); }
  function clampCeil(v:number,min:number,max:number){ return Math.min(max, Math.ceil(v)); }
  function loadImage(src:string){ return new Promise<HTMLImageElement>((res,rej)=>{ const im = new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('img load fail')); im.src=src; }); }
}
