import { describe, expect, it } from "vitest";
import { DEFAULT_ACTION_SETTINGS } from "@/lib/default-action-settings";
import { getPreferencesSaveValidationError } from "./preferences-save-validation";

const enabledWithoutLayers = {
  ...DEFAULT_ACTION_SETTINGS,
  architecture_enabled: true,
  architecture_config: {
    ...DEFAULT_ACTION_SETTINGS.architecture_config,
    enabled: true,
    layers: [],
  },
};

describe("getPreferencesSaveValidationError", () => {
  it("returns null when settings are valid", () => {
    expect(
      getPreferencesSaveValidationError(
        DEFAULT_ACTION_SETTINGS,
        DEFAULT_ACTION_SETTINGS,
      ),
    ).toBeNull();
  });

  it("allows save when architecture is newly enabled without changing layers", () => {
    expect(
      getPreferencesSaveValidationError(
        enabledWithoutLayers,
        DEFAULT_ACTION_SETTINGS,
      ),
    ).toBeNull();
  });

  it("allows save when architecture is newly enabled and only detection settings change", () => {
    expect(
      getPreferencesSaveValidationError(
        {
          ...enabledWithoutLayers,
          architecture_config: {
            ...enabledWithoutLayers.architecture_config,
            detectLayerViolations: false,
          },
        },
        DEFAULT_ACTION_SETTINGS,
      ),
    ).toBeNull();
  });

  it("allows save when architecture already had zero layers and only detection settings changed", () => {
    const persisted = enabledWithoutLayers;
    const current = {
      ...enabledWithoutLayers,
      architecture_config: {
        ...enabledWithoutLayers.architecture_config,
        detectCircularDependencies: false,
      },
    };

    expect(getPreferencesSaveValidationError(current, persisted)).toBeNull();
  });

  it("blocks save when all architecture layers are removed while architecture stays enabled", () => {
    const persisted = {
      ...enabledWithoutLayers,
      architecture_config: {
        ...enabledWithoutLayers.architecture_config,
        layers: [
          {
            id: "api",
            name: "api",
            patterns: ["**/api/**"],
            canImportFrom: [],
            color: "#000",
          },
        ],
      },
    };

    expect(
      getPreferencesSaveValidationError(enabledWithoutLayers, persisted),
    ).toMatch(/Architecture Analysis is enabled but no layers/i);
  });

  it("skips architecture validation when detailed review is disabled", () => {
    expect(
      getPreferencesSaveValidationError(
        {
          ...enabledWithoutLayers,
          disable_review: true,
        },
        DEFAULT_ACTION_SETTINGS,
      ),
    ).toBeNull();
  });
});
