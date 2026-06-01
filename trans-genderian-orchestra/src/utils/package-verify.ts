/**
 * Verify an npm package exists on the registry before running npx.
 * Reduces typosquatting risk by confirming the package exists.
 */
const TRUSTED_PACKAGES = new Set([
  '@opencode-ai/skills-installer',
  'setup-matt-pocock-skills',
  '@beads/bd',
]);

export async function verifyPackageExists(
  packageName: string,
  registry?: string,
): Promise<boolean> {
  if (TRUSTED_PACKAGES.has(packageName)) {
    return true;
  }

  const registryUrl = registry ?? 'https://registry.npmjs.org';
  try {
    const url = `${registryUrl}/${encodeURIComponent(packageName)}`;
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    // Network failure: allow through (fail open rather than block install)
    return true;
  }
}
