// apps/web/src/App.tsx
import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import RequireAuth from "./components/RequireAuth";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Auth (no layout)
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import ForgetPassword from "./pages/auth/ForgetPassword";

// Onboarding
import AccountPage from "./pages/onboarding/account/AccountPage";
import StripePage from "./pages/onboarding/account/Stripe";

//Product Page
import NewProduct from "./pages/products/NewProduct";
import ProductPage from './pages/products/Product';
import Success from "./pages/products/Success";
import EditProduct from './pages/products/EditProduct';
import Support from "./pages/Support";

//Sales Page
import SalesPage from "./pages/products/SalesPage";

export default function App() {
  return (
    <Routes>
      
      <Route path="/p/:userId/:productId" element={<ProductPage />} />
      <Route path="/success" element={<Success />} />
      {/* Protected area: shows header/nav via AppLayout */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="support" element={<Support />} />
        <Route path="products">
          <Route path="new" element={<NewProduct />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path=":productId/landing/edit" element={<SalesPage />} />  {/* ← ADD THIS */}
          <Route path=":productId/content" element={<NewProduct />} />  {/* ← ADD THIS */}
          <Route path=":productId/success" element={<Success />} />  {/* ← ADD THIS */}
          <Route path="edit/:productId" element={<EditProduct />} />
        </Route>
        <Route path="settings" element={<Settings />} />

        {/* Onboarding inside the layout → header visible */}
        <Route path="onboarding">
          <Route path="account" element={<AccountPage />} /> 
          <Route path="stripe" element={<StripePage />} /> 
        </Route>
      </Route>

      {/* Auth area: outside layout → no header/nav */}
      <Route path="/auth">
        <Route path="signin" element={<SignIn />} />
        <Route path="signup" element={<SignUp />} />
        <Route path="forgetpassword" element={<ForgetPassword />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
