"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import { Search, Upload, ChevronLeft, ChevronRight } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  channel_pref: string;
  lifecycle_stage: string;
  rfm_score: string | null;
  created_at: string;
  orders: { created_at: string; product_name: string }[];
  _count: { orders: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function getRfmBadgeVariant(
  score: string | null
): "high-value" | "mid-tier" | "low-value" {
  if (score === "HIGH_VALUE") return "high-value";
  if (score === "MID_TIER") return "mid-tier";
  return "low-value";
}

function getLifecycleBadgeVariant(
  stage: string
): "active" | "at-risk" | "dormant" | "new" {
  if (stage === "ACTIVE") return "active";
  if (stage === "AT_RISK") return "at-risk";
  if (stage === "DORMANT") return "dormant";
  return "new";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchCustomers = useCallback(
    async (page: number, searchQuery: string) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/customers?page=${page}&limit=20&search=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        setCustomers(data.customers);
        setPagination(data.pagination);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCustomers(1, "");
  }, [fetchCustomers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchCustomers]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/customers/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        fetchCustomers(pagination.page, search);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <AppShell>
      {/* Header with search and upload */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-card border border-border rounded-lg text-body placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <label>
            <Button
              variant="secondary"
              icon={<Upload size={16} />}
              loading={uploading}
              onClick={() =>
                document.getElementById("csv-upload")?.click()
              }
            >
              Upload CSV
            </Button>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-surface-card border border-border rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-panel/50">
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                  Channel
                </th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                  RFM Score
                </th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                  Lifecycle
                </th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                  Orders
                </th>
                <th className="text-left text-small font-semibold text-text-secondary px-6 py-3 uppercase tracking-wide">
                  Last Purchase
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 skeleton rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-text-secondary text-body"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 hover:bg-surface-panel/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-body font-medium">
                      {c.name}
                    </td>
                    <td className="px-6 py-4 text-body text-text-secondary">
                      {c.email}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge variant="new">{c.channel_pref}</StatusBadge>
                    </td>
                    <td className="px-6 py-4">
                      {c.rfm_score && (
                        <StatusBadge variant={getRfmBadgeVariant(c.rfm_score)}>
                          {c.rfm_score.replace("_", " ")}
                        </StatusBadge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        variant={getLifecycleBadgeVariant(c.lifecycle_stage)}
                      >
                        {c.lifecycle_stage.replace("_", " ")}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-body text-text-secondary">
                      {c._count.orders}
                    </td>
                    <td className="px-6 py-4 text-body text-text-secondary">
                      {c.orders[0]
                        ? formatDate(c.orders[0].created_at)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-small text-text-secondary">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} customers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  fetchCustomers(pagination.page - 1, search)
                }
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-border hover:bg-surface-panel disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-body font-medium px-3">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  fetchCustomers(pagination.page + 1, search)
                }
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-border hover:bg-surface-panel disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
