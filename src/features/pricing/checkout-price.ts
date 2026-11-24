type CheckoutPriceRow = {
  active: boolean | null;
  type: string | null;
  unit_amount: number | null;
  products: { active: boolean | null } | null;
};

/**
 * Only paid, recurring prices on an active product can be checked out.
 * The $0 Free price would otherwise create a subscription that counts as Pro.
 */
export function isCheckoutablePrice(price: CheckoutPriceRow | null): boolean {
  return Boolean(
    price &&
      price.active === true &&
      price.type === 'recurring' &&
      price.unit_amount !== null &&
      price.unit_amount > 0 &&
      price.products?.active === true
  );
}
