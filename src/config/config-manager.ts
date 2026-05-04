import { homedir } from "node:os";
import path from "node:path";

import { cosmiconfig } from "cosmiconfig";
import type { ReviewReasoningMode } from "../types/review.js";
import { isRecord } from "../utils/type-guards.js";

export type LlmProvider = "openai" | "anthropic";
type ConfigReasoningMode = Exclude<ReviewReasoningMode, "standard-fallback">;

const CONFIG_SEARCH_PLACES = [
  "package.json",
  ".devzyrc",
  ".devzyrc.json",
  ".devzyrc.yaml",
  ".devzyrc.yml",
  ".devzy.yaml",
  ".devzy.yml",
] as const;

const DEFAULT_MODELS: Readonly<Record<LlmProvider, string>> = {
  openai: "gpt-4.1",
  anthropic: "claude-sonnet-4-20250514",
};

const DEFAULT_TEMPERATURE = 0.05;
const DEFAULT_REASONING_MODE: ConfigReasoningMode = "deep";

const DEFAULT_SECURITY_SCAN_MAX_FILES = 10_000;
const DEFAULT_SECURITY_SCAN_MAX_BYTES_PER_FILE = 512 * 1024;
const DEFAULT_SECURITY_SCAN_MAX_TOTAL_BYTES = 500 * 1024 * 1024;
const DEFAULT_SECURITY_SCAN_MAX_SMOKE_EXCERPT_BYTES = 8192;

/** Partial security-scan settings from YAML / env / CLI (unset = inherit default in loadConfig). */
export interface SecurityScanConfigInput {
  readonly sarifPath?: string;
  readonly playbookPath?: string;
  readonly maxFiles?: number;
  readonly maxBytesPerFile?: number;
  readonly maxTotalBytes?: number;
  readonly maxSmokeExcerptBytes?: number;
  readonly categories?: readonly string[];
  readonly languages?: readonly string[];
  readonly strictLlm?: boolean;
  readonly artifactsDir?: string;
}

/** Resolved security-scan settings after merge + defaults. */
export interface SecurityScanConfig {
  readonly sarifPath: string | undefined;
  readonly playbookPath: string | undefined;
  readonly maxFiles: number;
  readonly maxBytesPerFile: number;
  readonly maxTotalBytes: number;
  readonly maxSmokeExcerptBytes: number;
  readonly categories: readonly string[];
  readonly languages: readonly string[];
  readonly strictLlm: boolean;
  readonly artifactsDir: string | undefined;
}

interface ConfigInput {
  readonly baseBranch?: string;
  readonly llm?: {
    readonly provider?: LlmProvider;
    readonly model?: string;
    readonly temperature?: number;
    readonly apiKey?: string;
  };
  readonly review?: {
    readonly reasoningMode?: ConfigReasoningMode;
    readonly feedbackLoop?: {
      readonly enabled?: boolean;
    };
    readonly completenessCheck?: {
      readonly enabled?: boolean;
    };
  };
  readonly securityScan?: SecurityScanConfigInput;
}

export interface DevzyConfig {
  readonly baseBranch?: string;
  readonly llm: {
    readonly provider: LlmProvider;
    readonly model: string;
    readonly temperature: number;
    readonly apiKey: string | null;
  };
  readonly review: {
    readonly reasoningMode: ConfigReasoningMode;
    readonly feedbackLoop: {
      readonly enabled: boolean;
    };
    readonly completenessCheck: {
      readonly enabled: boolean;
    };
  };
  readonly securityScan: SecurityScanConfig;
  readonly sources: {
    readonly projectConfigPath: string | null;
    readonly userConfigPath: string | null;
  };
}

export interface LoadConfigOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly cliOverrides?: unknown;
  readonly userConfigPath?: string;
}

export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<DevzyConfig> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const userConfigPath =
    options.userConfigPath ??
    path.join(homedir(), ".config", "devzy", "config.yaml");
  const explorer = cosmiconfig("devzy", {
    searchPlaces: [...CONFIG_SEARCH_PLACES],
  });

  const [projectConfigResult, userConfigResult] = await Promise.all([
    explorer.search(cwd),
    loadOptionalConfig(explorer, userConfigPath),
  ]);

  const mergedFromFiles = mergeConfig(
    normalizeConfigSource(projectConfigResult?.config),
    normalizeConfigSource(userConfigResult?.config),
  );
  const mergedWithEnv = mergeConfig(mergedFromFiles, normalizeEnvConfig(env));
  const mergedWithCli = mergeConfig(
    mergedWithEnv,
    normalizeConfigSource(options.cliOverrides),
  );

  const provider = mergedWithCli.llm?.provider ?? "openai";
  const model = mergedWithCli.llm?.model ?? DEFAULT_MODELS[provider];
  const securityScan = resolveSecurityScanConfig(mergedWithCli.securityScan);

  return {
    baseBranch: mergedWithCli.baseBranch,
    llm: {
      provider,
      model,
      temperature: mergedWithCli.llm?.temperature ?? DEFAULT_TEMPERATURE,
      apiKey: mergedWithCli.llm?.apiKey ?? null,
    },
    review: {
      reasoningMode:
        mergedWithCli.review?.reasoningMode ?? DEFAULT_REASONING_MODE,
      feedbackLoop: {
        enabled: mergedWithCli.review?.feedbackLoop?.enabled ?? true,
      },
      completenessCheck: {
        enabled: mergedWithCli.review?.completenessCheck?.enabled ?? true,
      },
    },
    securityScan,
    sources: {
      projectConfigPath: projectConfigResult?.filepath ?? null,
      userConfigPath: userConfigResult?.filepath ?? null,
    },
  };
}

