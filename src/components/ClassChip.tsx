import { CLASS_BY_NAME } from "@/lib/classes";
import { Badge } from "./ui";

export default function ClassChip({ name }: { name: string }) {
  const meta = CLASS_BY_NAME[name];
  if (!meta) return <Badge>{name}</Badge>;
  const Icon = meta.icon;
  return (
    <Badge color={meta.color}>
      <Icon className="h-3.5 w-3.5" aria-hidden /> {meta.name}
    </Badge>
  );
}
