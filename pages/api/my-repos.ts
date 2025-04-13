/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
};

type Data = { repos: Record<string, GitHubRepo[]> } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Extract the token from the request header.
  const headerToken = req.headers.authorization || "";
  const token = headerToken.replace(/^token\s+/i, "");

  if (!token) {
    return res
      .status(500)
      .json({ error: "GitHub token not configured in the request header." });
  }

  try {
    // 1. Get the authenticated user's details.
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

    // 2. Get the user's personal (own) projects.
    const userReposUrl = `https://api.github.com/users/${myLogin}/repos`;
    const userReposResp = await fetch(userReposUrl, {
      headers: {
        Accept: "application/vnd.github.inertia-preview+json",
        Authorization: `token ${token}`,
      },
    });

    if (userReposResp.ok) {
      const userProjects = await userReposResp.json();

      groupedRepos["own"] = userProjects.map(
        (repo: any): GitHubRepo => ({
          id: repo.id,
          name: repo.name,
          description: repo.description,
          html_url: repo.html_url,
        })
      );
    } else {
      groupedRepos["own"] = [];
    }

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

    // For each organization, get the organization-level projects.
    await Promise.all(
      orgs.map(async (org: any) => {
        const orgReposUrl = `https://api.github.com/orgs/${org.login}/repos`;
        const orgReposResp = await fetch(orgReposUrl, {
          headers: {
            Accept: "application/vnd.github.inertia-preview+json",
            Authorization: `token ${token}`,
          },
        });

        console.log(orgReposResp);

        if (orgReposResp.ok) {
          const orgRepos = await orgReposResp.json();

          groupedRepos[org.login] = orgRepos.map(
            (repo: any): GitHubRepo => ({
              id: repo.id,
              name: repo.full_name,
              description: repo.description,
              html_url: repo.html_url,
            })
          );
        } else {
          groupedRepos[org.login] = [];
        }
      })
    );

    res.status(200).json({ repos: groupedRepos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
