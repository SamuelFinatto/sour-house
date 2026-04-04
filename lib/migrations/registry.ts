import type { Migration } from "./types";

/**
 * Register all migrations here in order.
 *
 * Each migration upgrades from one major version to the next.
 * Add new migrations to the end of this array.
 *
 * Example:
 *
 * {
 *   from: "1.0.0",
 *   to: "2.0.0",
 *   migrateProject: (data) => {
 *     // add new required field
 *     return { ...data, theme: "default" };
 *   },
 *   migrateFloor: (data) => {
 *     // rename "notes" layer to "annotations"
 *     const layers = data.layers as Record<string, boolean>;
 *     if ("notes" in layers) {
 *       layers.annotations = layers.notes;
 *       delete layers.notes;
 *     }
 *     return { ...data, layers };
 *   },
 * }
 */
export const migrations: Migration[] = [];
