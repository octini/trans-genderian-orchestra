export type CircuitState = 'closed' | 'open' | 'half-open';

export interface ProviderCircuitBreakerOptions {
  threshold: number;
  cooldown_ms: number;
}

export interface CircuitDecision {
  allowed: boolean;
  state: CircuitState;
}

interface CircuitRecord {
  failures: number;
  opened_at?: number;
  half_open_probe_used: boolean;
}

export interface ProviderCircuitBreaker {
  recordFailure(providerModel: string, nowMs: number): void;
  recordSuccess(providerModel: string): void;
  canUse(providerModel: string, nowMs: number): CircuitDecision;
}

export function createProviderCircuitBreaker(
  options: ProviderCircuitBreakerOptions,
): ProviderCircuitBreaker {
  const records = new Map<string, CircuitRecord>();

  function recordFor(providerModel: string): CircuitRecord {
    const existing = records.get(providerModel);
    if (existing) {
      return existing;
    }
    const created: CircuitRecord = {
      failures: 0,
      half_open_probe_used: false,
    };
    records.set(providerModel, created);
    return created;
  }

  return {
    recordFailure(providerModel, nowMs) {
      const record = recordFor(providerModel);
      record.failures += 1;
      if (record.failures >= options.threshold) {
        record.opened_at = nowMs;
        record.half_open_probe_used = false;
      }
    },
    recordSuccess(providerModel) {
      records.set(providerModel, {
        failures: 0,
        half_open_probe_used: false,
      });
    },
    canUse(providerModel, nowMs) {
      const record = recordFor(providerModel);
      if (record.opened_at === undefined) {
        return { allowed: true, state: 'closed' };
      }
      if (nowMs - record.opened_at < options.cooldown_ms) {
        return { allowed: false, state: 'open' };
      }
      if (!record.half_open_probe_used) {
        record.half_open_probe_used = true;
        return { allowed: true, state: 'half-open' };
      }
      return { allowed: false, state: 'open' };
    },
  };
}
