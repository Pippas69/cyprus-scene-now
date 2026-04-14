import { describe, it, expect, vi } from "vitest";
import {
  safeSelectChange,
  safeBooleanChange,
  safeArrayChange,
  createSchedulerKey,
} from "../formSafeUpdate";

describe("createSchedulerKey", () => {
  it("returns a unique string each call", () => {
    const k1 = createSchedulerKey("test");
    const k2 = createSchedulerKey("test");
    expect(k1).not.toBe(k2);
  });

  it("includes the prefix", () => {
    const k = createSchedulerKey("myform");
    expect(k.startsWith("myform_")).toBe(true);
  });
});

describe("safeSelectChange", () => {
  it("does not call onChange when value is the same", () => {
    const onChange = vi.fn();
    safeSelectChange("foo", "foo", onChange, "test-select-1");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("schedules onChange when value changes (deferred)", async () => {
    const onChange = vi.fn();
    safeSelectChange("foo", "bar", onChange, "test-select-2");
    // onChange is deferred via setTimeout(0)
    await new Promise((r) => setTimeout(r, 10));
    expect(onChange).toHaveBeenCalledWith("bar");
  });
});

describe("safeBooleanChange", () => {
  it("does not call onChange when value is the same", () => {
    const onChange = vi.fn();
    safeBooleanChange(true, true, onChange, "test-bool-1");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("schedules onChange when value changes", async () => {
    const onChange = vi.fn();
    safeBooleanChange(false, true, onChange, "test-bool-2");
    await new Promise((r) => setTimeout(r, 10));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("safeArrayChange", () => {
  it("does not call onChange when arrays are equal", () => {
    const onChange = vi.fn();
    safeArrayChange(["a", "b"], ["a", "b"], onChange, "test-arr-1");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("schedules onChange when arrays differ", async () => {
    const onChange = vi.fn();
    safeArrayChange(["a"], ["a", "b"], onChange, "test-arr-2");
    await new Promise((r) => setTimeout(r, 10));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it("treats undefined as empty array", () => {
    const onChange = vi.fn();
    safeArrayChange(undefined, [], onChange, "test-arr-3");
    expect(onChange).not.toHaveBeenCalled();
  });
});
