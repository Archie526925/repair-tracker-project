import { RepairStatus, RepairPriority } from "@workspace/api-client-react";

export const STATUS_LABELS: Record<RepairStatus, string> = {
  [RepairStatus.pending]: "待處理",
  [RepairStatus.in_progress]: "處理中",
  [RepairStatus.completed]: "已完成",
};

export const PRIORITY_LABELS: Record<RepairPriority, string> = {
  [RepairPriority.low]: "低",
  [RepairPriority.medium]: "中",
  [RepairPriority.high]: "高",
};

export const STATUS_COLORS: Record<RepairStatus, string> = {
  [RepairStatus.pending]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [RepairStatus.in_progress]: "bg-blue-100 text-blue-800 border-blue-200",
  [RepairStatus.completed]: "bg-green-100 text-green-800 border-green-200",
};

export const PRIORITY_COLORS: Record<RepairPriority, string> = {
  [RepairPriority.low]: "text-gray-500",
  [RepairPriority.medium]: "text-orange-500",
  [RepairPriority.high]: "text-red-500",
};
