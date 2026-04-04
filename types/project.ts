export interface Project {
	id: string;
	name: string;
	address?: string;
	units: Units;
	defaultWallThickness: number;
	floorOrder: string[];
	createdAt: string;
	updatedAt: string;
	schemaVersion: string;
}

export type Units = "cm" | "mm" | "m" | "in" | "ft";

export interface ProjectSummary {
	id: string;
	name: string;
	address?: string;
	floorCount: number;
	updatedAt: string;
}
