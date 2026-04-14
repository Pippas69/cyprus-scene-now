import { describe, it, expect } from "vitest";
import {
  translateCity,
  getCityDbValue,
  normalizeCityDbValue,
  sortCitiesByStandardOrder,
  cyprusCities,
  CITY_ORDER,
} from "../cityTranslations";

describe("translateCity", () => {
  it("translates Greek to English", () => {
    expect(translateCity("Λευκωσία", "en")).toBe("Nicosia");
  });

  it("translates English to Greek", () => {
    expect(translateCity("Nicosia", "el")).toBe("Λευκωσία");
  });

  it("returns empty string for null/undefined", () => {
    expect(translateCity(null, "en")).toBe("");
    expect(translateCity(undefined, "el")).toBe("");
  });

  it("returns original for unknown cities", () => {
    expect(translateCity("Athens", "en")).toBe("Athens");
  });
});

describe("getCityDbValue", () => {
  it("returns Greek name for English input", () => {
    expect(getCityDbValue("Nicosia")).toBe("Λευκωσία");
  });

  it("returns Greek name for Greek input", () => {
    expect(getCityDbValue("Λευκωσία")).toBe("Λευκωσία");
  });

  it("returns original for unknown", () => {
    expect(getCityDbValue("Athens")).toBe("Athens");
  });
});

describe("normalizeCityDbValue", () => {
  it("normalizes English to Greek", () => {
    expect(normalizeCityDbValue("Nicosia")).toBe("Λευκωσία");
  });

  it("handles case-insensitive English", () => {
    expect(normalizeCityDbValue("larnaca")).toBe("Λάρνακα");
  });

  it("returns empty for null/undefined/empty", () => {
    expect(normalizeCityDbValue(null)).toBe("");
    expect(normalizeCityDbValue("")).toBe("");
    expect(normalizeCityDbValue("  ")).toBe("");
  });

  it("returns trimmed value for unknown city", () => {
    expect(normalizeCityDbValue("  Athens  ")).toBe("Athens");
  });
});

describe("sortCitiesByStandardOrder", () => {
  it("sorts cities in standard order", () => {
    const shuffled = ["Λάρνακα", "Λευκωσία", "Λεμεσός"];
    const sorted = sortCitiesByStandardOrder(shuffled);
    expect(sorted).toEqual(["Λεμεσός", "Λευκωσία", "Λάρνακα"]);
  });

  it("puts unknown cities at the end", () => {
    const result = sortCitiesByStandardOrder(["Unknown", "Λεμεσός"]);
    expect(result[0]).toBe("Λεμεσός");
    expect(result[1]).toBe("Unknown");
  });

  it("does not mutate original array", () => {
    const original = ["Λάρνακα", "Λεμεσός"];
    const copy = [...original];
    sortCitiesByStandardOrder(original);
    expect(original).toEqual(copy);
  });
});

describe("cyprusCities", () => {
  it("has 7 cities in each language", () => {
    expect(cyprusCities.el).toHaveLength(7);
    expect(cyprusCities.en).toHaveLength(7);
  });
});

describe("CITY_ORDER", () => {
  it("starts with Λεμεσός", () => {
    expect(CITY_ORDER[0]).toBe("Λεμεσός");
  });
});
