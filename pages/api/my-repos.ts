/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

import { logger } from "@/utils/logger";

export const config = {
  maxDuration: 30,
};

type GitHubRepo = {
  id: number;
  name: string; // repository's full name from the API
  description: string | null;
  html_url: string;
};

type Data = { repos: Record<string, GitHubRepo[]> } | { error: string };

/**
 * Parses a Link header into an object mapping relation types (e.g., "next") to URLs.
 */
function parseLinkHeader(header: string): { [key: string]: string } {
  const links: { [key: string]: string } = {};
  const parts = header.split(",");

  parts.forEach((part) => {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);

    if (match) {
      const url = match[1];
      const rel = match[2];

      links[rel] = url;
    }
  });

  return links;
}

/**
 * Fetches all pages of GitHub API results for the provided URL.
 */
async function fetchAllPages(url: string, token: string): Promise<any[]> {
  let results: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    logger.debug(`Fetching page: ${nextUrl}`);
    const response = await fetch(nextUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      logger.error(`GitHub API error on ${nextUrl}: ${errorText}`);
      throw new Error(`GitHub API error: ${errorText}`);
    }

    const data = await response.json();

    results = results.concat(data);
    logger.debug(`Fetched ${data.length} items from ${nextUrl}`);

    const linkHeader = response.headers.get("Link");

    if (linkHeader) {
      const links = parseLinkHeader(linkHeader);

      nextUrl = links.next || null;
      if (nextUrl) {
        logger.debug(`Next page found: ${nextUrl}`);
      }
    } else {
      nextUrl = null;
    }
  }

  logger.info(`Completed pagination; total items fetched: ${results.length}`);

  return results;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  // Extract the GitHub token from the request header.
  const headerToken = req.headers.authorization || "";
  const token = headerToken.replace(/^token\s+/i, "");

  if (!token) {
    logger.error("GitHub token not configured in the request header.");

    return res
      .status(500)
      .json({ error: "GitHub token not configured in the request header." });
  }

  try {
    // 1. Retrieve details for the authenticated user.
    logger.debug("Fetching authenticated user details from GitHub");
    const userResp = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${token}`,
      },
    });

    if (!userResp.ok) {
      const err = await userResp.json();

      logger.error(`Error fetching user details: ${JSON.stringify(err)}`);

      return res.status(userResp.status).json({ error: JSON.stringify(err) });
    }
    const userData = await userResp.json();
    const myLogin = userData.login;

    logger.info(`Authenticated as GitHub user: ${myLogin}`);

    // Prepare the grouped results object.
    const groupedRepos: Record<string, GitHubRepo[]> = {};

    // 2. Get the user's personal repositories (their "own" repos) with pagination.
    const userReposUrl = `https://api.github.com/users/${myLogin}/repos?per_page=100&sort=full_name&direction=asc`;

    logger.debug(`Fetching personal repositories from: ${userReposUrl}`);
    const userRepos = await fetchAllPages(userReposUrl, token);

    groupedRepos["own"] = userRepos.map(
      (repo: any): GitHubRepo => ({
        id: repo.id,
        name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
      }),
    );
    logger.info(
      `Fetched ${groupedRepos["own"].length} personal repositories for user ${myLogin}`,
    );

    // 3. Get all organizations the user belongs to.
    logger.debug("Fetching organizations for the authenticated user");
    const orgsResp = await fetch(
      "https://api.github.com/user/orgs?per_page=100",
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `token ${token}`,
        },
      },
    );

    if (!orgsResp.ok) {
      const err = await orgsResp.json();

      logger.error(`Error fetching organizations: ${JSON.stringify(err)}`);

      return res.status(orgsResp.status).json({ error: JSON.stringify(err) });
    }
    const orgs = await orgsResp.json();

    logger.info(`User belongs to ${orgs.length} organization(s)`);

    // 4. For each organization, fetch all repositories with pagination.
    await Promise.all(
      orgs.map(async (org: any) => {
        const orgReposUrl = `https://api.github.com/orgs/${org.login}/repos?per_page=100&sort=full_name&direction=asc`;

        logger.debug(`Fetching repositories for organization: ${org.login}`);
        const orgRepos = await fetchAllPages(orgReposUrl, token);

        groupedRepos[org.login] = orgRepos.map(
          (repo: any): GitHubRepo => ({
            id: repo.id,
            name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
          }),
        );
        logger.info(
          `Fetched ${groupedRepos[org.login].length} repositories for organization ${org.login}`,
        );
      }),
    );

    logger.info(
      "Successfully fetched all repositories from user and organizations.",
    );
    res.status(200).json({ repos: groupedRepos });
  } catch (err: any) {
    logger.error(`Internal server error: ${err.message || err}`);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
}
