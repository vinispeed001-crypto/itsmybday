"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { GuestRequest } from "@/lib/types";

export function RequestsList({ initialRequests }: { initialRequests: GuestRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("requests-pending")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => {
          window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (requests.length === 0) {
    return <p className="text-muted">Nenhum pedido pendente.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => (
        <li key={request.id}>
          <Link
            href={`/admin/pedidos/${request.id}`}
            className="block rounded-card border border-border bg-surface p-4 hover:border-gold"
          >
            <p className="font-semibold text-ink">{request.requester_name}</p>
            <p className="text-sm text-muted">
              {request.event_date} · {request.quantity} pessoas · @{request.instagram}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
