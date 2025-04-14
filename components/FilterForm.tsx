import React, { useEffect } from "react";
import { useWatch, Controller } from "react-hook-form";
import { DateRangePicker } from "@heroui/date-picker";
import { Select, SelectItem, SelectSection } from "@heroui/select";
import { Input } from "@heroui/input";
import { NumberInput } from "@heroui/number-input";
import { Button } from "@heroui/button";
import useSWR from "swr";

import { fetcher } from "@/utils/fetcher";

type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
};

type Data = { repos: Record<string, GitHubRepo[]> };

export type FilterFormValues = {
  dates: { start: any; end: any };
  status: string;
  selectedAuthors: string;
  repo: string;
  perPage: number;
};

interface FilterFormProps {
  onSubmit: (data: FilterFormValues) => void;
  control: any;
  register: any;
  handleSubmit: (
    fn: (data: FilterFormValues) => void,
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  ghToken: string;
}

const statuses = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "merged", label: "Merged" },
];

export const FilterForm: React.FC<FilterFormProps> = ({
  onSubmit,
  control,
  register,
  handleSubmit,
  ghToken,
}) => {
  // useWatch retrieves the current value of the repo field from the form
  const repoValue = useWatch({ control, name: "repo" });

  const { data, isLoading, mutate, isValidating } = useSWR<Data>(
    ghToken ? "/api/my-repos" : null,
    (url: string) => fetcher(url, ghToken || ""),
    { revalidateOnFocus: false, errorRetryCount: 0 },
  );

  useEffect(() => {
    mutate();
  }, [ghToken]);

  return (
    <form
      autoComplete="off"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* Repository select field set up with grouped options */}

      <Controller
        control={control}
        name="repo"
        render={({ field }) => (
          <Select
            description="You can either select from the dropdown or type manually to the input below."
            isLoading={isLoading || isValidating}
            label="Repository"
            labelPlacement="outside"
            placeholder="Select a repository"
            selectedKeys={[field.value]}
            onChange={(event) => field.onChange(event.target.value)}
          >
            {data
              ? Object.entries(data.repos).map(([groupName, repos]) => (
                  <SelectSection key={groupName} showDivider title={groupName}>
                    {repos?.map((repo) => (
                      <SelectItem key={repo.name} textValue={repo.name}>
                        <p>{repo.name}</p>
                        <p className="text-tiny text-slate-400">
                          {repo.description}
                        </p>
                      </SelectItem>
                    ))}
                  </SelectSection>
                ))
              : null}
          </Select>
        )}
        rules={{ required: "Repository is required" }}
      />

      <Controller
        control={control}
        name="repo"
        render={({ field, fieldState: { error } }) => (
          <Input
            isRequired
            errorMessage={error ? error.message : undefined}
            label="Repository"
            placeholder="owner/repo"
            value={field.value}
            onValueChange={(value) => field.onChange(value)}
          />
        )}
        rules={{ required: "Repository is required" }}
      />

      <h3 className="text-lg font-bold">Filters</h3>
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
        description="You can add multiple authors by separating each GitHub handle with a semicolon (;)"
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

      <Button
        isDisabled={!ghToken || !repoValue || !repoValue.trim()}
        type="submit"
      >
        Apply Filters
      </Button>
    </form>
  );
};
