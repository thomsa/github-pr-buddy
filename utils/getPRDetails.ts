import { logger } from "./logger";

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

export type PRReturn = {
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

export async function getPRDetails(
  pr: any,
  token: string,
  res: any,
): Promise<PRReturn | null> {
  const prUrl: string = pr.pull_request.url;

  logger.debug(`Fetching PR details from ${prUrl}`);
  const prDetailsResp = await fetch(prUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${token}`,
    },
  });
  const prDetails = await prDetailsResp.json();

  // Check for merged status inconsistencies
  if (
    typeof status === "string" &&
    status.toLowerCase() === "merged" &&
    !prDetails.merged_at
  ) {
    logger.warn(
      `PR ${pr.number} marked as merged but no merged_at date found.`,
    );

    return null;
  }

  // Fetch reviews
  const reviewsUrl = `${prUrl}/reviews`;

  logger.debug(`Fetching reviews from ${reviewsUrl}`);
  const reviewsResp = await fetch(reviewsUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${token}`,
    },
  });
  const reviews = await reviewsResp.json();

  // Fetch commits
  const commitsUrl = `${prUrl}/commits`;

  logger.debug(`Fetching commits from ${commitsUrl}`);
  const commitsResp = await fetch(commitsUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${token}`,
    },
  });
  const commits = await commitsResp.json();

  // Fetch comments
  const commentsUrl = pr.comments_url;

  logger.debug(`Fetching issue comments from ${commentsUrl}`);
  const commentsResp = await fetch(commentsUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${token}`,
    },
  });
  const issueComments = await commentsResp.json();

  if (reviews.message && reviews.message.includes("rate limit")) {
    logger.warn(`Rate limit reached when fetching reviews: ${reviews.message}`);
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

  let timeToFirstCodeUpdate: number | null = null;

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

  logger.info(`PR ${pr.number} details fetched successfully.`);

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
