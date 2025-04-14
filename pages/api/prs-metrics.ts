/* pages/api/prs-metrics.ts */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  maxDuration: 30,
};

type PRMetric = {
  timeToFirstReview: number | null | string;
  timeToFirstApproval: number | null | string;
  timeToFirstCodeUpdate: number | null | string;
  totalTimeToClose: number | null | string;
};

type PRTimelineItem = {
  type: "review" | "comment";
  author: string;
  createdAt: string;
  body: string | null;
  state?: string;
};

type PRReturn = {
  number: number;
  title: string;
  url: string;
  author: string;
  assignees: string[];
  createdAt: string;
  closedAt: string | null;
  state: string;
  timeline: PRTimelineItem[];
  metrics: PRMetric;
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

async function getPRDetails(
  pr: any,
  token: string,
  res: NextApiResponse,
): Promise<PRReturn | null> {
  const prUrl: string = pr.pull_request.url;
  const prDetailsResp = await fetch(prUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${token}`,
    },
  });
  const prDetails = await prDetailsResp.json();

  if (pr.state && pr.state.toLowerCase() === "merged" && !prDetails.merged_at) {
    return null;
  }

  const reviewsUrl = `${prUrl}/reviews`;
  const reviewsResp = await fetch(reviewsUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${token}`,
    },
  });
  const reviews = await reviewsResp.json();

  const commitsUrl = `${prUrl}/commits`;
  const commitsResp = await fetch(commitsUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${token}`,
    },
  });
  const commits = await commitsResp.json();

  const commentsUrl = pr.comments_url;
  const commentsResp = await fetch(commentsUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${token}`,
    },
  });
  const issueComments = await commentsResp.json();

  if (reviews.message && reviews.message.includes("API rate limit exceeded")) {
    res.status(403).json({ error: reviews.message });

    return null;
  }

  const reviewsFormatted: PRTimelineItem[] = (reviews || []).map((r: any) => ({
    type: "review",
    author: r.user.login,
    state: r.state,
    createdAt: r.submitted_at,
    body: r.body,
  }));

  const commentsFormatted: PRTimelineItem[] = (issueComments || []).map(
    (c: any) => ({
      type: "comment",
      author: c.user.login,
      createdAt: c.created_at,
      body: c.body,
    }),
  );
  const timeline: PRTimelineItem[] = [
    ...reviewsFormatted,
    ...commentsFormatted,
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const createdAtDate = new Date(pr.created_at);
  const closedAtDate = prDetails.closed_at
    ? new Date(prDetails.closed_at)
    : null;

  const firstReview =
    reviewsFormatted.length > 0
      ? reviewsFormatted.reduce((prev, cur) =>
          new Date(cur.createdAt).getTime() < new Date(prev.createdAt).getTime()
            ? cur
            : prev,
        )
      : null;

  const timeToFirstReview = firstReview
    ? (new Date(firstReview.createdAt).getTime() - createdAtDate.getTime()) /
      1000
    : "null";

  const firstApproval = reviewsFormatted.find((r) => r.state === "APPROVED");

  const timeToFirstApproval = firstApproval
    ? (new Date(firstApproval.createdAt).getTime() - createdAtDate.getTime()) /
      1000
    : "null";

  let timeToFirstCodeUpdate: number | null | string = "null";

  if (firstReview) {
    const firstReviewTime = new Date(firstReview.createdAt);
    const commitAfterReview = (commits || []).find(
      (commit: any) =>
        new Date(commit.commit.author.date).getTime() >
        firstReviewTime.getTime(),
    );

    if (commitAfterReview) {
      timeToFirstCodeUpdate =
        (new Date(commitAfterReview.commit.author.date).getTime() -
          firstReviewTime.getTime()) /
        1000;
    }
  }

  const totalTimeToClose = closedAtDate
    ? (closedAtDate.getTime() - createdAtDate.getTime()) / 1000
    : "null";

  return {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    author: pr.user.login,
    assignees: (pr.assignees || []).map((a: any) => a.login),
    createdAt: pr.created_at,
    closedAt: prDetails.closed_at,
    state: pr.state,
    timeline,
    metrics: {
      timeToFirstReview,
      timeToFirstApproval,
      timeToFirstCodeUpdate,
      totalTimeToClose,
    },
  };
}

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
    return res
      .status(400)
      .json({ error: "Missing required date range parameters." });
  }

  const repoFromQuery =
    typeof repo === "string" && repo.trim() !== ""
      ? repo
      : process.env.GITHUB_REPO;

  if (!repoFromQuery) {
    return res.status(400).json({
      error:
        "Project repo not specified in query parameters or environment variables.",
    });
  }

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

  const headerToken = req.headers.authorization || "";
  const token = headerToken.replace(/^token\s+/i, "");

  if (!token) {
    return res
      .status(500)
      .json({ error: '{"error": "GitHub token not configured"}' });
  }

  try {
    const searchResp = await fetch(searchUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `token ${token}`,
      },
    });

    if (!searchResp.ok) {
      const err = await searchResp.json();

      return res.status(searchResp.status).json({ error: JSON.stringify(err) });
    }
    const searchData = await searchResp.json();
    const prs = searchData.items as any[];

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
