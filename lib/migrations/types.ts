export interface Migration {
	/** The version this migration upgrades FROM (e.g. "1.0.0") */
	from: string;
	/** The version this migration upgrades TO (e.g. "2.0.0") */
	to: string;
	/** Migrate a project.json object */
	migrateProject?: (data: Record<string, unknown>) => Record<string, unknown>;
	/** Migrate a floor .json object */
	migrateFloor?: (data: Record<string, unknown>) => Record<string, unknown>;
}
