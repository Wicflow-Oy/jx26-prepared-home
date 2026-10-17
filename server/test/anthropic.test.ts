import { describe, expect, it } from "vitest";
import { AnthropicVisionProvider, ImageTooLargeError } from "../src/vision/anthropic";
import { buildRequest, parseAssessment, SYSTEM_PROMPT, TOOL_NAME } from "../src/vision/prompt";
import { check, fakeClient, fakeMessage, toolInput, toolUse } from "./helpers";

const image = { base64: "AAAA", mediaType: "image/jpeg" as const, width: 1000, height: 800 };

describe("request shape", () => {
  const l1 = check("L1");
  const req = buildRequest(l1, "sv", image, { model: "claude-sonnet-5-5" });

  it("sends a base64 JPEG image block and a strict tool with auto tool choice", () => {
    expect(req.model).toBe("claude-sonnet-5-5");
    const content = req.messages[0].content as {
      type: string;
      source?: { type: string; media_type: string; data: string };
    }[];
    expect(content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "AAAA" },
    });
    expect(req.tools).toHaveLength(1);
    const tool = req.tools![0] as unknown as {
      name: string;
      strict?: boolean;
      input_schema: { required: string[]; additionalProperties: boolean };
    };
    expect(tool.name).toBe(TOOL_NAME);
    expect(tool.strict).toBe(true);
    expect(tool.input_schema.required).toEqual([
      "criteria",
      "boxes",
      "retakeHint",
      "fixSuggestion",
      "urgent",
      "reproduction",
    ]);
    expect(tool.input_schema.additionalProperties).toBe(false);
    // Forced tool choice 400s on Sonnet 5.5 / Opus 5.5, so the request must not use it.
    expect(req.tool_choice).toEqual({ type: "auto", disable_parallel_tool_use: true });
    expect(req.output_config).toBeUndefined();
  });

  it("lists only visibility and condition criteria, never the user ones", () => {
    const text = JSON.stringify(req);
    for (const c of l1.criteria) {
      if (c.kind === "user") expect(text).not.toContain(c.text.en);
      else expect(text).toContain(c.text.en);
    }
    const crit = (
      req.tools![0] as unknown as {
        input_schema: { properties: { criteria: { required: string[] } } };
      }
    ).input_schema.properties.criteria;
    expect(crit.required).toHaveLength(l1.criteria.filter((c) => c.kind !== "user").length);
  });

  it("asks for null when unsure, never for valve position, never about people, in the requested language", () => {
    expect(SYSTEM_PROMPT).toContain("null when you can't tell from this photo");
    expect(SYSTEM_PROMPT).toMatch(/Never judge, mention or guess whether a valve/);
    expect(SYSTEM_PROMPT).toMatch(/do not describe them/);
    const userText = (req.messages[0].content as { type: string; text?: string }[])[1].text!;
    expect(userText).toContain("Swedish");
    expect(userText).toContain("1000 x 800");
  });

  it("passes effort only when configured", () => {
    expect(buildRequest(l1, "en", image, { model: "m", effort: "low" }).output_config).toEqual({
      effort: "low",
    });
  });
});

