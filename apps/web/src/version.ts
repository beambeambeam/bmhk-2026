/**
 * The version stamp shown in the footer, e.g. `v0.0.1-dev.20260805`.
 *
 * Two halves, maintained two different ways:
 *
 * - `APP_VERSION` / `VERSION_CHANNEL` are hand-maintained. BUMP `APP_VERSION` MANUALLY on
 *   release — nothing generates it, and nothing should: it is the semver we mean to publish.
 * - `__BUILD_DATE__` is injected by vite.config.ts from the HEAD commit's committer date
 *   (YYYYMMDD). A merge puts the merge commit at HEAD, so the date half is the merge date and
 *   is never hand-typed. See the `define` block in vite.config.ts.
 */

declare const __BUILD_DATE__: string;

/** Bump manually on release. */
export const APP_VERSION = "0.0.1";

/** Release channel: `dev`, `rc`, `stable`, … Bump manually alongside APP_VERSION. */
export const VERSION_CHANNEL = "dev";

/** The date half, `YYYYMMDD`, injected at build time. */
export const BUILD_DATE = __BUILD_DATE__;

/** What the footer renders. */
export const VERSION_LABEL = `v${APP_VERSION}-${VERSION_CHANNEL}.${BUILD_DATE}`;
