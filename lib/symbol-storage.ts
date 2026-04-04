import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FloorSymbol } from "@/types/symbol";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "homes");
const SYMBOLS_DIR = join(DATA_DIR, "_symbols");

async function ensureDir() {
	await mkdir(SYMBOLS_DIR, { recursive: true });
}

function symbolPath(id: string): string {
	return join(SYMBOLS_DIR, `${id}.json`);
}

export async function listFloorSymbols(): Promise<FloorSymbol[]> {
	await ensureDir();
	try {
		const entries = await readdir(SYMBOLS_DIR);
		const symbols: FloorSymbol[] = [];
		for (const entry of entries) {
			if (!entry.endsWith(".json")) continue;
			const data = await readFile(join(SYMBOLS_DIR, entry), "utf-8");
			symbols.push(JSON.parse(data));
		}
		symbols.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		return symbols;
	} catch {
		return [];
	}
}

export async function getFloorSymbol(id: string): Promise<FloorSymbol> {
	const data = await readFile(symbolPath(id), "utf-8");
	return JSON.parse(data);
}

export async function createFloorSymbol(
	symbol: FloorSymbol,
): Promise<FloorSymbol> {
	await ensureDir();
	await writeFile(symbolPath(symbol.id), JSON.stringify(symbol, null, 2));
	return symbol;
}

export async function deleteFloorSymbol(id: string): Promise<void> {
	await rm(symbolPath(id), { force: true });
}
