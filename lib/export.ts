import { getEntitiesBBox } from "@/lib/geometry";
import type { Entity } from "@/types/entities";
import type { LayerVisibility } from "@/types/floor";

const PADDING = 40;

function renderEntityToSvg(entity: Entity): string {
	switch (entity.type) {
		case "wall":
			return `<line x1="${entity.x1}" y1="${entity.y1}" x2="${entity.x2}" y2="${entity.y2}" stroke="#333" stroke-width="${entity.thickness}" stroke-linecap="round"/>`;
		case "room":
			return `<polygon points="${entity.polygon.map(([x, y]) => `${x},${y}`).join(" ")}" fill="#f0f0f0" stroke="#666" stroke-width="1"><title>${escapeXml(entity.name)}</title></polygon>`;
		case "door": {
			const dw = entity.width;
			const lines = [
				`<g transform="rotate(${entity.rotation}, ${entity.x}, ${entity.y})">`,
				`  <rect x="${entity.x - dw / 2}" y="${entity.y - 5}" width="${dw}" height="10" fill="white" stroke="none"/>`,
				`  <line x1="${entity.x - dw / 2}" y1="${entity.y - 5}" x2="${entity.x - dw / 2}" y2="${entity.y + 5}" stroke="#333" stroke-width="1.5"/>`,
				`  <line x1="${entity.x + dw / 2}" y1="${entity.y - 5}" x2="${entity.x + dw / 2}" y2="${entity.y + 5}" stroke="#333" stroke-width="1.5"/>`,
			];
			if (entity.doorStyle === "sliding") {
				lines.push(
					`  <line x1="${entity.x - dw / 2}" y1="${entity.y}" x2="${entity.x + dw / 2}" y2="${entity.y}" stroke="#333" stroke-width="2" stroke-linecap="round"/>`,
					`  <line x1="${entity.x - dw / 2}" y1="${entity.y + 4}" x2="${entity.x + dw / 2}" y2="${entity.y + 4}" stroke="#999" stroke-width="1" stroke-dasharray="3 2"/>`,
				);
				if (entity.swing === "left") {
					lines.push(
						`  <polyline points="${entity.x - dw / 4 + 4},${entity.y - 3} ${entity.x - dw / 4},${entity.y} ${entity.x - dw / 4 + 4},${entity.y + 3}" fill="none" stroke="#333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
					);
				} else {
					lines.push(
						`  <polyline points="${entity.x + dw / 4 - 4},${entity.y - 3} ${entity.x + dw / 4},${entity.y} ${entity.x + dw / 4 - 4},${entity.y + 3}" fill="none" stroke="#333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
					);
				}
			} else {
				const sl = entity.swing === "left";
				const hx = sl ? entity.x - dw / 2 : entity.x + dw / 2;
				const hy = entity.y;
				const tx = sl ? entity.x + dw / 2 : entity.x - dw / 2;
				const ty = entity.y;
				const sf = sl ? 1 : 0;
				lines.push(
					`  <line x1="${hx}" y1="${hy}" x2="${hx}" y2="${hy + dw}" stroke="#333" stroke-width="2" stroke-linecap="round"/>`,
					`  <path d="M ${tx} ${ty} A ${dw} ${dw} 0 0 ${sf} ${hx} ${hy + dw}" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="4 3"/>`,
					`  <circle cx="${hx}" cy="${hy}" r="2.5" fill="#333"/>`,
				);
			}
			lines.push(`</g>`);
			return lines.join("\n");
		}
		case "window":
			return `<rect x="${entity.x - entity.width / 2}" y="${entity.y - 3}" width="${entity.width}" height="6" fill="#87ceeb" stroke="#333" stroke-width="1" transform="rotate(${entity.rotation}, ${entity.x}, ${entity.y})"/>`;
		case "light":
			return `<circle cx="${entity.x}" cy="${entity.y}" r="8" fill="#ffd700" stroke="#b8860b" stroke-width="1.5"/>`;
		case "outlet":
			return `<rect x="${entity.x - 6}" y="${entity.y - 6}" width="12" height="12" rx="2" fill="#90ee90" stroke="#228b22" stroke-width="1.5"/>`;
		case "furniture":
			return [
				`<rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}" fill="#deb887" stroke="#8b7355" stroke-width="1" rx="2" transform="rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})"/>`,
				`<text x="${entity.x + entity.width / 2}" y="${entity.y + entity.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#333">${escapeXml(entity.name)}</text>`,
			].join("\n");
		case "annotation":
			return [
				`<rect x="${entity.x - 2}" y="${entity.y - 12}" width="${entity.text.length * 6 + 8}" height="18" fill="#fff3cd" stroke="#ffc107" stroke-width="1" rx="3"/>`,
				`<text x="${entity.x + 2}" y="${entity.y}" font-size="11" fill="#333">${escapeXml(entity.text)}</text>`,
			].join("\n");
		case "sink":
			return [
				`<g transform="rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})">`,
				`  <rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}" fill="#b3d9ff" stroke="#4a90d9" stroke-width="1.5" rx="4"/>`,
				`  <ellipse cx="${entity.x + entity.width / 2}" cy="${entity.y + entity.height / 2}" rx="${entity.width * 0.3}" ry="${entity.height * 0.3}" fill="none" stroke="#4a90d9" stroke-width="1"/>`,
				`  <text x="${entity.x + entity.width / 2}" y="${entity.y + entity.height + 12}" text-anchor="middle" font-size="9" fill="#555">${escapeXml(entity.label || "Sink")}</text>`,
				`</g>`,
			].join("\n");
		case "toilet":
			return [
				`<g transform="rotate(${entity.rotation}, ${entity.x}, ${entity.y})">`,
				`  <rect x="${entity.x - 18}" y="${entity.y - 25}" width="36" height="15" fill="#e0e0e0" stroke="#999" stroke-width="1.5" rx="3"/>`,
				`  <ellipse cx="${entity.x}" cy="${entity.y}" rx="18" ry="22" fill="#f0f0f0" stroke="#999" stroke-width="1.5"/>`,
				`  <text x="${entity.x}" y="${entity.y + 35}" text-anchor="middle" font-size="9" fill="#555">${escapeXml(entity.label || "Toilet")}</text>`,
				`</g>`,
			].join("\n");
		case "shower":
			return [
				`<g transform="rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})">`,
				`  <rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}" fill="#d4eaff" stroke="#6ba3d6" stroke-width="1.5" rx="2" stroke-dasharray="4 2"/>`,
				`  <circle cx="${entity.x + entity.width / 2}" cy="${entity.y + entity.height / 2}" r="6" fill="none" stroke="#6ba3d6" stroke-width="1"/>`,
				`  <text x="${entity.x + entity.width / 2}" y="${entity.y + entity.height + 12}" text-anchor="middle" font-size="9" fill="#555">${escapeXml(entity.label || "Shower")}</text>`,
				`</g>`,
			].join("\n");
		case "bathtub":
			return [
				`<g transform="rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})">`,
				`  <rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}" fill="#cce5ff" stroke="#4a90d9" stroke-width="2" rx="${entity.height / 2}"/>`,
				`  <rect x="${entity.x + 5}" y="${entity.y + 5}" width="${entity.width - 10}" height="${entity.height - 10}" fill="none" stroke="#4a90d9" stroke-width="0.5" rx="${(entity.height - 10) / 2}"/>`,
				`  <text x="${entity.x + entity.width / 2}" y="${entity.y + entity.height + 12}" text-anchor="middle" font-size="9" fill="#555">${escapeXml(entity.label || "Bathtub")}</text>`,
				`</g>`,
			].join("\n");
		case "stairs": {
			const stepCount = Math.max(3, Math.round(entity.height / 25));
			const stepH = entity.height / stepCount;
			const lines = [
				`<g transform="rotate(${entity.rotation}, ${entity.x + entity.width / 2}, ${entity.y + entity.height / 2})">`,
				`  <rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}" fill="#f0ece4" stroke="#8b7355" stroke-width="1.5"/>`,
			];
			for (let i = 1; i < stepCount; i++) {
				lines.push(
					`  <line x1="${entity.x}" y1="${entity.y + stepH * i}" x2="${entity.x + entity.width}" y2="${entity.y + stepH * i}" stroke="#8b7355" stroke-width="0.8"/>`,
				);
			}
			lines.push(
				`  <text x="${entity.x + entity.width / 2}" y="${entity.y + entity.height + 12}" text-anchor="middle" font-size="9" fill="#555">${escapeXml(entity.label || (entity.direction === "up" ? "Up" : "Down"))}</text>`,
				`</g>`,
			);
			return lines.join("\n");
		}
	}
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	// Small delay before cleanup so the browser can start the download
	setTimeout(() => {
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 100);
}

export function buildSvgString(
	entities: Entity[],
	visibleLayers: LayerVisibility,
): { svg: string; width: number; height: number } {
	const visible = entities.filter(
		(e) => visibleLayers[e.layer as keyof LayerVisibility],
	);

	const bbox = getEntitiesBBox(visible);
	const minX = bbox ? bbox.minX - PADDING : 0;
	const minY = bbox ? bbox.minY - PADDING : 0;
	const width = bbox ? Math.ceil(bbox.maxX - bbox.minX + PADDING * 2) : 200;
	const height = bbox ? Math.ceil(bbox.maxY - bbox.minY + PADDING * 2) : 200;

	// Render rooms first (they are background fills), then other entities on top
	const rooms = visible.filter((e) => e.type === "room");
	const rest = visible.filter((e) => e.type !== "room");
	const ordered = [...rooms, ...rest];

	const svgContent = ordered.map((e) => renderEntityToSvg(e)).join("\n  ");

	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`,
		`  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="white"/>`,
		`  ${svgContent}`,
		`</svg>`,
	].join("\n");

	return { svg, width, height };
}

export function downloadSvg(
	entities: Entity[],
	visibleLayers: LayerVisibility,
	filename: string,
) {
	const { svg } = buildSvgString(entities, visibleLayers);
	const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
	triggerDownload(blob, filename);
}

export function printFloorPlan(
	entities: Entity[],
	visibleLayers: LayerVisibility,
	title: string,
) {
	const { svg } = buildSvgString(entities, visibleLayers);
	const html = `<!DOCTYPE html>
<html><head><title>${title}</title><style>
@media print { @page { margin: 1cm; } }
body { margin: 0; display: flex; flex-direction: column; align-items: center; }
h1 { font: 14pt sans-serif; margin: 8pt 0; }
svg { max-width: 100%; height: auto; }
</style></head><body>
<h1>${title}</h1>
${svg}
<script>window.onafterprint=()=>window.close();window.print();</script>
</body></html>`;
	const win = window.open("", "_blank");
	if (win) {
		win.document.write(html);
		win.document.close();
	}
}

export async function downloadPng(
	entities: Entity[],
	visibleLayers: LayerVisibility,
	filename: string,
	scale = 2,
): Promise<void> {
	const { svg, width, height } = buildSvgString(entities, visibleLayers);

	const canvas = document.createElement("canvas");
	canvas.width = width * scale;
	canvas.height = height * scale;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get canvas 2d context");

	// Use a data URI instead of blob URL to avoid cross-origin issues
	const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

	return new Promise<void>((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			canvas.toBlob((result) => {
				if (result) {
					triggerDownload(result, filename);
					resolve();
				} else {
					reject(new Error("Canvas toBlob returned null"));
				}
			}, "image/png");
		};
		img.onerror = () => {
			reject(new Error("Failed to render SVG to image"));
		};
		img.src = dataUri;
	});
}
