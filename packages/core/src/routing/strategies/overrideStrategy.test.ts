/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { OverrideStrategy } from './overrideStrategy.js';
import type { RoutingContext } from '../routingStrategy.js';
import type { BaseLlmClient } from '../../core/baseLlmClient.js';
import type { Config } from '../../config/config.js';
import {
  DEFAULT_GEMINI_MODEL_AUTO,
  PREVIEW_GEMINI_3_1_MODEL,
  PREVIEW_GEMINI_MODEL,
} from '../../config/models.js';

describe('OverrideStrategy', () => {
  const strategy = new OverrideStrategy();
  const mockContext = {} as RoutingContext;
  const mockClient = {} as BaseLlmClient;

  it('should return null when the override model is auto', async () => {
    const mockConfig = {
      getModel: () => DEFAULT_GEMINI_MODEL_AUTO,
    } as Config;

    const decision = await strategy.route(mockContext, mockConfig, mockClient);
    expect(decision).toBeNull();
  });

  it('should return a decision with the override model when one is specified', async () => {
    const overrideModel = 'gemini-2.5-pro-custom';
    const mockConfig = {
      getModel: () => overrideModel,
    } as Config;

    const decision = await strategy.route(mockContext, mockConfig, mockClient);

    expect(decision).not.toBeNull();
    expect(decision?.model).toBe(overrideModel);
    expect(decision?.metadata.source).toBe('override');
    expect(decision?.metadata.reasoning).toContain(
      'Routing bypassed by forced model directive',
    );
    expect(decision?.metadata.reasoning).toContain(overrideModel);
  });

  it('should handle different override model names', async () => {
    const overrideModel = 'gemini-2.5-flash-experimental';
    const mockConfig = {
      getModel: () => overrideModel,
    } as Config;

    const decision = await strategy.route(mockContext, mockConfig, mockClient);

    expect(decision).not.toBeNull();
    expect(decision?.model).toBe(overrideModel);
  });

  it('should respect requestedModel from context', async () => {
    const requestedModel = 'requested-model';
    const configModel = 'config-model';
    const mockConfig = {
      getModel: () => configModel,
    } as Config;
    const contextWithRequestedModel = {
      requestedModel,
    } as RoutingContext;

    const decision = await strategy.route(
      contextWithRequestedModel,
      mockConfig,
      mockClient,
    );

    expect(decision).not.toBeNull();
    expect(decision?.model).toBe(requestedModel);
  });

  it('should preserve an explicitly flagged CLI model without resolving to Gemini 3.1', async () => {
    const mockConfig = {
      getModel: () => PREVIEW_GEMINI_MODEL,
      shouldPreserveExactModel: () => true,
      getGemini31LaunchedSync: () => true,
    } as unknown as Config;

    const decision = await strategy.route(mockContext, mockConfig, mockClient);

    expect(decision).not.toBeNull();
    expect(decision?.model).toBe(PREVIEW_GEMINI_MODEL);
    expect(decision?.model).not.toBe(PREVIEW_GEMINI_3_1_MODEL);
    expect(decision?.metadata.reasoning).toContain('explicit CLI model flag');
  });

  it('should still resolve to Gemini 3.1 when model was not explicitly flagged via CLI', async () => {
    const mockConfig = {
      getModel: () => PREVIEW_GEMINI_MODEL,
      shouldPreserveExactModel: () => false,
      getGemini31LaunchedSync: () => true,
    } as unknown as Config;

    const decision = await strategy.route(mockContext, mockConfig, mockClient);

    expect(decision).not.toBeNull();
    expect(decision?.model).toBe(PREVIEW_GEMINI_3_1_MODEL);
  });
});
