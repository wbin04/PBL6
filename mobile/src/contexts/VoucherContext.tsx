import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Voucher {
  id: string;
  ten: string;
  ma: string;
  loai: 'Phần trăm' | 'Cố định';
  giaTri: string;
  batDau: string;
  ketThuc: string;
  trangThai: 'Đang hoạt động' | 'Chưa kích hoạt' | 'Đã dùng hết';
  daSuDung: number;
  tong: number;
  phanTram: number;
  donToiThieu: string;
  moTa: string;
}

interface VoucherContextType {
  vouchers: Voucher[];
  addVoucher: (v: Voucher) => void;
  updateVoucher: (v: Voucher) => void;
  deleteVoucher: (id: string) => void;
}

const VoucherContext = createContext<VoucherContextType | undefined>(undefined);

export const useVoucher = () => {
  const context = useContext(VoucherContext);
  if (!context) throw new Error('useVoucher must be used within a VoucherProvider');
  return context;
};


const defaultVouchers: Voucher[] = [
  { id: 'v1', ten: 'Khuyến mãi mùa hè', ma: 'SUMMER2024', loai: 'Phần trăm', giaTri: '20%', batDau: '01/06/2024', ketThuc: '31/08/2024', trangThai: 'Đang hoạt động', daSuDung: 156, tong: 1000, phanTram: 20, donToiThieu: '200.000 VND', moTa: 'Giảm giá 20% cho tất cả sản phẩm mùa hè' },
  { id: 'v2', ten: 'Giảm giá Black Friday', ma: 'BLACKFRIDAY', loai: 'Phần trăm', giaTri: '50%', batDau: '29/11/2024', ketThuc: '29/11/2024', trangThai: 'Chưa kích hoạt', daSuDung: 0, tong: 500, phanTram: 50, donToiThieu: '0', moTa: 'Giảm giá 50% trong ngày Black Friday' },
  { id: 'v3', ten: 'Miễn phí vận chuyển', ma: 'FREESHIP', loai: 'Cố định', giaTri: '30.000đ', batDau: '01/01/2024', ketThuc: '31/12/2024', trangThai: 'Đang hoạt động', daSuDung: 2341, tong: 10000, phanTram: 0, donToiThieu: '50.000 VND', moTa: 'Miễn phí vận chuyển cho đơn hàng trên 50k' },
];

export const VoucherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vouchers, setVouchers] = useState<Voucher[]>(defaultVouchers);

  const addVoucher = (v: Voucher) => setVouchers(prev => [...prev, v]);
  const updateVoucher = (v: Voucher) => setVouchers(prev => prev.map(vv => vv.id === v.id ? v : vv));
  const deleteVoucher = (id: string) => setVouchers(prev => prev.filter(v => v.id !== id));

  return (
    <VoucherContext.Provider value={{ vouchers, addVoucher, updateVoucher, deleteVoucher }}>
      {children}
    </VoucherContext.Provider>
  );
};
