import { SmoothScroll } from "react-smooth-scrolll";
import type { ReactNode } from "react";

interface SmoothScrollProviderProps {
  children: ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  return (
    <SmoothScroll
      scrollSpeed={1.2}
      smoothness={0.1}
      infinite={false}
    >
      {children}
    </SmoothScroll>
  );
}
