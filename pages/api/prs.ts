/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

import { getPRDetails } from "../../utils/getPRDetails";

import { PRReturn } from "@/components/PRTile";
import { logger } from "@/utils/logger";

export const config = {
  maxDuration: 30,
};

type Data =
  | {
      total_count: number;
      pullRequests: PRReturn[];
      authors: string[];
    }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  const {
    repo,
    from,
    to,
    status,
    author,
    page = "1",
    perPage = "10",
  } = req.query;

  if (typeof from !== "string" || typeof to !== "string") {
    logger.warn("Missing required date range parameters.");

    return res
      .status(400)
      .json({ error: "Missing required date range parameters." });
  }

  const repoFromQuery =
    typeof repo === "string" && repo.trim() !== ""
      ? repo
      : process.env.GITHUB_REPO;

  if (!repoFromQuery) {
    logger.warn(
      "Project repo not specified in query parameters or environment variables.",
    );

    return res.status(400).json({
      error:
        "Project repo not specified in query parameters or environment variables.",
    });
  }

  logger.info(
    `Processing request for repo: ${repoFromQuery}, date range: ${from} to ${to}`,
  );

  // Build the query for GitHub
  let query = `repo:${repoFromQuery} type:pr created:${from}..${to}`;

  if (typeof status === "string") {
    if (status.toLowerCase() === "open") query += " state:open";
    else if (["closed", "merged"].includes(status.toLowerCase()))
      query += " state:closed";
  }
  if (typeof author === "string") {
    author.split(";").forEach((item) => {
      query += ` author:${item.trim()} `;
    });
  }
  const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(
    query,
  )}&sort=created&order=asc&page=${page}&per_page=${perPage}`;

  // Use token from header if provided; otherwise fallback
  const headerToken = req.headers.authorization || "";
  const token = headerToken.replace(/^token\s+/i, "");

  if (!token) {
    logger.error("GitHub token not configured.");

    return res
      .status(500)
      .json({ error: '{"error": "GitHub token not configured"}' });
  }

  try {
    logger.debug(`Searching GitHub issues with URL: ${searchUrl}`);
    const searchResp = await fetch(searchUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${token}`,
      },
    });

    if (!searchResp.ok) {
      const err = await searchResp.json();

      logger.error(`GitHub search error: ${JSON.stringify(err)}`);

      return res.status(searchResp.status).json({ error: JSON.stringify(err) });
    }
    const searchData = await searchResp.json();
    const prs = searchData.items as any[];

    logger.info(`Found ${prs.length} pull requests. Fetching detailed data...`);
    const detailedPRsArr = await Promise.all(
      prs.map((pr) => getPRDetails(pr, token, res)),
    );
    const detailedPRs = detailedPRsArr.filter(
      (pr): pr is PRReturn => pr !== null,
    );

    const authorSet = new Set<string>();

    detailedPRs.forEach((pr) => {
      if (pr.author) authorSet.add(pr.author);
      (pr.assignees || []).forEach((a) => authorSet.add(a));
    });
    const authors = Array.from(authorSet);

    logger.info("Successfully processed pull request details.");

    res.status(200).json({
      total_count: searchData.total_count,
      pullRequests: detailedPRs,
      authors,
    });
  } catch (err: any) {
    logger.error(`Internal server error: ${err.message || err}`);
    res.status(500).json({ error: "Internal server error" });
  }
}
