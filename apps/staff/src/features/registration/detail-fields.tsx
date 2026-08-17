import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";

import { displayValue } from "./review-utils";

interface DetailFieldsProps {
  readonly fields: readonly { label: string; value: string | number | null | undefined }[];
  readonly title: string;
}

function DetailFields({ fields, title }: DetailFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-muted-foreground text-sm">{field.label}</dt>
            <dd className="break-words font-medium">{displayValue(field.value)}</dd>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export { DetailFields };
