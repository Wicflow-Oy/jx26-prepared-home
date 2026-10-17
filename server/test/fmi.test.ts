import { describe, expect, it } from "vitest";
import {
  cleanPlace,
  dailyMinimums,
  FrostService,
  fixtureForecast,
  frostFromPoints,
  parseWfsSimple,
  USER_AGENT,
  type FetchLike,
} from "../src/fmi";

function element(time: string, value: string) {
  return `<wfs:member><BsWfs:BsWfsElement gml:id="x"><BsWfs:Location><gml:Point><gml:pos>60.45 22.27 </gml:pos></gml:Point></BsWfs:Location>
    <BsWfs:Time>${time}</BsWfs:Time><BsWfs:ParameterName>Temperature</BsWfs:ParameterName><BsWfs:ParameterValue>${value}</BsWfs:ParameterValue></BsWfs:BsWfsElement></wfs:member>`;
}
const xml = (...els: string[]) =>
  `<?xml version="1.0"?><wfs:FeatureCollection>${els.join("")}</wfs:FeatureCollection>`;

const SAMPLE = xml(
  element("2026-10-18T12:00:00Z", "5.2"),
  element("2026-10-18T20:00:00Z", "1.4"),
  element("2026-10-18T22:00:00Z", "-0.5"), // 01:00 on 19 Oct in Helsinki
  element("2026-10-19T03:00:00Z", "NaN"), // FMI gap
  element("2026-10-19T04:00:00Z", "-1.24"),
  element("2026-10-20T04:00:00Z", "-3.0"),
);

describe("FMI parsing", () => {
  it("reads time/value pairs and skips NaN gaps", () => {
    const points = parseWfsSimple(SAMPLE);
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual(["2026-10-18T12:00:00Z", 5.2]);
  });

  it("groups daily minimums by Helsinki date and finds the first frost day", () => {
    const points = parseWfsSimple(SAMPLE);
    expect(dailyMinimums(points)).toEqual([
      { date: "2026-10-18", minC: 1.4 },
      { date: "2026-10-19", minC: -1.24 },
      { date: "2026-10-20", minC: -3 },
    ]);
    expect(frostFromPoints(points, "Turku", "2026-10-18T10:00:00Z", "fmi_live")).toEqual({
      place: "Turku",
      fetchedAt: "2026-10-18T10:00:00Z",
      firstFrostDate: "2026-10-19",
      minTempC: -1.2,
      source: "fmi_live",
    });
  });

  it("returns no frost date and the lowest minimum when nothing reaches 0 °C", () => {
    const f = frostFromPoints(
      [
        ["2026-10-18T12:00:00Z", 4],
        ["2026-10-19T12:00:00Z", 2.26],
      ],
      "Turku",
      "t",
      "fmi_live",
    );
    expect(f.firstFrostDate).toBeNull();
    expect(f.minTempC).toBe(2.3);
  });

  it("has a Turku fixture captured from FMI", () => {
    const f = fixtureForecast();
    expect(f.source).toBe("fixture");
    expect(f.place).toBe("Turku");
    expect(f.firstFrostDate).toMatch(/^2026-10-\d{2}$/);
  });

  it("only accepts plain place names", () => {
    expect(cleanPlace("Åbo")).toBe("Åbo");
    expect(cleanPlace("Turku&storedquery_id=x")).toBe("Turku");
    expect(cleanPlace(undefined)).toBe("Turku");
  });
});

describe("FrostService", () => {
  it("fetches with the generic User-Agent, caches for an hour and refetches after", async () => {
    const urls: string[] = [];
    let agent = "";
    const fetchImpl: FetchLike = async (url, init) => {
      urls.push(url);
      agent = init.headers["User-Agent"];
      return { ok: true, status: 200, text: async () => SAMPLE };
    };
    let now = new Date("2026-10-18T10:00:00Z");
    const svc = new FrostService({ fetchImpl, clock: () => now });
    const a = await svc.forecast("Turku");
    expect(a).toMatchObject({ source: "fmi_live", firstFrostDate: "2026-10-19", place: "Turku" });
    expect(agent).toBe(USER_AGENT);
    const u = new URL(urls[0]);
    expect(u.origin + u.pathname).toBe("https://opendata.fmi.fi/wfs");
    expect(u.searchParams.get("storedquery_id")).toBe(
      "fmi::forecast::edited::weather::scandinavia::point::simple",
    );
    expect(u.searchParams.get("place")).toBe("Turku");
    expect(u.searchParams.get("parameters")).toBe("Temperature");
    expect(u.searchParams.has("apikey")).toBe(false);
    await svc.forecast("Turku");
    expect(urls).toHaveLength(1);
    now = new Date("2026-10-18T11:00:01Z");
    await svc.forecast("Turku");
    expect(urls).toHaveLength(2);
  });

  it("tries the second stored query, then falls back to the fixture when offline", async () => {
    const queries: string[] = [];
    const empty: FetchLike = async (url) => {
      queries.push(new URL(url).searchParams.get("storedquery_id")!);
      return queries.length === 1
        ? { ok: true, status: 200, text: async () => xml() }
        : { ok: true, status: 200, text: async () => SAMPLE };
    };
    const a = await new FrostService({ fetchImpl: empty }).forecast("Turku");
    expect(queries).toEqual([
      "fmi::forecast::edited::weather::scandinavia::point::simple",
      "fmi::forecast::harmonie::surface::point::simple",
    ]);
    expect(a.source).toBe("fmi_live");

    const offline: FetchLike = async () => {
      throw new Error("ENOTFOUND");
    };
    const b = await new FrostService({ fetchImpl: offline }).forecast("Turku");
    expect(b.source).toBe("fixture");
  });
});
