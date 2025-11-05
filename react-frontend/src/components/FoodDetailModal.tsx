import React, { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { getFoodDetail } from "@/services/menuService";
import { getRatingsByFood } from "@/services/ratingsService";
import type { DetailedFood } from "@/services/menuService";
import type { Rating } from "@/services/ratingsService";

interface Food {
  id: number;
  title: string;
  price: string;
  image_url: string;
  description: string;
  discount_info?: {
    type: "percent" | "amount";
    value: number;
    amount: number;
    final_price: number;
  };
}

interface FoodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  food: Food | null;
  onAddToCart: (
    foodId: number,
    quantity: number,
    note?: string,
    foodOptionId?: number
  ) => Promise<void>;
}

const FoodDetailModal: React.FC<FoodDetailModalProps> = ({
  isOpen,
  onClose,
  food,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [detailedFood, setDetailedFood] = useState<DetailedFood | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFoodDetails = useCallback(async () => {
    if (!food) return;

    try {
      setIsLoadingDetails(true);
      setError(null);
      console.log("Loading food details for ID:", food.id);
      const details = await getFoodDetail(food.id);
      console.log("Food details loaded:", details);
      console.log(
        "Sizes array:",
        details.sizes,
        "Length:",
        details.sizes?.length
      );
      setDetailedFood(details);
    } catch (err) {
      console.error("Error loading food details:", err);
      setError("Không thể tải thông tin chi tiết món ăn");
    } finally {
      setIsLoadingDetails(false);
    }
  }, [food]);

  const loadRatings = useCallback(async () => {
    if (!food) return;

    try {
      setIsLoadingRatings(true);
      const ratingsData = await getRatingsByFood(food.id);
      // Filter out invalid ratings and ensure data integrity
      const validRatings = (ratingsData || []).filter(
        (rating) =>
          rating &&
          typeof rating.id === "number" &&
          typeof rating.rating === "number"
      );
      setRatings(validRatings);
    } catch (err) {
      console.error("Error loading ratings:", err);
      // Don't set error for ratings as it's not critical
      setRatings([]);
    } finally {
      setIsLoadingRatings(false);
    }
  }, [food]);

  // Load detailed food information and ratings when modal opens
  useEffect(() => {
    if (isOpen && food) {
      loadFoodDetails();
      loadRatings();
    } else if (!isOpen) {
      // Reset state when modal closes
      setDetailedFood(null);
      setRatings([]);
      setError(null);
      setQuantity(1);
      setNote("");
    }
  }, [isOpen, food, loadFoodDetails, loadRatings]);

  if (!food) return null;

  // Use detailed food data if available, fallback to basic food data
  const currentFood = detailedFood || food;

  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      await onAddToCart(
        currentFood.id,
        quantity,
        note || undefined,
        selectedOptionId || undefined
      );
      onClose();
      // Reset state after successful add
      setQuantity(1);
      setNote("");
      setSelectedOptionId(null);
    } catch (error) {
      console.error("Error adding to cart:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsAddingToCart(false);
    }
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const basePrice = currentFood.discount_info
    ? currentFood.discount_info.final_price
    : Number(currentFood.price);
  const totalPrice = (basePrice * quantity).toLocaleString();

  // Component to render star rating
  const StarRating = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400" : "text-gray-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoadingDetails && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="ml-2">Đang tải thông tin...</span>
          </div>
        )}

        {/* Food Image */}
        <div className="mb-4">
          <img
            src={currentFood.image_url}
            alt={currentFood.title}
            className="w-full h-64 object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.src = "/images/placeholder.jpg";
            }}
          />
        </div>

        {/* Food Info */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentFood.title}
          </h2>

          {/* Store and Category Info (if available from detailed data) */}
          {detailedFood && (
            <div className="mb-3 space-y-1">
              {detailedFood.store && (
                <>
                  <p className="text-sm text-gray-500">
                    Cửa hàng: {detailedFood.store.store_name}
                  </p>
                  {detailedFood.store.description && (
                    <p className="text-sm text-gray-500">
                      {detailedFood.store.description}
                    </p>
                  )}
                </>
              )}
              {detailedFood.category && (
                <p className="text-sm text-gray-500">
                  Danh mục: {detailedFood.category.cate_name}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 mb-3">
            {currentFood.discount_info ? (
              <>
                <p className="text-2xl font-bold text-orange-600">
                  {currentFood.discount_info.final_price.toLocaleString()} đ
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-lg line-through text-gray-500">
                    {Number(currentFood.price).toLocaleString()} đ
                  </span>
                  <span className="text-sm font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {currentFood.discount_info.type === "percent"
                      ? `-${currentFood.discount_info.value}%`
                      : `-${currentFood.discount_info.amount.toLocaleString()}đ`}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-2xl font-bold text-orange-600">
                {Number(currentFood.price).toLocaleString()} đ
              </p>
            )}
          </div>

          {/* Rating Display */}
          {detailedFood &&
            detailedFood.rating_count &&
            detailedFood.rating_count > 0 &&
            detailedFood.average_rating && (
              <div className="flex items-center mb-3">
                <StarRating rating={Math.round(detailedFood.average_rating)} />
                <span className="ml-2 text-sm text-gray-600">
                  {detailedFood.average_rating.toFixed(1)} (
                  {detailedFood.rating_count} đánh giá)
                </span>
              </div>
            )}

          <p className="text-gray-600 leading-relaxed">
            {currentFood.description || "Không có mô tả"}
          </p>

          {/* Availability Status */}
          {detailedFood && (
            <div className="mt-3">
              <span
                className={`inline-block px-2 py-1 rounded text-sm ${
                  detailedFood.availability === "Còn hàng"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                {detailedFood.availability}
              </span>
            </div>
          )}

          {/* Size Options */}
          {detailedFood && (
            <div className="mt-4">
              {detailedFood.sizes && detailedFood.sizes.length > 0 ? (
                <>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Chọn kích thước:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedOptionId(null)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedOptionId === null
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}>
                      Tiêu chuẩn
                    </button>
                    {detailedFood.sizes.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedOptionId(size.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedOptionId === size.id
                            ? "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}>
                        {size.size_name} (+{Number(size.price).toLocaleString()}{" "}
                        đ)
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Món này chỉ có kích thước tiêu chuẩn
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quantity Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Số lượng
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={decreaseQuantity}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
              disabled={quantity <= 1}>
              <span className="text-lg">-</span>
            </button>
            <span className="text-lg font-medium min-w-[2rem] text-center">
              {quantity}
            </span>
            <button
              onClick={increaseQuantity}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
              <span className="text-lg">+</span>
            </button>
          </div>
        </div>

        {/* Note Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ghi chú (tùy chọn)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thêm ghi chú cho món ăn..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={200}
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {note.length}/200
          </div>
        </div>

        {/* Total Price */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Tổng cộng:</span>
            <span className="text-xl font-bold text-orange-600">
              {totalPrice} đ
            </span>
          </div>
        </div>

        {/* Ratings Section */}
        {Array.isArray(ratings) && ratings.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Đánh giá ({ratings.length})
            </h3>
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {ratings
                .filter((rating) => rating && rating.id)
                .map((rating) => (
                  <div
                    key={rating.id}
                    className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {rating.user?.fullname || "Người dùng ẩn danh"}
                      </span>
                      <StarRating rating={rating.rating || 0} />
                    </div>
                    {rating.comment && (
                      <p className="text-gray-600 text-sm">{rating.comment}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {rating.created_date
                        ? new Date(rating.created_date).toLocaleDateString(
                            "vi-VN"
                          )
                        : "N/A"}
                    </p>
                  </div>
                ))}
            </div>
            {isLoadingRatings && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
                <span className="text-sm text-gray-500 mt-2">
                  Đang tải đánh giá...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isAddingToCart}>
            Hủy
          </Button>
          <Button
            onClick={handleAddToCart}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
            disabled={
              isAddingToCart ||
              (detailedFood?.availability !== "Còn hàng" &&
                detailedFood?.availability !== undefined)
            }>
            {isAddingToCart ? "Đang thêm..." : "Thêm vào giỏ hàng"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FoodDetailModal;
