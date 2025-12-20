export const formatPrice = (price: number | string) => {
  if (typeof price === "string") {
    price = parseFloat(price);
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

export const calculateDiscountedPrice = (
  originalPrice: number,
  discount: number = 0
) => {
  return discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
};

export const getPriceText = (originalPrice: number, discount?: number) => {
  if (!discount || discount <= 0) {
    return formatPrice(originalPrice);
  }

  const discountedPrice = calculateDiscountedPrice(originalPrice, discount);
  return (
    <div className="space-y-1">
      <div className="text-2xl font-extrabold text-orange-600">
        {formatPrice(discountedPrice)}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 line-through">
          {formatPrice(originalPrice)}
        </span>
        <span className="text-sm font-semibold text-red-600">-{discount}%</span>
      </div>
    </div>
  );
};
