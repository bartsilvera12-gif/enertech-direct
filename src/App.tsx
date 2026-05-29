import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreLayout } from "@/components/layout/StoreLayout";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Contact from "./pages/Contact";
import Nosotros from "./pages/Nosotros";
import NotFound from "./pages/NotFound.tsx";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminImport from "./pages/admin/AdminImport";
import AdminFastrax from "./pages/admin/AdminFastrax";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error("[Enertech query]", query.queryKey, error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _v, _c, mutation) => {
      console.error("[Enertech mutation]", mutation.options.mutationKey ?? mutation.meta, error);
    },
  }),
  defaultOptions: {
    queries: { retry: 1 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<StoreLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/cart" element={<Navigate to="/catalog" replace />} />
            <Route path="/checkout" element={<Navigate to="/catalog" replace />} />
            <Route path="/order/sent" element={<Navigate to="/catalog" replace />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="productos" element={<AdminProducts />} />
              <Route path="categorias" element={<AdminCategories />} />
              <Route path="importar" element={<AdminImport />} />
              <Route path="fastrax" element={<AdminFastrax />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
