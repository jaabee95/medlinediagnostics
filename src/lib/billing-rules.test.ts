import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import { billingTotals, mayChangeInvoice } from "./billing-rules";

describe("staff billing rules", () => {
  it("adds catalogue prices and discount without GST", () => {
    deepStrictEqual(billingTotals([{ price: 500, quantity: 2 }, { price: 200, quantity: 1 }], 100), { subtotal: 1200, discount: 100, total: 1100 });
  });
  it("does not allow modification without separate privilege", () => {
    strictEqual(mayChangeInvoice(false, true, false), false);
    strictEqual(mayChangeInvoice(false, true, true), true);
  });
  it("allows admin cancellation and rejects unprivileged staff", () => {
    strictEqual(mayChangeInvoice(true, false, false), true);
    strictEqual(mayChangeInvoice(false, false, true), false);
  });
  it("rejects negative and excessive discounts", () => {
    throws(() => billingTotals([{ price: 500, quantity: 1 }], -1));
    throws(() => billingTotals([{ price: 500, quantity: 1 }], 501));
  });
});