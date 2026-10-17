// Where each screen lives. The feature can be mounted under any base path in a host app.
export interface Paths {
  start: string;
  newHome: string;
  home: string;
  check: (checkId: string) => string;
  result: (checkId: string) => string;
  status: string;
  card: string;
  reminders: string;
  claim: string;
  settings: string;
  adjuster: (claimId: string) => string;
}

export function makePaths(basePath: string, adjusterBase: string): Paths {
  const b = basePath.replace(/\/+$/, "");
  const a = adjusterBase.replace(/\/+$/, "");
  return {
    start: b || "/",
    newHome: `${b}/new`,
    home: `${b}/home`,
    check: (id) => `${b}/check/${encodeURIComponent(id)}`,
    result: (id) => `${b}/result/${encodeURIComponent(id)}`,
    status: `${b}/status`,
    card: `${b}/card`,
    reminders: `${b}/reminders`,
    claim: `${b}/claim`,
    settings: `${b}/settings`,
    adjuster: (id) => `${a}/${encodeURIComponent(id)}`,
  };
}
