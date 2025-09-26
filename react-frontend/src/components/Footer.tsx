import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-orange-100 py-8 mt-10">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="font-bold mb-2">Hỗ trợ khách hàng</h3>
          <p>Hướng dẫn đặt hàng</p>
          <p>Thanh toán và giao hàng</p>
        </div>
        <div>
          <h3 className="font-bold mb-2">Liên hệ</h3>
          <p>54 Nguyễn Lương Bằng, Đà Nẵng</p>
          <p>0365096495</p>
          <p>backkhoa069@gmail.com</p>
        </div>
        <div>
          <h3 className="font-bold mb-2">Hệ thống cửa hàng</h3>
          <p>54 Nguyễn Lương Bằng, Đà Nẵng</p>
          <p>34 Nam Cao, Đà Nẵng</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
