import { beforeEach, describe, expect, it } from "vitest";

import { useSearchStore } from "./search-store";

function resetStore() {
  useSearchStore.setState({ query: "" });
}

describe("useSearchStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("starts with an empty query", () => {
    expect(useSearchStore.getState().query).toBe("");
  });

  it("setQuery updates the query", () => {
    useSearchStore.getState().setQuery("latte");
    expect(useSearchStore.getState().query).toBe("latte");
  });

  it("clear resets the query to empty", () => {
    useSearchStore.getState().setQuery("latte");
    useSearchStore.getState().clear();
    expect(useSearchStore.getState().query).toBe("");
  });
});
