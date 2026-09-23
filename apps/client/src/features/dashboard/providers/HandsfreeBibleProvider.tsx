import React, { createContext, useContext, ReactNode } from "react";
import { UseHandsfreeBibleReturn } from "../hooks/useHandsfreeBible";

const HandsfreeBibleContext = createContext<UseHandsfreeBibleReturn | undefined>(undefined);

interface HandsfreeBibleProviderProps {
  children: ReactNode;
  value: UseHandsfreeBibleReturn;
}

export const HandsfreeBibleProvider: React.FC<HandsfreeBibleProviderProps> = ({
  children,
  value,
}) => {
  return (
    <HandsfreeBibleContext.Provider value={value}>
      {children}
    </HandsfreeBibleContext.Provider>
  );
};

export const useHandsfreeBibleContext = (): UseHandsfreeBibleReturn => {
  const context = useContext(HandsfreeBibleContext);
  if (context === undefined) {
    throw new Error("useHandsfreeBibleContext must be used within a HandsfreeBibleProvider");
  }
  return context;
};
