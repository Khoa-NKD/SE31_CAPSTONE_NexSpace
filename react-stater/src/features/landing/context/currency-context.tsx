import React, { createContext, useContext, useState } from "react";

export type Currency = "USD" | "VND";

export interface CurrencyContextType {
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatPrice: (amount: number, options?: { compact?: boolean }) => string;
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
    return "VND";
  });

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    try {
      localStorage.setItem("nexspace_currency", curr);
    } catch {
      // ignore
    }
  };

  const formatPrice = (amount: number, options?: { compact?: boolean }) => {
    if (amount == null || isNaN(amount)) return currency === "VND" ? "0 ₫" : "$0";
    
    // NexSpace backend stores all prices in VND (e.g. 35000, 50000, 220000).
    // Auto-detect: if >= 500, treat as VND base. If < 500, treat as USD base.
    const isVndInput = amount >= 500;
    const amountInVnd = isVndInput ? amount : amount * 25000;
    const amountInUsd = isVndInput ? amount / 25000 : amount;

    if (currency === "VND") {
      if (options?.compact) {
        if (amountInVnd >= 1000000) {
          return `${(amountInVnd / 1000000).toFixed(1).replace(/\.0$/, "")}tr ₫`;
        }
        if (amountInVnd >= 1000) {
          return `${Math.round(amountInVnd / 1000)}k ₫`;
        }
      }
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(amountInVnd);
    }

    if (options?.compact) {
      if (amountInUsd >= 1000) {
        return `$${(amountInUsd / 1000).toFixed(1)}k`;
      }
      return `$${amountInUsd < 10 ? amountInUsd.toFixed(1) : Math.round(amountInUsd)}`;
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: amountInUsd % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
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
