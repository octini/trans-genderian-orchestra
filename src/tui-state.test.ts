import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  readTuiSnapshot,
  recordTuiAgentModel,
  recordTuiAgentModels,
} from './tui-state';

let previousXdgDataHome: string | undefined;
let tempDir: string;

beforeEach(() => {
  previousXdgDataHome = process.env.XDG_DATA_HOME;
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omos-tui-state-'));
  process.env.XDG_DATA_HOME = tempDir;
});

afterEach(() => {
  if (previousXdgDataHome === undefined) {
    delete process.env.XDG_DATA_HOME;
  } else {
    process.env.XDG_DATA_HOME = previousXdgDataHome;
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('tui-state persistence', () => {
  test('persists enabled agent models', () => {
    recordTuiAgentModels({
      agentModels: {
        scribe: 'openai/gpt-5.4-mini',
        composer: 'openai/gpt-5.4-mini',
      },
    });

    const snapshot = readTuiSnapshot();

    expect(snapshot.agentModels).toEqual({
      scribe: 'openai/gpt-5.4-mini',
      composer: 'openai/gpt-5.4-mini',
    });
  });

  test('updates a single live agent model without dropping others', () => {
    recordTuiAgentModels({
      agentModels: {
        conductor: 'default',
        scribe: 'openai/gpt-5.4-mini',
      },
    });

    recordTuiAgentModel({
      agentName: 'conductor',
      model: 'openai/gpt-5.5',
    });

    expect(readTuiSnapshot().agentModels).toEqual({
      conductor: 'openai/gpt-5.5',
      scribe: 'openai/gpt-5.4-mini',
    });
  });
  test('ignores legacy config status fields in old snapshots', () => {
    const filePath = path.join(
      tempDir,
      'opencode',
      'storage',
      'trans-genderian-orchestra',
      'tui-state.json',
    );
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        agentModels: { scribe: 'openai/gpt-5.4-mini' },
        configInvalid: true,
        configInvalidByProject: { old: true },
      }),
    );

    const snapshot = readTuiSnapshot();
    expect(snapshot.agentModels).toEqual({
      scribe: 'openai/gpt-5.4-mini',
    });
  });
});
