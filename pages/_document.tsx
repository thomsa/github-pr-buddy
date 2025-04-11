import { Html, Head, Main, NextScript } from "next/document";
import clsx from "clsx";

import { fontSans } from "@/config/fonts";
import { ThemeModeScript } from "flowbite-react";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <ThemeModeScript />
      </Head>
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
