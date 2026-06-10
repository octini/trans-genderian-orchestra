export type FailureClass =
  | 'structural_provider'
  | 'tool_schema'
  | 'semantic'
  | 'timeout_cancellation'
  | 'environmental_preexisting';

export function shouldUseProviderFallback(failureClass: FailureClass): boolean {
  return failureClass === 'structural_provider';
}

export function classifyFailureForFallback(summary: string): FailureClass {
  const normalized = summary.toLowerCase();
  if (
    normalized.includes('rate limit') ||
    normalized.includes('quota') ||
    normalized.includes('provider') ||
    normalized.includes('model unavailable') ||
    normalized.includes('empty response') ||
    normalized.includes('network') ||
    normalized.includes('5xx')
  ) {
    return 'structural_provider';
  }
  if (normalized.includes('schema') || normalized.includes('invalid json')) {
    return 'tool_schema';
  }
  if (normalized.includes('timeout') || normalized.includes('cancel')) {
    return 'timeout_cancellation';
  }
  if (
    normalized.includes('pre-existing') ||
    normalized.includes('environment')
  ) {
    return 'environmental_preexisting';
  }
  return 'semantic';
}
