export interface EnhancementMetrics {
	tProcessMs: number;
	pixelCount: number;
	pixelsPerMs: number;
}

export interface EnhanceOptions {
	unsharpAmount?: number; // 0..1
	unsharpRadius?: number; // blur radius
	vignetteStrength?: number; // 0..0.5
}

// Basic local image enhancement (white balance + unsharp mask + optional vignette)
export async function enhanceDataUrlWithMetrics(dataUrl: string, opts: EnhanceOptions = {}): Promise<{ dataUrl: string; metrics: EnhancementMetrics; }> {
	const img = await loadImage(dataUrl);
	const w = img.naturalWidth; const h = img.naturalHeight;
	const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
	const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) throw new Error('Canvas ctx unavailable');
	ctx.drawImage(img,0,0);
	const start = performance.now();
	const imageData = ctx.getImageData(0,0,w,h);
	const { data } = imageData;
	// Grey-world white balance
	let rSum=0,gSum=0,bSum=0; for(let i=0;i<data.length;i+=4){ rSum+=data[i]; gSum+=data[i+1]; bSum+=data[i+2]; }
	const count = data.length/4; const rAvg=rSum/count, gAvg=gSum/count, bAvg=bSum/count; const avg=(rAvg+gAvg+bAvg)/3;
	const kR=avg/(rAvg||1), kG=avg/(gAvg||1), kB=avg/(bAvg||1);
	for(let i=0;i<data.length;i+=4){ data[i]=clamp(data[i]*kR); data[i+1]=clamp(data[i+1]*kG); data[i+2]=clamp(data[i+2]*kB); }
	// Unsharp mask (simple box blur)
	const radius = Math.max(1, opts.unsharpRadius ?? 2);
	const amount = opts.unsharpAmount ?? 0.6;
	const blurred = boxBlur(data, w, h, radius);
	for(let i=0;i<data.length;i+=4){
		data[i] = clamp(data[i] + amount*(data[i]-blurred[i]));
		data[i+1] = clamp(data[i+1] + amount*(data[i+1]-blurred[i+1]));
		data[i+2] = clamp(data[i+2] + amount*(data[i+2]-blurred[i+2]));
	}
	// Vignette
	const vig = Math.min(0.5, Math.max(0, opts.vignetteStrength ?? 0.05));
	if (vig > 0) {
		const cx=w/2, cy=h/2; const maxD=Math.sqrt(cx*cx+cy*cy);
		for(let y=0;y<h;y++){
			for(let x=0;x<w;x++){
				const dx=x-cx, dy=y-cy; const d=Math.sqrt(dx*dx+dy*dy)/maxD; const v=(1 - d*vig);
				const idx=(y*w+x)*4; data[idx]=clamp(data[idx]*v); data[idx+1]=clamp(data[idx+1]*v); data[idx+2]=clamp(data[idx+2]*v);
			}
		}
	}
	ctx.putImageData(imageData,0,0);
	const end = performance.now();
	const tProcessMs = +(end-start).toFixed(2);
	const pixelCount = w*h;
	const metrics: EnhancementMetrics = { tProcessMs, pixelCount, pixelsPerMs: +(pixelCount/tProcessMs).toFixed(2) };
	return { dataUrl: canvas.toDataURL('image/png'), metrics };
}

function clamp(v: number){ return v<0?0:v>255?255:v; }

function loadImage(src: string): Promise<HTMLImageElement>{
	return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=src; });
}

function boxBlur(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
	const out = new Uint8ClampedArray(src.length);
	const tmp = new Uint8ClampedArray(src.length);
	// Horizontal pass
	for(let y=0;y<h;y++){
		for(let x=0;x<w;x++){
			let rSum=0,gSum=0,bSum=0,aSum=0,count=0;
			for(let k=-r;k<=r;k++){
				const nx=x+k; if(nx<0||nx>=w) continue; const idx=(y*w+nx)*4; rSum+=src[idx]; gSum+=src[idx+1]; bSum+=src[idx+2]; aSum+=src[idx+3]; count++;
			}
			const o=(y*w+x)*4; tmp[o]=rSum/count; tmp[o+1]=gSum/count; tmp[o+2]=bSum/count; tmp[o+3]=aSum/count;    }
	}
	// Vertical pass
	for(let y=0;y<h;y++){
		for(let x=0;x<w;x++){
			let rSum=0,gSum=0,bSum=0,aSum=0,count=0;
			for(let k=-r;k<=r;k++){
				const ny=y+k; if(ny<0||ny>=h) continue; const idx=(ny*w+x)*4; rSum+=tmp[idx]; gSum+=tmp[idx+1]; bSum+=tmp[idx+2]; aSum+=tmp[idx+3]; count++;
			}
			const o=(y*w+x)*4; out[o]=rSum/count; out[o+1]=gSum/count; out[o+2]=bSum/count; out[o+3]=aSum/count;    }
	}
	return out;
}
