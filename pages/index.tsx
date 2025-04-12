import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";
import { FaGithub } from "react-icons/fa";
import { Masonry } from "@mui/lab";

import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import { PRTile, PRReturn } from "@/components/PRTile";

export default function IndexPage() {
  // Create three mock PR data objects
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tenHoursAgo = new Date(now.getTime() - 13 * 60 * 60 * 1000);

  const mockPRs: PRReturn[] = [
    {
      number: 101,
      title: "Fix bug in login flow",
      url: "https://github.com/owner/repo/pull/101",
      author: "alice",
      assignees: ["bob"],
      createdAt: twoDaysAgo.toISOString(),
      closedAt: null,
      state: "open",
      timeline: [],
      metrics: {
        timeToFirstReview: 3600,
        timeToFirstApproval: 7200,
        timeToFirstCodeUpdate: 1800,
        totalTimeToClose: null,
      },
    },

    {
      number: 102,
      title: "Improve documentation",
      url: "https://github.com/owner/repo/pull/103",
      author: "charlie",
      assignees: ["alice"],
      createdAt: tenHoursAgo.toISOString(),
      closedAt: null,
      state: "open",
      timeline: [],
      metrics: {
        timeToFirstReview: null,
        timeToFirstApproval: null,
        timeToFirstCodeUpdate: null,
        totalTimeToClose: null,
      },
    },
    {
      number: 103,
      title: "Add feature XYZ",
      url: "https://github.com/owner/repo/pull/102",
      author: "bob",
      assignees: ["charlie"],
      createdAt: oneDayAgo.toISOString(),
      closedAt: now.toISOString(),
      state: "closed",
      timeline: [],
      metrics: {
        timeToFirstReview: 1800,
        timeToFirstApproval: 3600,
        timeToFirstCodeUpdate: 2400,
        totalTimeToClose: 7200,
      },
    },
  ];

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        {/* Hero Icon */}
        <div className="flex flex-col items-center">
          <FaGithub className="text-gray-800" size={80} />
        </div>

        {/* Product Title and Description */}
        <div className="inline-block max-w-xl text-center">
          <span className={title()}>GitHub </span>
          <span className={title({ color: "violet" })}>PR Buddy</span>
          <p className={subtitle({ class: "mt-4" })}>
            The ultimate <strong>dashboard</strong> to monitor your GitHub pull
            requests.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6  flex-col">
          <div className="flex  gap-3  md:flex-row flex-col">
            <Link
              className={buttonStyles({
                color: "primary",
                radius: "full",
                variant: "shadow",
              })}
              href="/pr-browser"
            >
              Create your Dashboard
            </Link>
            <Link
              className={buttonStyles({
                color: "secondary",
                radius: "full",
                variant: "shadow",
              })}
              href="/dashboard"
            >
              Check out your Metrics
            </Link>
          </div>
          <Link
            isExternal
            className={buttonStyles({ variant: "bordered", radius: "full" })}
            href={"https://github.com/thomsa/github-pr-buddy"}
          >
            <GithubIcon size={20} />
            GitHub
          </Link>
        </div>
      </section>

      {/* Mock PR Tiles Section */}

      <Masonry
        sequential
        className="min-h-screen"
        columns={{ xs: 1, md: 2, lg: 3 }}
      >
        {mockPRs.map((pr, index) => (
          <PRTile key={pr.number} index={index} pr={pr} />
        ))}
      </Masonry>
    </DefaultLayout>
  );
}
