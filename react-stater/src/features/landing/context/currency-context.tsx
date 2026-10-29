import React, { createContext, useContext, useState } from "react";

export type Currency = "USD" | "VND";

export interface CurrencyContextType {
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatPrice: (amountInUsd: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("nexspace_currency");
        if (saved === "USD" || saved === "VND") {
          return saved;
        }
      } catch {
        // ignore
      }
    }
    return "USD";
  });

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    try {
      localStorage.setItem("nexspace_currency", curr);
    } catch {
      // ignore
    }
  };

  const formatPrice = (amountInUsd: number) => {
    if (currency === "VND") {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amountInUsd * 25000);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amountInUsd);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
