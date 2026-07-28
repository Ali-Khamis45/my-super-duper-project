import { describe, expect, it, vi } from "vitest";

import { createEventBus } from "./EventBus";

type TestEvent = { name: "ping"; value: number } | { name: "pong" };

describe("createEventBus", () => {
  it("delivers an emitted event to a subscribed listener", () => {
    const bus = createEventBus<TestEvent>();
    const listener = vi.fn();
    bus.on("ping", listener);

    bus.emit({ name: "ping", value: 1 });

    expect(listener).toHaveBeenCalledWith({ name: "ping", value: 1 });
  });

  it("only delivers to listeners subscribed to the matching event name", () => {
    const bus = createEventBus<TestEvent>();
    const pingListener = vi.fn();
    const pongListener = vi.fn();
    bus.on("ping", pingListener);
    bus.on("pong", pongListener);

    bus.emit({ name: "ping", value: 1 });

    expect(pingListener).toHaveBeenCalledTimes(1);
    expect(pongListener).not.toHaveBeenCalled();
  });

  it("unsubscribe stops future delivery", () => {
    const bus = createEventBus<TestEvent>();
    const listener = vi.fn();
    const unsubscribe = bus.on("ping", listener);

    unsubscribe();
    bus.emit({ name: "ping", value: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("a throwing listener does not prevent later listeners from running or propagate to the emitter", () => {
    const bus = createEventBus<TestEvent>();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const throwingListener = vi.fn(() => {
      throw new Error("boom");
    });
    const laterListener = vi.fn();
    bus.on("ping", throwingListener);
    bus.on("ping", laterListener);

    expect(() => bus.emit({ name: "ping", value: 1 })).not.toThrow();
    expect(laterListener).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it("delivers to listeners in subscription order", () => {
    const bus = createEventBus<TestEvent>();
    const order: string[] = [];
    bus.on("ping", () => order.push("first"));
    bus.on("ping", () => order.push("second"));

    bus.emit({ name: "ping", value: 1 });

    expect(order).toEqual(["first", "second"]);
  });

  it("a listener added after emission never receives the past event (no replay)", () => {
    const bus = createEventBus<TestEvent>();
    bus.emit({ name: "ping", value: 1 });
    const lateListener = vi.fn();
    bus.on("ping", lateListener);

    expect(lateListener).not.toHaveBeenCalled();
  });
});
