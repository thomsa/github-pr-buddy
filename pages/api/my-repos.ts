/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  maxDuration: 30,
};

type GitHubRepo = {
  id: number;
  name: string; // will hold the repository's full name from the API
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
    const response = await fetch(nextUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`GitHub API error: ${errorText}`);
    }
    const data = await response.json();

    results = results.concat(data);

    const linkHeader = response.headers.get("Link");

    if (linkHeader) {
      const links = parseLinkHeader(linkHeader);

      nextUrl = links.next || null;
    } else {
      nextUrl = null;
    }
  }

  return results;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Extract the GitHub token from the request header.
  const headerToken = req.headers.authorization || "";
  const token = headerToken.replace(/^token\s+/i, "");

  if (!token) {
    return res
      .status(500)
      .json({ error: "GitHub token not configured in the request header." });
  }

  try {
    // 1. Retrieve details for the authenticated user.
    const userResp = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${token}`,
      },
    });

    if (!userResp.ok) {
      const err = await userResp.json();

      return res.status(userResp.status).json({ error: JSON.stringify(err) });
    }
    const userData = await userResp.json();
    const myLogin = userData.login;

    // Prepare the grouped results object.
    const groupedRepos: Record<string, GitHubRepo[]> = {};

    // 2. Get the user's personal repositories (their "own" repos) with pagination.
    const userReposUrl = `https://api.github.com/users/${myLogin}/repos?per_page=100&sort=full_name&direction=asc`;
    const userRepos = await fetchAllPages(userReposUrl, token);

    groupedRepos["own"] = userRepos.map(
      (repo: any): GitHubRepo => ({
        id: repo.id,
        name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
      })
    );

    // 3. Get all organizations the user belongs to.
    const orgsResp = await fetch(
      "https://api.github.com/user/orgs?per_page=100",
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `token ${token}`,
        },
      }
    );

    if (!orgsResp.ok) {
      const err = await orgsResp.json();

      return res.status(orgsResp.status).json({ error: JSON.stringify(err) });
    }
    const orgs = await orgsResp.json();

    // 4. For each organization, fetch all repositories with pagination.
    await Promise.all(
      orgs.map(async (org: any) => {
        const orgReposUrl = `https://api.github.com/orgs/${org.login}/repos?per_page=100&sort=full_name&direction=asc`;
        const orgRepos = await fetchAllPages(orgReposUrl, token);

        groupedRepos[org.login] = orgRepos.map(
          (repo: any): GitHubRepo => ({
            id: repo.id,
            name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
          })
        );
      })
    );

    res.status(200).json({ repos: groupedRepos });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
}
