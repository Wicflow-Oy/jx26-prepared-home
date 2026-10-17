import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import {
  getCheck,
  type CheckDefinition,
  type HomeType,
  type VisionAssessment,
} from "@prepared-home/engine";
import { loadConfig, type ServerConfig } from "../src/config";
import { sha256Hex } from "../src/hash";
import { silentLogger } from "../src/log";
import { TOOL_NAME, criterionKeys, modelCriteria } from "../src/vision/prompt";
import type { MessagesClient } from "../src/vision/anthropic";
import type { VisionInput, VisionProvider } from "../src/vision/types";

export const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const photosDir = path.join(serverDir, "eval", "photos");

export function tempDir(prefix = "ph-test-"): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function photo(name: string) {
  const bytes = readFileSync(path.join(photosDir, name));
  return { bytes, base64: bytes.toString("base64"), sha256: sha256Hex(bytes) };
}

/** A minimal JPEG header (SOI, APP0, SOF0) with the given size. Enough for the size reader; not a decodable image. */
export function fakeJpeg(width: number, height: number): Buffer {
  const app0 = [
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x00,
  ];
  const sof0 = [
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    0x01,
    0x22,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01,
  ];
  return Buffer.from([0xff, 0xd8, ...app0, ...sof0, 0xff, 0xd9]);
}

/** Test config: stateless, nothing written to the repo, no key. */
export function testConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  const base = loadConfig({});
  return {
    ...base,
    cacheDir: tempDir("ph-cache-"),
    storePath: path.join(tempDir("ph-store-"), "store.json"),
    samplesDir: photosDir,
    webDist: path.join(tempDir("ph-web-"), "none"),
    logSalt: "test-salt",
    ...overrides,
  };
}

export const quietLogger = silentLogger;

type Met = boolean | null;

/** A tool input that gives every visibility criterion `vis` and every condition criterion `cond`. */
export function toolInput(
  check: CheckDefinition,
  vis: Met,
  cond: Met,
  extra: Record<string, unknown> = {},
) {
  const crits = modelCriteria(check);
  const keys = criterionKeys(crits);
  const criteria: Record<string, unknown> = {};
  crits.forEach((c, i) => {
    criteria[keys[i]] = { met: c.kind === "visibility" ? vis : cond, note: "" };
  });
  return { criteria, boxes: [], retakeHint: null, fixSuggestion: null, urgent: false, ...extra };
}

export function fakeMessage(
  content: unknown[],
  opts: { stop?: Anthropic.StopReason; model?: string } = {},
): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: opts.model ?? "claude-sonnet-5-5",
    content,
    stop_reason: opts.stop ?? "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 500 },
  } as unknown as Anthropic.Message;
}

export function toolUse(input: unknown, name = TOOL_NAME) {
  return { type: "tool_use", id: "toolu_test", name, input };
}

/** Fake SDK client: records requests and replies with whatever `reply` returns. */
export function fakeClient(
  reply: (
    body: Anthropic.MessageCreateParamsNonStreaming,
  ) => Anthropic.Message | Promise<Anthropic.Message>,
) {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const client: MessagesClient = {
    messages: {
      create: async (body) => {
        calls.push(body);
        return reply(body);
      },
    },
  };
  return { client, calls };
}

/** A provider whose answers are scripted per check: "verified" | "retake" | "fix_first" shapes. */
export function scriptedAssessment(
  check: CheckDefinition,
  shape: "verified" | "retake" | "fix_first",
  model = "fake-model",
): VisionAssessment {
  const vis: Met = shape === "retake" ? null : true;
  const cond: Met = shape === "verified" ? true : shape === "fix_first" ? false : null;
  return {
    criteria: modelCriteria(check).map((c) => ({
      id: c.id,
      met: c.kind === "visibility" ? vis : cond,
    })),
    boxes: [],
    retakeHint: null,
    fixSuggestion: shape === "fix_first" ? "Fix it" : null,
    urgent: false,
    model,
  };
}

export class FakeProvider implements VisionProvider {
  readonly name = "fake";
  calls = 0;
  constructor(
    readonly model: string,
    private readonly answer: (input: VisionInput) => VisionAssessment | Promise<VisionAssessment>,
  ) {}
  async assess(input: VisionInput): Promise<VisionAssessment> {
    this.calls += 1;
    return this.answer(input);
  }
}

export function check(id: string, homeType: HomeType = "flat"): CheckDefinition {
  return getCheck(id, homeType);
}
