import { describe, expect, it } from "vitest";
import { polygonArea, polygonPerimeter } from "./geometry";

describe("polygonArea", () => {
	it("returns 0 for less than 3 points", () => {
		expect(polygonArea([])).toBe(0);
		expect(polygonArea([[0, 0]])).toBe(0);
		expect(
			polygonArea([
				[0, 0],
				[1, 1],
			]),
		).toBe(0);
	});

	it("calculates area of a unit square", () => {
		const square: [number, number][] = [
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1],
		];
		expect(polygonArea(square)).toBe(1);
	});

	it("calculates area of a 10x20 rectangle", () => {
		const rect: [number, number][] = [
			[0, 0],
			[10, 0],
			[10, 20],
			[0, 20],
		];
		expect(polygonArea(rect)).toBe(200);
	});

	it("calculates area of a right triangle", () => {
		const triangle: [number, number][] = [
			[0, 0],
			[6, 0],
			[0, 4],
		];
		expect(polygonArea(triangle)).toBe(12);
	});

	it("handles clockwise and counter-clockwise the same", () => {
		const cw: [number, number][] = [
			[0, 0],
			[0, 10],
			[10, 10],
			[10, 0],
		];
		const ccw: [number, number][] = [
			[0, 0],
			[10, 0],
			[10, 10],
			[0, 10],
		];
		expect(polygonArea(cw)).toBe(polygonArea(ccw));
	});
});

describe("polygonPerimeter", () => {
	it("returns 0 for less than 2 points", () => {
		expect(polygonPerimeter([])).toBe(0);
		expect(polygonPerimeter([[0, 0]])).toBe(0);
	});

	it("calculates perimeter of a unit square", () => {
		const square: [number, number][] = [
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1],
		];
		expect(polygonPerimeter(square)).toBe(4);
	});

	it("calculates perimeter of a 3-4-5 right triangle", () => {
		const triangle: [number, number][] = [
			[0, 0],
			[3, 0],
			[0, 4],
		];
		expect(polygonPerimeter(triangle)).toBe(12);
	});
});
