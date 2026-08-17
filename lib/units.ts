const METERS_PER_UNIT: Record<string, number> = {
	cm: 0.01,
	mm: 0.001,
	m: 1,
	in: 0.0254,
	ft: 0.3048,
};

/** Convert a raw canvas-unit value to meters for editing/display. */
export function toMeters(value: number, units: string): number {
	return value * (METERS_PER_UNIT[units] ?? 1);
}

/** Convert a meters value back to the floor's raw canvas unit. */
export function fromMeters(value: number, units: string): number {
	return value / (METERS_PER_UNIT[units] ?? 1);
}

/**
 * Format an area value (in unit²) for display.
 * Canvas coordinates are in the floor's base unit (cm, mm, m, in, ft).
 */
export function formatArea(value: number, units: string): string {
	switch (units) {
		case "cm":
			return `${(value / 10000).toFixed(2)} m\u00B2`;
		case "mm":
			return `${(value / 1000000).toFixed(2)} m\u00B2`;
		case "m":
			return `${value.toFixed(2)} m\u00B2`;
		case "in":
			return `${(value / 144).toFixed(2)} ft\u00B2`;
		case "ft":
			return `${value.toFixed(2)} ft\u00B2`;
		default:
			return `${value.toFixed(2)} ${units}\u00B2`;
	}
}

/**
 * Format a length value for display, converting to larger units when appropriate.
 */
export function formatLength(value: number, units: string): string {
	switch (units) {
		case "cm":
			return value >= 100
				? `${(value / 100).toFixed(2)} m`
				: `${value.toFixed(1)} cm`;
		case "mm":
			return value >= 1000
				? `${(value / 1000).toFixed(2)} m`
				: `${value.toFixed(0)} mm`;
		case "m":
			return `${value.toFixed(2)} m`;
		case "in":
			return value >= 12
				? `${(value / 12).toFixed(2)} ft`
				: `${value.toFixed(1)} in`;
		case "ft":
			return `${value.toFixed(2)} ft`;
		default:
			return `${value.toFixed(2)} ${units}`;
	}
}
