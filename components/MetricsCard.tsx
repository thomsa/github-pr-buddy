import React from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";

import { formatDuration } from "@/utils/formatDuration";

interface MetricsCardProps {
  title: string;
  avg: number | null;
  median: number | null;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, avg, median }) => {
  return (
    <Card className="shadow">
      <CardHeader>{title}</CardHeader>
      <Divider />
      <CardBody className="flex flex-col gap-2">
        <span className="font-bold">Median</span>
        <Chip className="mb-2" color="secondary" size="lg">
          {formatDuration(median)}
        </Chip>

        <span className="font-bold">Avg.</span>
        <Chip size="lg">{formatDuration(avg)}</Chip>
      </CardBody>
    </Card>
  );
};

export default MetricsCard;
