import {
  Fira_Code as FontMono,
  Inter as FontSans,
  Orbitron,
} from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontMono = Orbitron({
  variable: "--font-mono",
  weight: "400",
});