async function loadOptionalConfig(
  explorer: ReturnType<typeof cosmiconfig>,
  filePath: string,
): Promise<Awaited<ReturnType<typeof explorer.load>> | null> {
  try {
    return await explorer.load(filePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

function normalizeConfigSource(source: unknown): ConfigInput {
  if (!isRecord(source)) {
    return {};
  }

  const llm = isRecord(source.llm) ? source.llm : undefined;
  const review = isRecord(source.review) ? source.review : undefined;
  const feedbackLoop = isRecord(review?.feedbackLoop)
    ? review.feedbackLoop
    : undefined;
  const completenessCheck = isRecord(review?.completenessCheck)
    ? review.completenessCheck
    : undefined;
  const securityScan = isRecord(source.securityScan)
    ? normalizeSecurityScanInput(source.securityScan)
    : undefined;

  return {
    baseBranch: toNonEmptyString(source.baseBranch),
    llm: {
      provider: normalizeProvider(llm?.provider),
      model: toNonEmptyString(llm?.model),
      temperature: toFiniteNumber(llm?.temperature),
      apiKey: toNonEmptyString(llm?.apiKey),
    },
    review: {
      reasoningMode: normalizeReasoningMode(review?.reasoningMode),
      feedbackLoop: {
        enabled: toBoolean(feedbackLoop?.enabled),
      },
      completenessCheck: {
        enabled: toBoolean(completenessCheck?.enabled),
      },
    },
    securityScan,
  };
}

function normalizeEnvConfig(env: NodeJS.ProcessEnv): ConfigInput {
  const explicitProvider = normalizeProvider(
    env.DEVZY_PROVIDER ?? env.DEVZY_LLM_PROVIDER,
  );
  const explicitApiKey = toNonEmptyString(env.DEVZY_API_KEY);
  const openAiApiKey = toNonEmptyString(env.OPENAI_API_KEY);
  const anthropicApiKey = toNonEmptyString(env.ANTHROPIC_API_KEY);

  let provider = explicitProvider;
  let apiKey = explicitApiKey;

  if (!apiKey) {
    if (provider === "anthropic" && anthropicApiKey) {
      apiKey = anthropicApiKey;
    } else if (provider === "openai" && openAiApiKey) {
      apiKey = openAiApiKey;
    } else if (openAiApiKey) {
      provider ??= "openai";
      apiKey = openAiApiKey;
    } else if (anthropicApiKey) {
      provider ??= "anthropic";
      apiKey = anthropicApiKey;
    }
  }

  if (!provider && apiKey) {
    provider = detectProviderFromApiKey(apiKey) ?? "openai";
  }

  return {
    baseBranch: toNonEmptyString(env.DEVZY_BASE_BRANCH),
    llm: {
      provider,
      model: toNonEmptyString(env.DEVZY_MODEL),
      temperature: toFiniteNumber(env.DEVZY_TEMPERATURE),
      apiKey,
    },
    review: {
      reasoningMode: normalizeReasoningMode(env.DEVZY_REASONING_MODE),
      feedbackLoop: {
        enabled: toBoolean(env.DEVZY_FEEDBACK_LOOP_ENABLED),
      },
      completenessCheck: {
        enabled: toBoolean(env.DEVZY_COMPLETENESS_CHECK_ENABLED),
      },
    },
    securityScan: normalizeSecurityScanFromEnv(env),
  };
}

function detectProviderFromApiKey(apiKey: string): LlmProvider | null {
  const normalized = apiKey.trim();
  if (normalized.startsWith("sk-ant-")) {
    return "anthropic";
  }
  if (normalized.startsWith("sk-")) {
    return "openai";
  }
  return null;
}

function mergeConfig(base: ConfigInput, override: ConfigInput): ConfigInput {
  return {
    baseBranch: override.baseBranch ?? base.baseBranch,
    llm: {
      provider: override.llm?.provider ?? base.llm?.provider,
      model: override.llm?.model ?? base.llm?.model,
      temperature: override.llm?.temperature ?? base.llm?.temperature,
      apiKey: override.llm?.apiKey ?? base.llm?.apiKey,
    },
    review: {
      reasoningMode:
        override.review?.reasoningMode ?? base.review?.reasoningMode,
      feedbackLoop: {
        enabled:
          override.review?.feedbackLoop?.enabled ??
          base.review?.feedbackLoop?.enabled,
      },
      completenessCheck: {
        enabled:
          override.review?.completenessCheck?.enabled ??
          base.review?.completenessCheck?.enabled,
      },
    },
    securityScan: mergeSecurityScanInput(
      base.securityScan,
      override.securityScan,
    ),
  };
}

function normalizeReasoningMode(
  value: unknown,
): ConfigReasoningMode | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "standard" || normalized === "deep") {
    return normalized;
  }
  return undefined;
}

function normalizeProvider(value: unknown): LlmProvider | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "openai" || normalized === "anthropic") {
    return normalized;
  }
  return undefined;
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return undefined;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function normalizeSecurityScanInput(
  record: Record<string, unknown>,
): SecurityScanConfigInput | undefined {
  const categories = toStringArray(record.categories);
  const languages = toStringArray(record.languages);
  const partial: SecurityScanConfigInput = {
    sarifPath: toNonEmptyString(record.sarifPath),
    playbookPath: toNonEmptyString(record.playbookPath),
    maxFiles: toFiniteNumber(record.maxFiles),
    maxBytesPerFile: toFiniteNumber(record.maxBytesPerFile),
    maxTotalBytes: toFiniteNumber(record.maxTotalBytes),
    maxSmokeExcerptBytes: toFiniteNumber(record.maxSmokeExcerptBytes),
    categories,
    languages,
    strictLlm: toBoolean(record.strictLlm),
    artifactsDir: toNonEmptyString(record.artifactsDir),
  };
  const hasAny =
    partial.sarifPath !== undefined ||
    partial.playbookPath !== undefined ||
    partial.maxFiles !== undefined ||
    partial.maxBytesPerFile !== undefined ||
    partial.maxTotalBytes !== undefined ||
    partial.maxSmokeExcerptBytes !== undefined ||
    (partial.categories !== undefined && partial.categories.length > 0) ||
    (partial.languages !== undefined && partial.languages.length > 0) ||
    partial.strictLlm !== undefined ||
    partial.artifactsDir !== undefined;
  return hasAny ? partial : undefined;
}

