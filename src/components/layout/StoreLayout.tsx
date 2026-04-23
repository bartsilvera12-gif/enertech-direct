import { Outlet } from "react-router-dom";
import { PremiumHeader } from "@/components/layout/PremiumHeader";
import { PremiumFooter } from "@/components/layout/PremiumFooter";

export const StoreLayout = () => {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <PremiumHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PremiumFooter />
    </div>
  );
};
