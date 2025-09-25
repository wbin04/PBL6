import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Shipper {
  id: string;
  name: string;
  phone: string;
  group: string;
}

export interface Order {
  id: string;
  shipperId: string;
  customerName: string;
  address: string;
  status: string;
}

export interface ShipperRating {
  id: string;
  shipperId: string;
  rating: number;
  comment: string;
}

interface ShipperContextProps {
  shippers: Shipper[];
  orders: Order[];
  ratings: ShipperRating[];
  updateShipper: (shipper: Shipper) => void;
  getOrdersByShipper: (shipperId: string) => Order[];
  getRatingsByShipper: (shipperId: string) => ShipperRating[];
}

const ShipperContext = createContext<ShipperContextProps | undefined>(undefined);

export const useShipper = () => {
  const ctx = useContext(ShipperContext);
  if (!ctx) throw new Error('useShipper must be used within ShipperProvider');
  return ctx;
};

const defaultShippers: Shipper[] = [
  { id: '1', name: 'Nguyễn Văn A', phone: '0901234567', group: 'A' },
  { id: '2', name: 'Trần Thị B', phone: '0902345678', group: 'B' },
];
const defaultOrders: Order[] = [
  { id: 'o1', shipperId: '1', customerName: 'Khách 1', address: 'Hà Nội', status: 'Đã giao' },
  { id: 'o2', shipperId: '1', customerName: 'Khách 2', address: 'HCM', status: 'Đã giao' },
  { id: 'o3', shipperId: '2', customerName: 'Khách 3', address: 'Đà Nẵng', status: 'Đã giao' },
];
const defaultRatings: ShipperRating[] = [
  { id: 'r1', shipperId: '1', rating: 5, comment: 'Rất tốt' },
  { id: 'r2', shipperId: '1', rating: 4, comment: 'Giao hàng nhanh' },
  { id: 'r3', shipperId: '2', rating: 3, comment: 'Bình thường' },
];

export const ShipperProvider = ({ children }: { children: ReactNode }) => {
  const [shippers, setShippers] = useState<Shipper[]>(defaultShippers);
  const [orders] = useState<Order[]>(defaultOrders);
  const [ratings] = useState<ShipperRating[]>(defaultRatings);

  const updateShipper = (shipper: Shipper) => {
    setShippers(prev => prev.map(s => (s.id === shipper.id ? shipper : s)));
  };

  const getOrdersByShipper = (shipperId: string) =>
    orders.filter(o => o.shipperId === shipperId);

  const getRatingsByShipper = (shipperId: string) =>
    ratings.filter(r => r.shipperId === shipperId);

  return (
    <ShipperContext.Provider value={{ shippers, orders, ratings, updateShipper, getOrdersByShipper, getRatingsByShipper }}>
      {children}
    </ShipperContext.Provider>
  );
};
