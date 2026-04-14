"use client";

import { motion } from "framer-motion";

interface GaugeProps {
  percent: number;
  height?: string;
  delay?: number;
}

export default function Gauge({ percent, height = "h-2", delay = 0 }: GaugeProps) {
  const color =
    percent > 70 ? "bg-success" : percent > 40 ? "bg-warning" : "bg-danger";

  return (
    <div className={`w-full bg-border-light rounded-full ${height}`}>
      <motion.div
        className={`${height} rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.6, ease: "easeOut", delay }}
      />
    </div>
  );
}
