import React from "react";
import { Controller } from "react-hook-form";
import { DateRangePicker } from "@heroui/date-picker";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import { NumberInput } from "@heroui/number-input";
import { Button } from "@heroui/button";

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
}) => {
  return (
    <form
      autoComplete="off"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
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
        description="You can add multiple authors by separating each GitHub handle with a semicolon (;)"
      />

      <Controller
        control={control}
        name="repo"
        render={({ field }) => (
          <Input
            label="Repository"
            placeholder="Enter a repository"
            value={field.value}
            onValueChange={(value) => field.onChange(value)}
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
  );
};
