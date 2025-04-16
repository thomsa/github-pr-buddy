// pages/dashboard.tsx
import { useRouter } from "next/router";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
} from "@heroui/modal";
import React, { useState, useEffect, useRef } from "react";
import { useLoadingBar } from "react-top-loading-bar";
import useSWR from "swr";
import { parseDate } from "@internationalized/date";
import { addMonths } from "date-fns";
import { useForm } from "react-hook-form";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Spinner } from "flowbite-react";
import { Alert } from "@heroui/alert";
import { IoSettingsOutline } from "react-icons/io5";
import Link from "next/link";

import { FilterForm, FilterFormValues } from "../components/FilterForm";
import MetricsCard from "../components/MetricsCard";

import { SmallPrTile } from "@/components/SmallPRTIle";
import { fetcher } from "@/utils/fetcher";
import { formatDuration } from "@/utils/formatDuration";

export type PRReturnType = {
  number: number;
  title: string;
  url: string;
  author: string;
  assignees: string[];
  createdAt: string;
  closedAt: string | null;
  state: string;
  timeline: {
    type: "review" | "comment";
    author: string;
    createdAt: string;
    body: string | null;
    state?: string;
  }[];
  metrics: {
    timeToFirstReview: number | null;
    timeToFirstApproval: number | null;
    timeToFirstCodeUpdate: number | null;
    totalTimeToClose: number | null;
  };
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

type APIResponse = {
  total_count: number;
  pullRequests: PRReturnType[];
  authors: string[];
  aggregated: AggregatedData;
  error?: any;
};

const Dashboard: React.FC = () => {
  const router = useRouter();
  const {
    isOpen: isDrawerOpen,
    onOpen: onOpenDrawer,
    onClose: onCloseDrawer,
  } = useDisclosure();

  const { control, register, handleSubmit, setValue, getValues } = useForm({
    defaultValues: {
      dates: {
        start: parseDate(addMonths(new Date(), -1).toISOString().split("T")[0]),
        end: parseDate(new Date().toISOString().split("T")[0]),
      },
      status: "all",
      selectedAuthors: "",
      repo: "",
      perPage: 1000,
    },
  });

  const [ghToken, setGhToken] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("gh_t");

    if (storedToken) {
      setGhToken(storedToken);
    } else {
      setShowModal(true);
    }
  }, []);

  const [page, setPage] = useState<number>(1);
  const apiUrl = useRef("");
  const { data, error, mutate, isValidating, isLoading } = useSWR<APIResponse>(
    router.isReady && apiUrl.current ? [apiUrl.current] : null,
    (url) => fetcher(url as unknown as string, ghToken),
    { revalidateOnFocus: false },
  );

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

    if (!repo) {
      setShowModal(true);
    }

    if (!data) {
      if (
        localStorage.getItem("gh_t") &&
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

  const applyFilters = (formData: FilterFormValues) => {
    localStorage.setItem("gh_t", ghToken);
    const { dates, status, selectedAuthors, repo, perPage } = formData;
    const params = new URLSearchParams();

    params.append("repo", repo);
    params.append("from", dates.start?.toString().slice(0, 10) || "");
    params.append("to", dates.end?.toString().slice(0, 10) || "");
    if (status !== "all") params.append("status", status);
    if (selectedAuthors) params.append("author", selectedAuthors);
    params.append("page", page.toString());
    params.append("perPage", perPage.toString());

    apiUrl.current = `/api/prs-metrics?${params.toString()}`;
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
      { shallow: true },
    );
    onCloseDrawer();
    mutate();
  };

  const TheDrawer = () => (
    <>
      <Button
        isIconOnly
        className="fixed z-10 bottom-0 left-0"
        variant="flat"
        onClick={() => onOpenDrawer()}
      >
        <IoSettingsOutline className="h-5 w-5" />
      </Button>
      <Drawer isOpen={isDrawerOpen} placement="left" onClose={onCloseDrawer}>
        <DrawerContent>
          <DrawerHeader>Dashboard Settings</DrawerHeader>
          <DrawerBody>
            <div>
              <p className="text-tiny mb-1">
                You can create a Dashboard for your filter results.
              </p>
              <Link
                href={{
                  pathname: "/pr-browser", // your new path here
                  query: router.query, // keeps the existing query parameters
                }}
                target="_blank"
              >
                <Button className="w-full" color="default" size="sm">
                  CREATE DASHBOARD
                </Button>
              </Link>
            </div>
            <div>
              <h3 className="text-lg font-bold">GitHub Settings</h3>
              <Input
                data-1p-ignore
                isRequired
                autoComplete="off"
                description="The GH Token is stored only in your browser's local storage. We do not save it on our servers."
                label="GitHub Token"
                placeholder="Enter GitHub token"
                type="password"
                value={ghToken}
                onValueChange={(value) => setGhToken(value)}
              />
            </div>
            <FilterForm
              control={control}
              ghToken={ghToken}
              handleSubmit={handleSubmit}
              register={register}
              onSubmit={applyFilters}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );

  // Modified chart data: include the complete PR object for custom tooltip rendering
  const prepareChartData = (metricKey: keyof PRReturnType["metrics"]) => {
    return (data?.pullRequests || [])
      .filter((pr) => pr.metrics[metricKey] !== null)
      .map((pr) => ({
        name: `#${pr.number}`,
        value: pr.metrics[metricKey] as number,
        pr, // full PR object for tooltip
      }));
  };

  // Custom tooltip component that shows additional PR details
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (active && payload && payload.length) {
      const { pr } = payload[0].payload;

      return <SmallPrTile index={0} pr={pr} />;
    }

    return null;
  };

  return (
    <div className="p-4">
      <TheDrawer />
      {showModal && (
        <Modal
          hideCloseButton
          isDismissable={false}
          isKeyboardDismissDisabled={true}
          isOpen={showModal}
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              Dashboard Settings
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold">GitHub Settings</h3>
                  <Input
                    data-1p-ignore
                    autoComplete="off"
                    description="The GH Token is stored only in your browser's local storage. We do not save it on our servers."
                    label="GitHub Token"
                    placeholder="Enter GitHub token"
                    type="password"
                    value={ghToken}
                    onValueChange={(value) => setGhToken(value)}
                  />
                </div>
                <FilterForm
                  control={control}
                  ghToken={ghToken}
                  handleSubmit={handleSubmit}
                  register={register}
                  onSubmit={(data) => {
                    applyFilters(data);
                    setShowModal(false);
                  }}
                />
              </div>
              <p className="mt-4 text-xs text-gray-500">
                You can access the settings and filters on the left side in the
                future.
              </p>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {(error || data?.error) && (
        <Alert
          color="danger"
          title={
            (error && JSON.stringify(error, null, 4)) ||
            (data?.error && JSON.stringify(data?.error, null, 4))
          }
        />
      )}

      {!data && (
        <div className="w-full h-screen flex items-center justify-center">
          <Spinner />
        </div>
      )}

      {data && (
        <>
          <h3 className="font-bold text-xl">
            Pull Requests ({getValues("repo")})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
            <MetricsCard
              avg={data?.aggregated?.timeToFirstReview.average || null}
              median={data?.aggregated?.timeToFirstReview.median || null}
              title="First Review Time"
            />
            <MetricsCard
              avg={data?.aggregated?.timeToFirstApproval.average || null}
              median={data?.aggregated?.timeToFirstApproval.median || null}
              title="First Approval Time"
            />
            <MetricsCard
              avg={data?.aggregated?.timeToFirstCodeUpdate.average || null}
              median={data?.aggregated?.timeToFirstCodeUpdate.median || null}
              title="First Code Update Time"
            />
            <MetricsCard
              avg={data?.aggregated?.totalTimeToClose.average || null}
              median={data?.aggregated?.totalTimeToClose.median || null}
              title="Total Time to Close"
            />
          </div>

          <Card className="my-8">
            <CardHeader>First Review Time per PR</CardHeader>
            <Divider />
            <CardBody>
              <ResponsiveContainer height={400} width="100%">
                <BarChart data={prepareChartData("timeToFirstReview")}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatDuration(value)} />
                  <Tooltip
                    content={<CustomTooltip />}
                    trigger="click"
                    wrapperStyle={{ pointerEvents: "auto" }}
                  />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card className="my-8">
            <CardHeader>First Approval Time per PR</CardHeader>
            <Divider />
            <CardBody>
              <ResponsiveContainer height={400} width="100%">
                <BarChart data={prepareChartData("timeToFirstApproval")}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatDuration(value)} />
                  <Tooltip
                    content={<CustomTooltip />}
                    trigger="click"
                    wrapperStyle={{ pointerEvents: "auto" }}
                  />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card className="my-8">
            <CardHeader>First Code Update Time per PR</CardHeader>
            <Divider />
            <CardBody>
              <ResponsiveContainer height={400} width="100%">
                <BarChart data={prepareChartData("timeToFirstCodeUpdate")}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatDuration(value)} />
                  <Tooltip
                    content={<CustomTooltip />}
                    trigger="click"
                    wrapperStyle={{ pointerEvents: "auto" }}
                  />
                  <Bar dataKey="value" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card className="my-8">
            <CardHeader>Total Time to Close per PR</CardHeader>
            <Divider />
            <CardBody>
              <ResponsiveContainer height={400} width="100%">
                <BarChart data={prepareChartData("totalTimeToClose")}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatDuration(value)} />
                  <Tooltip
                    content={<CustomTooltip />}
                    trigger="click"
                    wrapperStyle={{ pointerEvents: "auto" }}
                  />
                  <Bar dataKey="value" fill="#d0ed57" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