function normalizeSecurityScanFromEnv(
  env: NodeJS.ProcessEnv,
): SecurityScanConfigInput | undefined {
  return normalizeSecurityScanInput({
    sarifPath: env.DEVZY_SECURITY_SCAN_SARIF_PATH,
    playbookPath: env.DEVZY_SECURITY_SCAN_PLAYBOOK_PATH,
    maxFiles: env.DEVZY_SECURITY_SCAN_MAX_FILES,
    maxBytesPerFile: env.DEVZY_SECURITY_SCAN_MAX_BYTES_PER_FILE,
    maxTotalBytes: env.DEVZY_SECURITY_SCAN_MAX_TOTAL_BYTES,
    maxSmokeExcerptBytes: env.DEVZY_SECURITY_SCAN_MAX_SMOKE_EXCERPT_BYTES,
    strictLlm: env.DEVZY_SECURITY_SCAN_STRICT_LLM,
    artifactsDir: env.DEVZY_SECURITY_SCAN_ARTIFACTS_DIR,
  });
}

function mergeSecurityScanInput(
  base: SecurityScanConfigInput | undefined,
  override: SecurityScanConfigInput | undefined,
): SecurityScanConfigInput | undefined {
  if (!base) {
    return override;
  }
  if (!override) {
    return base;
  }
  return {
    sarifPath: override.sarifPath ?? base.sarifPath,
    playbookPath: override.playbookPath ?? base.playbookPath,
    maxFiles: override.maxFiles ?? base.maxFiles,
    maxBytesPerFile: override.maxBytesPerFile ?? base.maxBytesPerFile,
    maxTotalBytes: override.maxTotalBytes ?? base.maxTotalBytes,
    maxSmokeExcerptBytes:
      override.maxSmokeExcerptBytes ?? base.maxSmokeExcerptBytes,
    categories: override.categories ?? base.categories,
    languages: override.languages ?? base.languages,
    strictLlm: override.strictLlm ?? base.strictLlm,
    artifactsDir: override.artifactsDir ?? base.artifactsDir,
  };
}

function resolveSecurityScanConfig(
  input: SecurityScanConfigInput | undefined,
): SecurityScanConfig {
  return {
    sarifPath: input?.sarifPath,
    playbookPath: input?.playbookPath,
    maxFiles: input?.maxFiles ?? DEFAULT_SECURITY_SCAN_MAX_FILES,
    maxBytesPerFile:
      input?.maxBytesPerFile ?? DEFAULT_SECURITY_SCAN_MAX_BYTES_PER_FILE,
    maxTotalBytes:
      input?.maxTotalBytes ?? DEFAULT_SECURITY_SCAN_MAX_TOTAL_BYTES,
    maxSmokeExcerptBytes:
      input?.maxSmokeExcerptBytes ??
      DEFAULT_SECURITY_SCAN_MAX_SMOKE_EXCERPT_BYTES,
    categories: input?.categories ?? [],
    languages: input?.languages ?? [],
    strictLlm: input?.strictLlm ?? false,
    artifactsDir: input?.artifactsDir,
  };
}

function toStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const out: string[] = [];
  for (const el of value) {
    if (typeof el === "string" && el.trim().length > 0) {
      out.push(el.trim());
    }
  }
  return out.length > 0 ? out : undefined;
}
