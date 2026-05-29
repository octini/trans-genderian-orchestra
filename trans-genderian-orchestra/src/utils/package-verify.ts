/**
 * Verify an npm package exists on the registry before running npx.
 * Reduces typosquatting risk by confirming the package exists.
 */
export async function verifyPackageExists(
  packageName: string,
  registry?: string,
): Promise<boolean> {
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
