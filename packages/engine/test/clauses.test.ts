import { describe, expect, it } from "vitest";
import { CLAUSES, clauseRefs, clauseSource, clauseText, getCheck } from "../src/index";

describe("clauses", () => {
  it("has the 28 clauses with fi, sv and official en text and a topic in every language", () => {
    const ids = Object.keys(CLAUSES);
    expect(ids).toHaveLength(28);
    for (const id of ids) {
      const c = CLAUSES[id]!;
      expect(c.id).toBe(id);
      expect(c.text.fi && c.text.sv && c.text.en).toBeTruthy();
      expect(c.topic.fi && c.topic.sv && c.topic.en).toBeTruthy();
      expect(c.source).toMatch(/Ehto (OMA|YLE)/);
    }
  });

  it("returns the requested language", () => {
    expect(clauseText("OMA-5.5.6", "fi")).toMatch(
      /^Pesukone on aina liitettävä omalla sulkuventtiilillä/,
    );
    expect(clauseText("OMA-5.5.6", "sv")).toMatch(/^Tvättmaskinen ska alltid anslutas/); // list marker "6) " removed
    expect(clauseText("OMA-5.5.6", "en")).toMatch(/^Washing machines must always be connected/); // official English
    expect(clauseSource("OMA-5.5.6", "en")).toMatch(
      /^Home property insurance Terms and Conditions/,
    );
  });

  it("falls back to fi, then en", () => {
    const clause = CLAUSES["OMA-5.5.6"]!;
    const saved = { ...clause.text };
    try {
      delete clause.text.sv;
      expect(clauseText("OMA-5.5.6", "sv")).toBe(saved.fi);
      expect(clauseSource("OMA-5.5.6", "sv")).toMatch(/^Kodin omaisuusvakuutusehdot/);
      delete clause.text.fi;
      expect(clauseText("OMA-5.5.6", "sv")).toBe(saved.en);
      expect(clauseText("OMA-5.5.6", "fi")).toBe(saved.en);
    } finally {
      clause.text = saved;
    }
    expect(clauseText("OMA-5.5.6", "sv")).toBe(saved.sv);
  });

  it("throws for an unknown clause", () => {
    expect(() => clauseText("OMA-9.9.9", "fi")).toThrow();
  });

  it("builds clause refs for a check", () => {
    expect(clauseRefs(getCheck("L5"), "en").map((r) => r.id)).toEqual(["OMA-5.5.7", "OMA-5.5.9"]);
    expect(clauseRefs(getCheck("F4"), "en").map((r) => r.id)).toEqual(["OMA-5.2.15"]);
    expect(clauseRefs(getCheck("L1", "flat"), "en")).toEqual([]);
  });

  it("quotes the stove instruction 5.2.15 verbatim in all three languages", () => {
    const c = CLAUSES["OMA-5.2.15"]!;
    expect(c.section).toBe("5.2.15");
    expect(c.text.fi).toBe(
      "Liettä, uunia, grilliä, savustinta tai muuta vastaavaa tulee käyttää valvotusti. Niiden päällä tai välittömässä läheisyydessä ei saa olla syttyviä esineitä. Asunnosta poistuttaessa on varmistettava, että ne on sammutettu tai niistä on katkaistu virta.",
    );
    expect(c.text.sv).toMatch(
      /^Spis, ugn, grill, rök eller motsvarande ska användas under övervakning\./,
    ); // "15) " removed
    expect(c.text.sv).toMatch(/strömmen till dem är frånkopplad\.$/);
    expect(c.text.en).toBe(
      "The stove, oven, grill, smoker or similar must be operated under supervision. No flammable objects should be kept on or in the immediate vicinity of them. Make sure they are turned or switched off before you leave the dwelling.",
    );
    expect(clauseSource("OMA-5.2.15", "en")).toMatch(
      /^Home property insurance Terms and Conditions/,
    );
  });

  it("gives the two §5 intro clauses the same extent in every language", () => {
    expect(clauseText("OMA-5-intro-valvonta", "sv")).toBe(
      "I säkerhetsföreskrifterna avses med övervakning av byggnad besök i byggnaden minst en gång i månaden.",
    );
    expect(clauseText("OMA-5-intro-laiminlyonti", "sv")).toMatch(
      /^Om säkerhetsföreskrifterna försummas, kan detta leda till/,
    );
  });
});
