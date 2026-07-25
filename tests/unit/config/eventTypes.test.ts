import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EVENT_TYPE,
  EVENT_TYPES,
  EVENT_TYPE_PRESETS,
  getEventTypePreset,
  isEventType,
  listEventTypePresets,
} from '@/config/eventTypes';

describe('event type presets', () => {
  it('exposes a preset for every declared type', () => {
    for (const type of EVENT_TYPES) {
      expect(EVENT_TYPE_PRESETS[type]).toBeDefined();
      expect(EVENT_TYPE_PRESETS[type].value).toBe(type);
    }
  });

  it('gives every preset non-empty Hebrew copy', () => {
    for (const preset of listEventTypePresets()) {
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.blessingLine.length).toBeGreaterThan(0);
      expect(preset.invitationLine.length).toBeGreaterThan(0);
      expect(preset.ceremonyTimeLabel.length).toBeGreaterThan(0);
      expect(preset.honoreeLabel.length).toBeGreaterThan(0);
      expect(preset.hostsLabel.length).toBeGreaterThan(0);
      expect(preset.defaultSideALabel.length).toBeGreaterThan(0);
      expect(preset.defaultSideBLabel.length).toBeGreaterThan(0);
    }
  });

  it('lists presets in declaration order', () => {
    expect(listEventTypePresets().map((preset) => preset.value)).toEqual([...EVENT_TYPES]);
  });

  it('uses distinct labels so the admin picker is unambiguous', () => {
    const labels = listEventTypePresets().map((preset) => preset.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it.each([
    ['brit_mila', true],
    ['wedding', true],
    ['other', true],
    ['not_a_type', false],
    ['', false],
  ])('isEventType(%s) === %s', (value, expected) => {
    expect(isEventType(value)).toBe(expected);
  });

  it.each([undefined, null, 42, {}, []])('rejects the non-string value %s', (value) => {
    expect(isEventType(value)).toBe(false);
  });

  it('resolves a known type to its own preset', () => {
    expect(getEventTypePreset('wedding')).toBe(EVENT_TYPE_PRESETS.wedding);
  });

  it('falls back to the neutral preset for an unknown stored value', () => {
    expect(getEventTypePreset('written_by_a_newer_version')).toBe(
      EVENT_TYPE_PRESETS[DEFAULT_EVENT_TYPE],
    );
    expect(getEventTypePreset(undefined)).toBe(EVENT_TYPE_PRESETS[DEFAULT_EVENT_TYPE]);
  });
});
