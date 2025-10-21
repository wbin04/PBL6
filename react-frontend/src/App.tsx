import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Categories from "./pages/Categories";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import Checkout from "./pages/Checkout";
import CheckoutResult from "./pages/CheckoutResult";
import StoreManager from "./pages/StoreManager";
import Account from "./pages/Account";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/storemanager" element={<StoreManager />} />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<Categories />} />
                <Route path="/menu/items" element={<Menu />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/checkout-result" element={<CheckoutResult />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/account" element={<Account />} />
                {/* Add more routes as needed */}
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;