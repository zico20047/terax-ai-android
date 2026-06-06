import * as React from "react";

export type Breakpoint = "phone" | "tablet" | "desktop";

const PHONE_MAX = 639;
const TABLET_MAX = 1023;

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = React.useState<Breakpoint>(() =>
    typeof window === "undefined"
      ? "desktop"
      : window.innerWidth <= PHONE_MAX
        ? "phone"
        : window.innerWidth <= TABLET_MAX
          ? "tablet"
          : "desktop",
  );

  React.useEffect(() => {
    const mqPhone = window.matchMedia(`(max-width: ${PHONE_MAX}px)`);
    const mqTablet = window.matchMedia(
      `(min-width: ${PHONE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`,
    );

    const onChange = () => {
      if (mqPhone.matches) setBp("phone");
      else if (mqTablet.matches) setBp("tablet");
      else setBp("desktop");
    };

    mqPhone.addEventListener("change", onChange);
    mqTablet.addEventListener("change", onChange);
    return () => {
      mqPhone.removeEventListener("change", onChange);
      mqTablet.removeEventListener("change", onChange);
    };
  }, []);

  return bp;
}

export function useIsMobile(): boolean {
  return useBreakpoint() !== "desktop";
}
