/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

import { logger } from "@/utils/logger";
import { getPRDetails, PRReturn } from "@/utils/getPRDetails";

export const config = {
  maxDuration: 30,
};

type AggregatedMetric = {
  average: number | null;
  median: number | null;
};

type AggregatedData = {
  timeToFirstReview: AggregatedMetric;
  timeToFirstApproval: AggregatedMetric;
  timeToFirstCodeUpdate: AggregatedMetric;
  totalTimeToClose: AggregatedMetric;
};

type Data =
  | {
      total_count: number;
      pullRequests: PRReturn[];
      authors: string[];
      aggregated: AggregatedData;
    }
  | { error: string };

function calculateAverage(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sum = numbers.reduce((acc, num) => acc + num, 0);

  return sum / numbers.length;
}

function calculateMedian(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

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
      prs.map((pr) => getPRDetails(pr, token, res, true)),
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

    // Aggregate metrics across all PRs
    const firstReviewTimes = detailedPRs
      .map((pr) => pr.metrics.timeToFirstReview)
      .filter((time): time is number => time !== null && time !== "null");
    const firstApprovalTimes = detailedPRs
      .map((pr) => pr.metrics.timeToFirstApproval)
      .filter((time): time is number => time !== null && time !== "null");
    const firstCodeUpdateTimes = detailedPRs
      .map((pr) => pr.metrics.timeToFirstCodeUpdate)
      .filter((time): time is number => time !== null && time !== "null");
    const closeTimes = detailedPRs
      .map((pr) => pr.metrics.totalTimeToClose)
      .filter((time): time is number => time !== null && time !== "null");

    const aggregated = {
      timeToFirstReview: {
        average: calculateAverage(firstReviewTimes),
        median: calculateMedian(firstReviewTimes),
      },
      timeToFirstApproval: {
        average: calculateAverage(firstApprovalTimes),
        median: calculateMedian(firstApprovalTimes),
      },
      timeToFirstCodeUpdate: {
        average: calculateAverage(firstCodeUpdateTimes),
        median: calculateMedian(firstCodeUpdateTimes),
      },
      totalTimeToClose: {
        average: calculateAverage(closeTimes),
        median: calculateMedian(closeTimes),
      },
    };

    res.status(200).json({
      total_count: searchData.total_count,
      pullRequests: detailedPRs,
      authors,
      aggregated,
    });
  } catch (err: any) {
    logger.error(`Internal server error: ${err.message || err}`);
    res.status(500).json({ error: "Internal server error" });
  }
}
