import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Die Schriftgrößen aus dem steep-Typo-System (globals.css). tailwind-merge
 * kennt nur die eingebauten Größen und stuft `text-body` sonst als Textfarbe
 * ein — dadurch wirft es ein vorher gesetztes `text-primary-foreground` raus
 * und man bekommt schwarze Schrift auf schwarzem Grund.
 */
const CUSTOM_FONT_SIZES = [
  "caption",
  "body",
  "body-lg",
  "subheading",
  "heading-sm",
  "heading",
  "heading-lg",
  "display",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: CUSTOM_FONT_SIZES }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
