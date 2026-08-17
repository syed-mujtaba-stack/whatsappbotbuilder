"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, token, isLoaded, loadFromStorage } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (isLoaded && !token) {
      router.replace("/login");
    }
  }, [isLoaded, token, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#6c63ff]" size={28} />
      </div>
    );
  }

  if (!user || !token) return null;

  return <>{children}</>;
}
