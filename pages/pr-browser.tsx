import { useRouter } from "next/router";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Timeline,
  TimelineContent,
  TimelineItem,
  TimelinePoint,
  TimelineTime,
  TimelineTitle,
  Drawer,
  DrawerHeader,
  DrawerItems,
} from "flowbite-react";
import React, { useState, useEffect, useRef } from "react";
import { PiCaretRightThin, PiGithubLogo } from "react-icons/pi";
import { useLoadingBar } from "react-top-loading-bar";
import { Masonry } from "@mui/lab";
import useSWR from "swr";
import { DateRangePicker } from "@heroui/date-picker";
import { parseDate } from "@internationalized/date";
import { addMonths } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { Card, CardBody } from "@heroui/card";
import { NumberInput } from "@heroui/number-input";

type PRMetric = {
  timeToFirstReview: number | null;
  timeToFirstApproval: number | null;
  timeToFirstCodeUpdate: number | null;
  totalTimeToClose: number | null;
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

type PRResponse = {
  error?: any;
  total_count: number;
  pullRequests: PRReturn[];
  authors: string[];
};

const formatDuration = (seconds: number | null): string => {
  if (seconds === null) return "N/A";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];

  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
};

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

const getBgColor = (pr: PRReturn): string => {
  if (pr.state !== "open" || pr.closedAt !== null) return "";
  const createdTime = new Date(pr.createdAt).getTime();
  const now = Date.now();
  const elapsedHours = (now - createdTime) / (3600 * 1000);

  if (elapsedHours > 36) return "bg-red-600 text-white";
  if (elapsedHours > 12) return "bg-orange-300";

  return "";
};

// Use the stored token from sessionStorage in the fetcher.
const fetcher = (url: string, githubToken: string) =>
  fetch(url, {
    headers: {
      ...(githubToken
        ? { Authorization: `token ${githubToken.replace('"', "")}` }
        : {}),
    },
  }).then((res) => res.json());

