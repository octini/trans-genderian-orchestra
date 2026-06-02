import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  getActiveRuntimePreset,
  getPreviousRuntimePreset,
  rollbackRuntimePreset,
  setActiveRuntimePreset,
  setActiveRuntimePresetWithPrevious,
} from './runtime-preset';

describe('runtime-preset', () => {
  beforeEach(() => {
    rollbackRuntimePreset(null);
  });

  afterEach(() => {
    rollbackRuntimePreset(null);
  });

  test('getActiveRuntimePreset returns null initially', () => {
    expect(getActiveRuntimePreset()).toBeNull();
  });

  test('setActiveRuntimePreset sets active and previous preset', () => {
    setActiveRuntimePreset('old');
    setActiveRuntimePreset('new');
    expect(getActiveRuntimePreset()).toBe('new');
    expect(getPreviousRuntimePreset()).toBe('old');
  });

  test('setActiveRuntimePresetWithPrevious sets active and previous', () => {
    setActiveRuntimePreset('old');
    setActiveRuntimePresetWithPrevious('new');
    expect(getActiveRuntimePreset()).toBe('new');
    expect(getPreviousRuntimePreset()).toBe('old');
  });

  test('setActiveRuntimePresetWithPrevious with null sets previous to old', () => {
    setActiveRuntimePreset('old');
    setActiveRuntimePresetWithPrevious(null);
    expect(getActiveRuntimePreset()).toBeNull();
    expect(getPreviousRuntimePreset()).toBe('old');
  });

  test('rollbackRuntimePreset restores active and clears previous', () => {
    setActiveRuntimePreset('old');
    setActiveRuntimePresetWithPrevious('new');
    rollbackRuntimePreset('old');
    expect(getActiveRuntimePreset()).toBe('old');
    expect(getPreviousRuntimePreset()).toBeNull();
  });

  test('rollbackRuntimePreset with null clears active and previous', () => {
    setActiveRuntimePresetWithPrevious('new');
    rollbackRuntimePreset(null);
    expect(getActiveRuntimePreset()).toBeNull();
    expect(getPreviousRuntimePreset()).toBeNull();
  });
});
