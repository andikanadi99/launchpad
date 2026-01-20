// apps/web/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import RequireAuth from "./components/RequireAuth";
import { ThemeProvider } from "./components/ThemeContext"; 

import RootRedirect from "./components/RootRedirect";
import Onboarding from "./pages/Onboarding";
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
import ProductPage from './pages/products/Product';
import Success from "./pages/products/Success";
import Support from "./pages/Support";
import ProductPagePreview from "./pages/products/product page components/ProductPagePreview";
import DeliveryBuilder from "./pages/products/DeliveryBuilder";
import ContentBuilderPage from "./pages/products/product page components/ContentBuilderPage";

//Sales Page
import SalesPage from "./pages/products/SalesPage";
import SalesPageSimplified from "./pages/products/SalesPageSimplified";
import SalesPagePreview from "./pages/products/sales page components/SalesPagePreview";

// Product Idea Generator
import ProductIdeaGenerator from "./pages/product-idea/ProductIdeaGenerator";

export default function App() {
  return (
    <ThemeProvider>
    <Routes>
      
      <Route path="/p/:userId/:productId" element={<ProductPage />} />
      <Route path="/success" element={<Success />} />

      {/* Protected area: shows header/nav via AppLayout */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        {/* Root redirect - smart routing based on user state */}
        <Route index element={<RootRedirect />} />
        
        {/* Onboarding route - for new users or users in progress */}
        <Route path="onboarding" element={<Onboarding />} />
        
        {/* Product Idea Co-Pilot */}
        <Route path="product-idea-copilot" element={<ProductIdeaGenerator />} />
        
        {/* Dashboard route - for users with products */}
        <Route path="dashboard" element={<Dashboard />} />
        
        <Route path="support" element={<Support />} />
        
        {/* Preview Routes */}
        <Route path="preview/sales/:productId" element={<SalesPagePreview />} />
        <Route path="preview/product/:productId" element={<ProductPagePreview />} />
        
        <Route path="products">
          <Route path="sales" element={<SalesPageSimplified />} />
          <Route path=":productId/landing/edit" element={<SalesPageSimplified />} />  
          <Route path=":productId/edit" element={<SalesPageSimplified />} /> 
          <Route path=":productId/preview" element={<SalesPagePreview />} />
          <Route path=":productId/success" element={<Success />} /> 
          <Route path=":productId/delivery" element={<DeliveryBuilder />} />
          <Route path=":productId/content-builder" element={<ContentBuilderPage />} />
        </Route>
        
        <Route path="settings" element={<Settings />} />

        {/* Onboarding steps inside the layout */}
        <Route path="onboarding">
          <Route path="account" element={<AccountPage />} /> 
          <Route path="stripe" element={<StripePage />} /> 
        </Route>
      </Route>

      {/* Auth area: outside layout Ã¢â€ â€™ no header/nav */}
      <Route path="/auth">
        <Route path="signin" element={<SignIn />} />
        <Route path="signup" element={<SignUp />} />
        <Route path="forgetpassword" element={<ForgetPassword />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </ThemeProvider>
  );
}