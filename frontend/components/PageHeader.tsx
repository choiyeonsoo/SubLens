import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
