import { describe, expect, it } from "vitest";
import { billingTotals, mayChangeInvoice } from "./billing-rules";

describe("staff billing rules", () => {
  it("adds catalogue prices and discount without GST", () => {
    expect(billingTotals([{ price: 500, quantity: 2 }, { price: 200, quantity: 1 }], 100)).toEqual({ subtotal: 1200, discount: 100, total: 1100 });
  });
  it("does not allow modification without separate privilege", () => {
    expect(mayChangeInvoice(false, true, false)).toBe(false);
    expect(mayChangeInvoice(false, true, true)).toBe(true);
  });
  it("allows admin cancellation and rejects unprivileged staff", () => {
    expect(mayChangeInvoice(true, false, false)).toBe(true);
    expect(mayChangeInvoice(false, false, true)).toBe(false);
  });
  it("rejects negative and excessive discounts", () => {
    expect(() => billingTotals([{ price: 500, quantity: 1 }], -1)).toThrow();
    expect(() => billingTotals([{ price: 500, quantity: 1 }], 501)).toThrow();
  });
});