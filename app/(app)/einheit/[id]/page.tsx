"use client";

import { use } from "react";
import { SessionDetail } from "./session-detail";

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SessionDetail id={id} />;
}
