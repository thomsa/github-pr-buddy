import React from "react";
import NextHead from "next/head";

import { siteConfig } from "@/config/site";

export const Head = () => {
  // Get values from config and environment
  const siteTitle = siteConfig.name;
  const siteDescription = siteConfig.description;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://github-pr-buddy.vercel.app";
  // Using an absolute URL for the OG image is best practice
  const ogImage = `${siteUrl}/og-image.png`;

  return (
    <NextHead>
      {/* Basic Meta Tags */}
      <meta charSet="UTF-8" />
      <title>{siteTitle}</title>
      <meta content={siteDescription} name="description" />
      <meta
        content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        name="viewport"
      />
      <link href={siteUrl} rel="canonical" />
      <meta content="index, follow" name="robots" />
      <meta
        content="GitHub, PR, Pull Requests, Dashboard, Development, Code Review"
        name="keywords"
      />

      {/* Favicon */}
      <link href="/favicon.ico" rel="icon" />

      {/* Open Graph / Facebook Meta Tags */}
      <meta content="website" property="og:type" />
      <meta content={siteUrl} property="og:url" />
      <meta content={siteTitle} property="og:title" />
      <meta content={siteDescription} property="og:description" />
      <meta content={ogImage} property="og:image" />
      <meta content={siteTitle} property="og:site_name" />

      {/* Twitter Card Meta Tags */}
      <meta content="summary_large_image" name="twitter:card" />
      <meta content={siteUrl} name="twitter:url" />
      <meta content={siteTitle} name="twitter:title" />
      <meta content={siteDescription} name="twitter:description" />
      <meta content={ogImage} name="twitter:image" />
    </NextHead>
  );
};
