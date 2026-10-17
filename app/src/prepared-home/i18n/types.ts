/** One area's strings: English defines the keys, and Finnish and Swedish must have every one of them. */
export interface Area<T extends Record<string, string>> {
  en: T;
  fi: Record<keyof T, string>;
  sv: Record<keyof T, string>;
}
