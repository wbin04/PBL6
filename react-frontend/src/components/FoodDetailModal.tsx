import React, { useState } from "react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface Food {
  id: number;
  title: string;
  price: string;
  image_url: string;
  description: string;
}

interface FoodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  food: Food | null;
  onAddToCart: (
    foodId: number,
    quantity: number,
    note?: string
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
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  if (!food) return null;

  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      await onAddToCart(food.id, quantity, note || undefined);
      onClose();
      // Reset state after successful add
      setQuantity(1);
      setNote("");
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

  const totalPrice = (Number(food.price) * quantity).toLocaleString();

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="p-6">
        {/* Food Image */}
        <div className="mb-4">
          <img
            src={food.image_url}
            alt={food.title}
            className="w-full h-64 object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.src = "/images/placeholder.jpg";
            }}
          />
        </div>

        {/* Food Info */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {food.title}
          </h2>
          <p className="text-lg font-semibold text-orange-600 mb-3">
            {Number(food.price).toLocaleString()} đ
          </p>
          <p className="text-gray-600 leading-relaxed">
            {food.description || "Không có mô tả"}
          </p>
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
            disabled={isAddingToCart}>
            {isAddingToCart ? "Đang thêm..." : "Thêm vào giỏ hàng"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FoodDetailModal;
