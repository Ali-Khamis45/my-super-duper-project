import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";

import { createBridgeStore } from "./createBridgeStore";

describe("createBridgeStore", () => {
  it("getValue reflects the initial value before any write", () => {
    const store = createBridgeStore(5);
    expect(store.getValue()).toBe(5);
  });

  it("setValue then getValue returns the new value synchronously (imperative side)", () => {
    const store = createBridgeStore(0);
    store.setValue(42);
    expect(store.getValue()).toBe(42);
  });

  it("useValue re-renders a subscribed component on change (reactive side)", () => {
    const store = createBridgeStore(0);
    const { result } = renderHook(() => store.useValue());
    expect(result.current).toBe(0);

    act(() => store.setValue(7));
    expect(result.current).toBe(7);
  });

  it("two instances stay independent", () => {
    const storeA = createBridgeStore("a");
    const storeB = createBridgeStore("a");
    storeA.setValue("changed");
    expect(storeB.getValue()).toBe("a");
  });
});
