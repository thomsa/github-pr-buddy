import type { AppProps } from "next/app";

import { useRouter } from "next/router";
import { HeroUIProvider } from "@heroui/system";
import "@/styles/globals.css";
import { LoadingBarContainer } from "react-top-loading-bar";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { fontSans, fontMono } from "@/config/fonts";

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider>
        <ThemeProvider theme={theme}>
          <LoadingBarContainer>
            <Component {...pageProps} />
          </LoadingBarContainer>
        </ThemeProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}

export const fonts = {
  sans: fontSans.style.fontFamily,
  mono: fontMono.style.fontFamily,
};
