// Privacy-preserving logs: never request bodies, image bytes, transcripts, keys or raw IPs.

export interface Logger {
  request(entry: { method: string; path: string; status: number; ms: number; ip: string }): void;
  check(entry: { checkId: string; verdict: string; source: string; ms: number }): void;
  info(message: string): void;
  warn(message: string): void;
}

function line(obj: Record<string, unknown>): string {
  return JSON.stringify({ t: new Date().toISOString(), ...obj });
}

export const consoleLogger: Logger = {
  request: (e) => console.log(line({ kind: "req", ...e })),
  check: (e) => console.log(line({ kind: "check", ...e })),
  info: (message) => console.log(line({ kind: "info", message })),
  warn: (message) => console.warn(line({ kind: "warn", message })),
};

export const silentLogger: Logger = {
  request: () => {},
  check: () => {},
  info: () => {},
  warn: () => {},
};