describe("parsing tool output", () => {
  const f2 = check("F2");

  it("maps answers back to criterion ids, clamps boxes and keeps hints", () => {
    const input = toolInput(f2, true, false, {
      boxes: [
        { label: "board", x0: -5, y0: 10, x1: 2000, y1: 700 },
        { label: "bad", x0: 50, y0: 50, x1: 40, y1: 60 },
        { label: "nan", x0: "x", y0: 0, x1: 1, y1: 1 },
      ],
      retakeHint: null,
      fixSuggestion: "  Call an electrician;   don't touch. ",
      urgent: true,
    });
    const a = parseAssessment(input, f2, image, "m1");
    expect(a.model).toBe("m1");
    expect(a.criteria.map((c) => c.id)).toEqual(
      f2.criteria.filter((c) => c.kind !== "user").map((c) => c.id),
    );
    for (const c of a.criteria) {
      const kind = f2.criteria.find((x) => x.id === c.id)!.kind;
      expect(c.met).toBe(kind === "visibility");
    }
    expect(a.boxes).toEqual([{ label: "board", bbox_px: [0, 10, 1000, 700] }]);
    expect(a.fixSuggestion).toBe("Call an electrician; don't touch.");
    expect(a.urgent).toBe(true);
  });

  it("passes on a photo of a screen or printout, and treats a missing flag as false", () => {
    const flagged = parseAssessment(
      toolInput(f2, true, true, { reproduction: true }),
      f2,
      image,
      "m",
    );
    expect(flagged.reproduction).toBe(true);
    const plain = parseAssessment(toolInput(f2, true, true, {}), f2, image, "m");
    expect(plain.reproduction).toBe(false);
  });

  it("turns anything malformed into all-null criteria", () => {
    const good = toolInput(f2, true, true);
    const firstKey = Object.keys(good.criteria)[0];
    const cases: unknown[] = [
      null,
      "text",
      { ...good, criteria: undefined },
      { ...good, criteria: { ...good.criteria, [firstKey]: { met: "yes", note: "" } } },
      { ...good, criteria: Object.fromEntries(Object.entries(good.criteria).slice(1)) },
    ];
    for (const input of cases) {
      const a = parseAssessment(input, f2, image, "m");
      expect(a.criteria.every((c) => c.met === null)).toBe(true);
      expect(a.criteria).toHaveLength(f2.criteria.filter((c) => c.kind !== "user").length);
      expect(a.urgent).toBe(false);
    }
  });
});

describe("AnthropicVisionProvider with a fake client", () => {
  const l5 = check("L5");

  it("defaults to claude-sonnet-5-5 and returns the parsed assessment with usage", async () => {
    const prev = process.env.VISION_MODEL;
    delete process.env.VISION_MODEL;
    try {
      const { client, calls } = fakeClient(() =>
        fakeMessage([
          { type: "text", text: "Looking." },
          toolUse(toolInput(l5, true, false, { urgent: true })),
        ]),
      );
      const provider = new AnthropicVisionProvider({ client });
      expect(provider.model).toBe("claude-sonnet-5-5");
      const a = await provider.assess({ check: l5, lang: "en", image });
      expect(calls).toHaveLength(1);
      expect(calls[0].model).toBe("claude-sonnet-5-5");
      expect(a.criteria.some((c) => c.met === false)).toBe(true);
      expect(a.urgent).toBe(true);
      expect(a.usage).toEqual({ inputTokens: 2000, outputTokens: 500 });
    } finally {
      if (prev !== undefined) process.env.VISION_MODEL = prev;
    }
  });

  it("uses the model override", async () => {
    const { client, calls } = fakeClient(() =>
      fakeMessage([toolUse(toolInput(l5, true, true))], { model: "claude-haiku-5-5" }),
    );
    const a = await new AnthropicVisionProvider({ client, model: "claude-haiku-5-5" }).assess({
      check: l5,
      lang: "en",
      image,
    });
    expect(calls[0].model).toBe("claude-haiku-5-5");
    expect(a.model).toBe("claude-haiku-5-5");
  });

  it("gives all-null on a refusal, a cut-off answer, no tool call or another tool's call", async () => {
    const replies = [
      fakeMessage([], { stop: "refusal" }),
      fakeMessage([toolUse(toolInput(l5, true, true))], { stop: "max_tokens" }),
      fakeMessage([{ type: "text", text: "I think it's fine." }], { stop: "end_turn" }),
      fakeMessage([toolUse(toolInput(l5, true, true), "something_else")]),
    ];
    for (const reply of replies) {
      const { client } = fakeClient(() => reply);
      const a = await new AnthropicVisionProvider({ client }).assess({
        check: l5,
        lang: "en",
        image,
      });
      expect(a.criteria.every((c) => c.met === null)).toBe(true);
    }
  });

  it("rejects images over 2576 px without calling the API", async () => {
    const { client, calls } = fakeClient(() => fakeMessage([]));
    const provider = new AnthropicVisionProvider({ client });
    await expect(
      provider.assess({ check: l5, lang: "en", image: { ...image, width: 2577 } }),
    ).rejects.toBeInstanceOf(ImageTooLargeError);
    expect(calls).toHaveLength(0);
  });

  it("lets transport errors through, so the chain can report them", async () => {
    const { client } = fakeClient(() => {
      throw Object.assign(new Error("overloaded"), { status: 529 });
    });
    await expect(
      new AnthropicVisionProvider({ client }).assess({ check: l5, lang: "en", image }),
    ).rejects.toThrow("overloaded");
  });
});