const PRBrowser: React.FC = () => {
  const router = useRouter();
  // Create a form for filter controls only
  const { control, register, handleSubmit, setValue, getValues } = useForm({
    defaultValues: {
      dates: {
        start: parseDate(addMonths(new Date(), -1).toISOString().split("T")[0]),
        end: parseDate(new Date().toISOString().split("T")[0]),
      },
      status: "all",
      selectedAuthors: "",
      repo: "owner/repo",
      perPage: 6,
    },
  });

  const [ghToken, setGhToken] = useState<string>("");

  useEffect(() => {
    const storedToken = sessionStorage.getItem("gh_t");

    if (storedToken) {
      setGhToken(storedToken);
    }
  }, []);

  // Use session storage for the GitHub token

  const [page, setPage] = useState<number>(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const apiUrl = useRef("");
  const [refreshInterval, setRefreshInterval] = useState(120000);
  const { data, error, mutate, isValidating, isLoading } = useSWR<PRResponse>(
    router.isReady && apiUrl.current ? [apiUrl.current] : null,
    (url) => fetcher(url as any, ghToken || ""),
    { refreshInterval }
  );

  useEffect(() => {
    if (data?.error) {
      setRefreshInterval(6000000);
    } else {
      setRefreshInterval(120000);
    }
  }, [data]);

  const { start, complete } = useLoadingBar({ color: "blue", height: 2 });

  useEffect(() => {
    if (isValidating || isLoading) start();
    else complete();
  }, [isValidating, isLoading]);

  useEffect(() => {
    if (!router.isReady) return;
    const {
      from,
      to,
      status: qsStatus,
      author,
      page: qsPage,
      repo,
      perPage,
    } = router.query;

    if (from) setValue("dates.start", parseDate(from as string));
    if (to) setValue("dates.end", parseDate(to as string));
    if (qsStatus) setValue("status", qsStatus as string);
    if (author) setValue("selectedAuthors", author as string);
    if (repo) setValue("repo", repo as string);
    if (perPage) setValue("perPage", parseInt(perPage as string, 10));
    if (qsPage) setPage(parseInt(qsPage as string, 10));

    if (!data) {
      if (
        sessionStorage.getItem("gh_t") &&
        getValues("dates.start") &&
        getValues("dates.end") &&
        getValues("status") &&
        getValues("repo") &&
        getValues("perPage")
      ) {
        applyFilters(getValues());
      }
    }
  }, [router.isReady, setValue]);

  const applyFilters = (formData: {
    dates: { start: any; end: any };
    status: string;
    selectedAuthors: string;
    repo: string;
    perPage: number;
  }) => {
    sessionStorage.setItem("gh_t", ghToken);
    const { dates, status, selectedAuthors, repo, perPage } = formData;
    const params = new URLSearchParams();

    params.append("repo", repo);
    params.append("from", dates.start?.toString().slice(0, 10) || "");
    params.append("to", dates.end?.toString().slice(0, 10) || "");
    if (status !== "all") params.append("status", status);
    if (selectedAuthors) params.append("author", selectedAuthors);
    params.append("page", page.toString());
    params.append("perPage", perPage.toString());

    apiUrl.current = `/api/prs?${params.toString()}`;
    router.push(
      {
        pathname: router.pathname,
        query: {
          repo,
          from: dates.start?.toString().slice(0, 10),
          to: dates.end?.toString().slice(0, 10),
          status,
          author: selectedAuthors,
          page: page.toString(),
          perPage: perPage.toString(),
        },
      },
      undefined,
      { shallow: true }
    );
    setIsDrawerOpen(false);
    mutate();
  };

  const statuses = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
    { value: "merged", label: "Merged" },
  ];

  const TheDrawer = () => (
    <>
      <Button
        isIconOnly
        className="fixed z-10 top-1/2 left-0 transform -translate-y-1/2"
        variant="light"
        onClick={() => setIsDrawerOpen(true)}
      >
        <PiCaretRightThin className="h-6 w-6" />
      </Button>
      <Drawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <DrawerHeader
          title="Filter & GitHub Settings"
          titleIcon={PiGithubLogo}
        />
        <DrawerItems>
          {/* Github Settings Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2">Github Settings</h3>
            <Input
              data-1p-ignore
              autoComplete="off"
              label="GitHub Token"
              placeholder="Enter GitHub token"
              type="password"
              value={ghToken}
              onValueChange={(value) => {
                setGhToken(value);
              }}
            />
            <p>
              The GH Token is stored only in your browser&apos;s session
              storage. We do not save it on our servers.
            </p>
          </div>

          {/* Filter Controls Section */}
          <form
            autoComplete="off"
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(applyFilters)}
          >
            <h3 className="text-lg font-bold">Filter Controls</h3>
            <Controller
              control={control}
              name="dates"
              render={({ field }) => (
                <DateRangePicker
                  label="Date range"
                  value={field.value}
                  visibleMonths={3}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  defaultSelectedKeys={[field.value]}
                  label="Status"
                  placeholder="Select Status"
                  value={field.value}
                  onChange={field.onChange}
                >
                  {statuses.map((s) => (
                    <SelectItem key={s.value}>{s.label}</SelectItem>
                  ))}
                </Select>
              )}
            />

            <Input
              label="Authors"
              placeholder="Select Author(s)"
              {...register("selectedAuthors")}
            />

            <Controller
              control={control}
              name="repo"
              render={({ field }) => (
                <Input
                  label="Repository"
                  placeholder="Enter a repository"
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
                />
              )}
            />

            <Controller
              control={control}
              name="perPage"
              render={({ field }) => (
                <NumberInput
                  label="Results per Page"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <Button type="submit">Apply Filters</Button>
          </form>
        </DrawerItems>
      </Drawer>
    </>
  );

  return (
    <div>
      <TheDrawer />
      {error ||
        (data?.error && (
          <pre className="max-w-full whitespace-pre-wrap">
            {error && JSON.stringify(JSON.parse(error), null, 4)}
            {data?.error && JSON.stringify(JSON.parse(data?.error), null, 4)}
          </pre>
        ))}
      <Masonry sequential className="min-h-screen" columns={3}>
        {(data?.pullRequests ?? []).map((pr, index) => (
          <Card
            key={pr.number}
            className={` p-5 flex flex-col relative ${getBgColor(pr)}`}
          >
            <CardBody>
              <div className="flex justify-between items-center">
                <h2 className="text-large font-bold underline">
                  <a href={pr.url} rel="noopener noreferrer" target="_blank">
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
              <Timeline className=" border pt-8 rounded">
                <TimelineItem>
                  <TimelinePoint />
                  <TimelineContent>
                    <TimelineTime>
                      <Chip variant="bordered">Opened</Chip>
                    </TimelineTime>
                    <TimelineTitle className="text-3xl">
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
                      <TimelineTitle className="text-3xl">
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
                      <TimelineTitle className="text-3xl">
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
                      <TimelineTitle className="text-3xl">
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
                      <TimelineTitle className="text-3xl">
                        {new Date(pr.closedAt).toLocaleString()}
                      </TimelineTitle>
                    </TimelineContent>
                  </TimelineItem>
                )}
              </Timeline>
              <div className="flex-1" />
              <div className="w-full flex flex-col items-center mt-4">
                <div className="flex items-center w-full">
                  <span>#{index + 1}</span>
                  <div className=" flex-1 w-full items-center justify-items-center">
                    <p className="font-bold text-xl">Total Time</p>
                  </div>
                </div>
                <p className={`font-extrabold text-5xl`}>
                  {pr.metrics.totalTimeToClose !== null ? (
                    formatDuration(pr.metrics.totalTimeToClose)
                  ) : (
                    <LiveTimer startTime={pr.createdAt} />
                  )}
                </p>
              </div>
            </CardBody>
          </Card>
        ))}
      </Masonry>
      <div className="w-full flex justify-center mt-4">
        <div>
          <Button
            disabled={page <= 1}
            onClick={() => setPage(page > 1 ? page - 1 : 1)}
          >
            Previous
          </Button>
          <span style={{ margin: "0 1rem" }}>Page {page}</span>
          <Button onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default PRBrowser;
