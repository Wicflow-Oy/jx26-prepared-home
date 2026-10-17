import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_VISION_MODEL } from "../config";
import { MAX_LONG_EDGE } from "../jpeg";
import { allNull, buildRequest, extractToolInput, parseAssessment } from "./prompt";
import type { LiveAssessment, VisionInput, VisionProvider } from "./types";

/** The slice of the SDK client we use; tests pass a fake. */
export interface MessagesClient {
  messages: {
    create(body: Anthropic.MessageCreateParamsNonStreaming): PromiseLike<Anthropic.Message>;
  };
}

export interface AnthropicProviderOptions {
  apiKey?: string;
  client?: MessagesClient;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max" | null;
  timeoutMs?: number;
}

export class ImageTooLargeError extends Error {
  constructor() {
    super(`Image is larger than ${MAX_LONG_EDGE} px on the long edge`);
  }
}

export class AnthropicVisionProvider implements VisionProvider {
  readonly name = "anthropic";
  readonly model: string;
  private readonly client: MessagesClient;
  private readonly effort: AnthropicProviderOptions["effort"];

  constructor(opts: AnthropicProviderOptions = {}) {
    this.model = opts.model?.trim() || process.env.VISION_MODEL?.trim() || DEFAULT_VISION_MODEL;
    this.effort = opts.effort ?? null;
    if (opts.client) {
      this.client = opts.client;
    } else {
      const sdk = new Anthropic({
        apiKey: opts.apiKey,
        timeout: opts.timeoutMs ?? 90_000,
        maxRetries: 1,
      });
      this.client = { messages: { create: (body) => sdk.messages.create(body) } };
    }
  }

  /** Throws on transport/API errors (the caller treats that as "couldn't check"); malformed output becomes all-null. */
  async assess(input: VisionInput): Promise<LiveAssessment> {
    const { check, lang, image } = input;
    if (Math.max(image.width, image.height) > MAX_LONG_EDGE) throw new ImageTooLargeError();
    const request = buildRequest(check, lang, image, { model: this.model, effort: this.effort });
    const message = await this.client.messages.create(request);
    const usage = message.usage
      ? {
          inputTokens: message.usage.input_tokens ?? 0,
          outputTokens: message.usage.output_tokens ?? 0,
        }
      : undefined;
    const model = message.model || this.model;
    const toolInput = extractToolInput(message);
    const assessment =
      toolInput === null ? allNull(check, model) : parseAssessment(toolInput, check, image, model);
    return usage ? { ...assessment, usage } : assessment;
  }
}
