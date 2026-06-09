/**
 * GST calculation utility
 *
 * Seller is based in Andhra Pradesh.
 * - Intra-state (AP → AP):  5% CGST only
 * - Inter-state (AP → other): 5% CGST + 5% SGST
 *
 * Product prices are stored INCLUSIVE of GST (MRP).
 * This module reverse-calculates the base price from the listed price.
 */

const SELLER_STATE = 'Andhra Pradesh';
const GST_COMPONENT_RATE = 0.05; // 5% per component

export interface GSTBreakdown {
  /** Price excluding GST (in paisa) */
  basePrice: number;
  /** Central GST amount (in paisa) — always 5% of basePrice */
  cgst: number;
  /** State GST amount (in paisa) — 5% of basePrice for inter-state, 0 for intra-state */
  sgst: number;
  /** Total tax = cgst + sgst */
  totalTax: number;
  /** Whether the order is intra-state (within AP) */
  isIntraState: boolean;
  /** Effective GST rate as a percentage (5 or 10) */
  gstPercent: number;
}

/**
 * Calculate GST breakdown from an inclusive (MRP) amount.
 *
 * @param inclusivePaisa - Total amount in paisa (price already includes GST)
 * @param customerState  - Customer's delivery state (from address)
 * @returns GST breakdown with base price, CGST, SGST, etc.
 */
export function calculateGST(
  inclusivePaisa: number,
  customerState: string,
): GSTBreakdown {
  const isIntraState =
    customerState.toLowerCase().trim() === SELLER_STATE.toLowerCase();

  // Intra-state: only 5% CGST → divisor = 1.05
  // Inter-state: 5% CGST + 5% SGST → divisor = 1.10
  const totalRate = isIntraState ? GST_COMPONENT_RATE : GST_COMPONENT_RATE * 2;
  const gstPercent = isIntraState ? 5 : 10;

  const basePrice = Math.round(inclusivePaisa / (1 + totalRate));
  const totalTax = inclusivePaisa - basePrice;

  if (isIntraState) {
    return {
      basePrice,
      cgst: totalTax,
      sgst: 0,
      totalTax,
      isIntraState,
      gstPercent,
    };
  }

  // Split evenly between CGST and SGST; handle rounding
  const cgst = Math.floor(totalTax / 2);
  const sgst = totalTax - cgst;

  return { basePrice, cgst, sgst, totalTax, isIntraState, gstPercent };
}
