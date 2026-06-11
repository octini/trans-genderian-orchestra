/**
 * URL where users can report issues with the TGO plugin.
 * Kept in a separate module because OpenCode's plugin loader requires
 * every export from a plugin entry point to be a function (or an object
 * with a `server` function). String constants in the entry point cause
 * "Plugin export is not a function" errors at load time.
 */
export const TGO_ISSUES_URL =
  'github.com/octini/trans-genderian-orchestra/issues';
