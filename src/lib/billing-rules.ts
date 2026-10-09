export function billingTotals(items: { price: number; quantity: number }[], discount = 0) {
  if (!items.length) throw new Error("Add at least one item");
  const subtotal = items.reduce((sum, item) => {
    if (!Number.isFinite(item.price) || item.price < 0 || !Number.isInteger(item.quantity) || item.quantity < 1) throw new Error("Invalid invoice item");
    return sum + Math.round(item.price * item.quantity * 100);
  }, 0) / 100;
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) throw new Error("Invalid discount");
  return { subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100 };
}

export function mayChangeInvoice(admin: boolean, billingEdit: boolean, actionGranted: boolean) {
  return admin || (billingEdit && actionGranted);
}