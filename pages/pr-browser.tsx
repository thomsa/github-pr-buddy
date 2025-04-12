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
import { PiCaretRightThin } from "react-icons/pi";
import { useLoadingBar } from "react-top-loading-bar";
import { Masonry } from "@mui/lab";
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

import { FilterForm, FilterFormValues } from "../components/FilterForm";
import { PRTile, PRReturn } from "../components/PRTile";

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

type PRReturnType = {
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
  pullRequests: PRReturnType[];
  authors: string[];
};

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
      perPage: 6,
    },
  });

  const [ghToken, setGhToken] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);

  // Check for GitHub token in sessionStorage on mount
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
  const [refreshInterval, setRefreshInterval] = useState(120000);
  const { data, error, mutate, isValidating, isLoading } = useSWR<PRResponse>(
    router.isReady && apiUrl.current ? [apiUrl.current] : null,
    (url) => fetcher(url as unknown as string, ghToken || ""),
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
    // Save token to sessionStorage on every filter application
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
    onCloseDrawer();
    mutate();
  };

  const TheDrawer = () => (
    <>
      <Button
        isIconOnly
        className="fixed z-10 top-1/2 left-0 transform -translate-y-1/2"
        variant="light"
        onClick={() => onOpenDrawer()}
      >
        <PiCaretRightThin className="h-6 w-6" />
      </Button>
      <Drawer isOpen={isDrawerOpen} placement="left" onClose={onCloseDrawer}>
        <DrawerContent>
          <DrawerHeader>Dashboard Settings</DrawerHeader>
          <DrawerBody>
            {/* GitHub Settings Section */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">Github Settings</h3>
              <Input
                data-1p-ignore
                autoComplete="off"
                description="The GH Token is stored only in your browser's local storage. We do not save it on our servers."
                label="GitHub Token"
                placeholder="Enter GitHub token"
                isRequired
                type="password"
                value={ghToken}
                onValueChange={(value) => setGhToken(value)}
              />
            </div>
            <FilterForm
              ghToken={ghToken}
              control={control}
              handleSubmit={handleSubmit}
              register={register}
              onSubmit={applyFilters}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );

  return (
    <div>
      <TheDrawer />
      {/* Modal shown on first load if no GitHub token is present */}
      {showModal && (
        <Modal
          hideCloseButton
          isDismissable={false}
          isKeyboardDismissDisabled={true}
          isOpen={showModal}
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              Dashboard Settings
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                {/* GitHub Settings Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2">Github Settings</h3>
                  <Input
                    data-1p-ignore
                    autoComplete="off"
                    description="The GH Token is stored only in your browser's local storage. We do not save it on our servers."
                    label="GitHub Token"
                    placeholder="Enter GitHub token"
                    isRequired
                    type="password"
                    value={ghToken}
                    onValueChange={(value) => setGhToken(value)}
                  />
                </div>
                <FilterForm
                  ghToken={ghToken}
                  control={control}
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
        <pre className="max-w-full whitespace-pre-wrap">
          {error && JSON.stringify(error, null, 4)}
          {data?.error && JSON.stringify(data?.error, null, 4)}
        </pre>
      )}
      <Masonry
        sequential
        className="min-h-screen"
        columns={{ xs: 1, md: 2, lg: 3 }}
      >
        {(data?.pullRequests ?? []).map((pr: PRReturn, index: number) => (
          <PRTile key={pr.number} index={index} pr={pr} />
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
