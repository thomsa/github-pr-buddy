import React, { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  Timeline,
  TimelineContent,
  TimelineItem,
  TimelinePoint,
  TimelineTime,
  TimelineTitle,
} from "flowbite-react";
import { Badge } from "@heroui/badge";

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

export const PRTile: React.FC<PRTileProps> = ({ pr, index }) => {
  // Helper function to determine the next pending step
  const getNextStep = (pr: PRReturn): string | null => {
    if (pr.closedAt !== null) return null;
    if (pr.metrics.timeToFirstReview === null) return "REVIEW";
    if (pr.metrics.timeToFirstCodeUpdate === null) return "CODE UPDATE";
    if (pr.metrics.timeToFirstApproval === null) return "APPROVAL";

    if (pr.closedAt === null) return "CAN BE MERGED";

    return null;
  };

  const nextStep = getNextStep(pr);

  return (
    <Card
      className={`p-5 flex flex-col relative ${getBgColor(pr)}`}
      shadow="lg"
    >
      <CardBody>
        <div className="flex justify-between items-center gap-4">
          <h2 className="text-large font-bold underline text-ellipsis">
            <a
              className="text-ellipsis"
              href={pr.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {pr.title}
            </a>
          </h2>
          <Chip
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
        <Timeline className="border pt-8 rounded ">
          <TimelineItem>
            <TimelinePoint />
            <TimelineContent>
              <TimelineTime>
                <Chip variant="bordered">Opened</Chip>
              </TimelineTime>
              <TimelineTitle className={`text-3xl ${getBgColor(pr)}`}>
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
                <TimelineTitle className={`text-3xl ${getBgColor(pr)}`}>
                  +{formatDuration(pr.metrics.timeToFirstReview)}
                </TimelineTitle>
              </TimelineContent>
            </TimelineItem>
          )}
          {pr.metrics.timeToFirstCodeUpdate !== null && (
            <TimelineItem className="pl-32">
              <TimelinePoint />
              <TimelineContent>
                <TimelineTime>
                  <Chip color="primary">First Code Update</Chip>
                </TimelineTime>
                <TimelineTitle className={`text-3xl ${getBgColor(pr)}`}>
                  +{formatDuration(pr.metrics.timeToFirstCodeUpdate)}
                </TimelineTitle>
              </TimelineContent>
            </TimelineItem>
          )}
          {pr.metrics.timeToFirstApproval !== null && (
            <TimelineItem>
              <TimelinePoint />
              <TimelineContent>
                <TimelineTime>
                  <Chip color="success">First Approval</Chip>
                </TimelineTime>
                <TimelineTitle className={`text-3xl ${getBgColor(pr)}`}>
                  +{formatDuration(pr.metrics.timeToFirstApproval)}
                </TimelineTitle>
              </TimelineContent>
            </TimelineItem>
          )}
          {pr.closedAt && (
            <TimelineItem>
              <TimelinePoint />
              <TimelineContent>
                <TimelineTime>
                  <Chip color="secondary">Closed At</Chip>
                </TimelineTime>
                <TimelineTitle className={`text-3xl ${getBgColor(pr)}`}>
                  {new Date(pr.closedAt).toLocaleString()}
                </TimelineTitle>
              </TimelineContent>
            </TimelineItem>
          )}
        </Timeline>

        {/* Render hero Chip for the next incomplete step, if any */}
        {nextStep && (
          <div className="flex justify-center my-4">
            <Badge color="danger" content="NEXT" variant="shadow">
              <Chip
                className="px-6 py-6 font-bold text-xl"
                color="default"
                size="lg"
                variant="solid"
              >
                {nextStep}
              </Chip>
            </Badge>
          </div>
        )}

        <div className="w-full flex flex-col items-center mt-4">
          <div className="flex items-center w-full">
            <span>#{index + 1}</span>
            <div className="flex-1 w-full items-center justify-items-center">
              <p className="font-bold text-xl">Total Time</p>
            </div>
          </div>
          <p className="font-extrabold text-5xl">
            {pr.metrics.totalTimeToClose !== null ? (
              formatDuration(pr.metrics.totalTimeToClose)
            ) : (
              <LiveTimer startTime={pr.createdAt} />
            )}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};
