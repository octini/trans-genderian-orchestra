import { describe, expect, test } from 'bun:test';
import {
  createInternalAgentTextPart,
  hasInternalInitiatorMarker,
  TGO_INTERNAL_INITIATOR_MARKER,
} from './internal-initiator';

describe('internal initiator marker', () => {
  test('uses the TGO marker value for internal text parts', () => {
    const part = createInternalAgentTextPart('internal notification');

    expect(TGO_INTERNAL_INITIATOR_MARKER).toBe(
      '<!-- TGO_INTERNAL_INITIATOR -->',
    );
    expect(part.text).toBe(
      `internal notification\n${TGO_INTERNAL_INITIATOR_MARKER}`,
    );
    expect(part.text).not.toContain(
      ['SLIM', 'INTERNAL', 'INITIATOR'].join('_'),
    );
  });

  test('detects TGO internal initiator marker on text parts', () => {
    expect(
      hasInternalInitiatorMarker({
        type: 'text',
        text: `internal notification\n${TGO_INTERNAL_INITIATOR_MARKER}`,
      }),
    ).toBe(true);
    expect(
      hasInternalInitiatorMarker({
        type: 'text',
        text: `internal notification\n<!-- ${['SLIM', 'INTERNAL', 'INITIATOR'].join('_')} -->`,
      }),
    ).toBe(false);
  });
});
