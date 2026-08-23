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

import { env } from "@bmhk-2026/env/web";

declare const __BUILD_DATE__: string;

/** Release channel: `dev`, `rc`, `stable`, … Bump manually alongside APP_VERSION. */
export const VERSION_CHANNEL = env.VITE_BMHK_ENV;

/** The date half, `YYYYMMDD`, injected at build time. */
export const BUILD_DATE = __BUILD_DATE__;

export const COMMIT_SHA = env.VITE_COMMIT_SHA;

/** What the footer renders. */
export const VERSION_LABEL = `${VERSION_CHANNEL}.${BUILD_DATE}-${COMMIT_SHA.slice(0, 7)}`;
