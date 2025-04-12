import React, { useEffect, useState } from "react";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  Timeline,
  TimelineContent,
  TimelineItem,
  TimelinePoint,
  TimelineTime,
  TimelineTitle,
} from "flowbite-react";
import { formatDuration } from "@/utils/formatDuration";

// Type definitions matching your PR data
export type PRMetric = {
  timeToFirstReview: number | null;
  timeToFirstApproval: number | null;
  timeToFirstCodeUpdate: number | null;
  totalTimeToClose: number | null;
};

export type PRTimelineItem = {
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

interface PRTileProps {
  pr: PRReturn;
  index: number;
}

// A live timer component for ongoing PRs
const LiveTimer: React.FC<{ startTime: string }> = ({ startTime }) => {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    const updateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();

      setElapsed(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="whitespace-nowrap z-10">{formatDuration(elapsed)}</span>
  );
};

// Determine the background color based on PR status and elapsed time
const getBgColor = (pr: PRReturn): string => {
  if (pr.state !== "open" || pr.closedAt !== null) return "";
  const createdTime = new Date(pr.createdAt).getTime();
  const now = Date.now();
  const elapsedHours = (now - createdTime) / (3600 * 1000);

  if (elapsedHours > 36) return "bg-red-700 text-white";
  if (elapsedHours > 12) return "bg-yellow-500 text-white";

  return "";
};

export const SmallPrTile: React.FC<PRTileProps> = ({ pr }) => {
  return (
    <Card
      className={`flex flex-col relative ${getBgColor(pr)} z-50  h-[350px] text-sm pointer-events-auto`}
    >
      <CardBody>
        <div className="flex justify-between items-center gap-3">
          <h2 className=" font-bold underline">
            <a href={pr.url} rel="noopener noreferrer" target="_blank">
              {pr.title}
            </a>
          </h2>
          <Chip
            size="sm"
            color={
              pr.state === "open"
                ? "warning"
                : pr.state === "closed"
                  ? "primary"
                  : "danger"
            }
          >
            {pr.state}
          </Chip>
        </div>
        <p>
          #{pr.number} by <b>{pr.author}</b>
        </p>
        <Timeline className="border rounded ">
          <TimelineItem className="mb-0">
            <TimelinePoint />
            <TimelineContent>
              <TimelineTime>
                <Chip variant="bordered">Opened</Chip>
              </TimelineTime>
              <TimelineTitle className={` ${getBgColor(pr)}`}>
                {new Date(pr.createdAt).toLocaleString()}
              </TimelineTitle>
            </TimelineContent>
          </TimelineItem>
          {pr.metrics.timeToFirstReview !== null && (
            <TimelineItem className="mb-0">
              <TimelinePoint />
              <TimelineContent>
                <TimelineTime>
                  <Chip color="primary" variant="bordered">
                    First Review
                  </Chip>
                </TimelineTime>
                <TimelineTitle className={` ${getBgColor(pr)}`}>
                  +{formatDuration(pr.metrics.timeToFirstReview)}
                </TimelineTitle>
              </TimelineContent>
            </TimelineItem>
          )}
          {pr.metrics.timeToFirstCodeUpdate !== null && (
            <TimelineItem className="pl-32 mb-0">
              <TimelinePoint />
              <TimelineContent>
                <TimelineTime>
                  <Chip color="primary">First Code Update</Chip>
                </TimelineTime>
                <TimelineTitle className={`${getBgColor(pr)}`}>
                  +{formatDuration(pr.metrics.timeToFirstCodeUpdate)}
                </TimelineTitle>
              </TimelineContent>
            </TimelineItem>
          )}
          {pr.metrics.timeToFirstApproval !== null && (
            <TimelineItem className="mb-0">
              <TimelinePoint />
              <TimelineContent>
                <TimelineTime>
                  <Chip color="success">First Approval</Chip>
                </TimelineTime>
                <TimelineTitle className={` ${getBgColor(pr)}`}>
                  +{formatDuration(pr.metrics.timeToFirstApproval)}
                </TimelineTitle>
              </TimelineContent>
            </TimelineItem>
          )}
          {pr.closedAt && (
            <TimelineItem className="mb-0">
              <TimelinePoint />
              <TimelineContent>
                <TimelineTime>
                  <Chip color="secondary">Closed At</Chip>
                </TimelineTime>
                <TimelineTitle className={` ${getBgColor(pr)}`}>
                  {new Date(pr.closedAt).toLocaleString()}
                </TimelineTitle>
              </TimelineContent>
            </TimelineItem>
          )}
        </Timeline>
        <div className="flex-1" />
        <div className="w-full flex flex-col items-center mt-4">
          <div className="flex items-center w-full">
            <div className="flex-1 w-full items-center justify-items-center">
              <p className="font-bold ">Total Time</p>
            </div>
          </div>
          <p className="font-extrabold ">
            {pr.metrics.totalTimeToClose !== null ? (
              formatDuration(pr.metrics.totalTimeToClose)
            ) : (
              <LiveTimer startTime={pr.createdAt} />
            )}
          </p>
        </div>
        <CardFooter>
          <p>Dismiss by clicking Esc</p>
        </CardFooter>
      </CardBody>
    </Card>
  );
};
