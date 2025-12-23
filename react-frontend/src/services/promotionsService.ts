import { API } from "@/lib/api";

export type Promotion = {
  id: number;
  name?: string;
  title?: string;
  discount_type?: "PERCENT" | "AMOUNT" | "PERCENTAGE" | "FIXED";
  category?: "PERCENT" | "AMOUNT";
  discount_value: number | string;
  minimum_pay?: number | string;
  min_order_value?: number | string;
  max_discount_amount?: number | string | null;
  max_discount?: number | string | null;
  store?: number;
  store_id?: number;
  is_active?: boolean;
};

export type ValidatePromoResponse = {
  valid: boolean;
  discount_amount?: string;
  final_amount?: string;
  error?: string;
  promo?: Promotion;
};

export type AppliedPromo = {
  promo: Promotion;
  discount: number;
  storeAmount?: number;
};

const PROMOTIONS_ENDPOINT = "/promotions/";
const VALIDATE_PROMO_ENDPOINT = "/promotions/validate/";

const parseNumber = (value: unknown): number => {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizePromotionsResponse = (response: any): Promotion[] => {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.results)) return response.results;
  return [];
};

export const promotionsService = {
  async getPromotions(storeId?: number): Promise<Promotion[]> {
    try {
      const query = new URLSearchParams();
      query.append("active", "true");
      if (typeof storeId === "number") {
        query.append("store", String(storeId));
      }

      const url = `${PROMOTIONS_ENDPOINT}?${query.toString()}`;
      const response = await API.get(url);
      const promos = normalizePromotionsResponse(response);
      return promos;
    } catch (error) {
      console.error("Error fetching promotions:", error);
      return [];
    }
  },

  async validatePromo(
    promoId: number,
    totalAmount: number
  ): Promise<ValidatePromoResponse> {
    return API.post(VALIDATE_PROMO_ENDPOINT, {
      promo_id: promoId,
      total_amount: totalAmount,
    });
  },

  async validateMultiplePromos(
    promos: Array<{ promo: Promotion; storeAmount: number }>,
    totalAmount: number
  ): Promise<{ appliedPromos: AppliedPromo[]; totalDiscount: number }> {
    const appliedPromos: AppliedPromo[] = [];
    let totalDiscount = 0;

    for (const { promo, storeAmount } of promos) {
      try {
        const amountToValidate = promo.store === 0 ? totalAmount : storeAmount;
        const response = await this.validatePromo(
          promo.id,
          amountToValidate
        );

        if (response.valid && response.discount_amount) {
          const discount = parseNumber(response.discount_amount);
          totalDiscount += discount;
          appliedPromos.push({ promo, discount, storeAmount: amountToValidate });
        } else {
          console.warn(
            `Promo ${promo.id} invalid: ${response.error || "Unknown reason"}`
          );
        }
      } catch (error) {
        console.error(`Error validating promo ${promo.id}:`, error);
      }
    }

    return { appliedPromos, totalDiscount };
  },
};
