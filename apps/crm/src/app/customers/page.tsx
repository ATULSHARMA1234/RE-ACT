"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import { Search, Upload, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import Link from "next/link";

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

const LIFECYCLE_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "DORMANT", label: "Dormant" },
  { value: "NEW", label: "New" },
];

const RFM_OPTIONS = [
  { value: "HIGH_VALUE", label: "High Value" },
  { value: "MID_TIER", label: "Mid Tier" },
  { value: "LOW_VALUE", label: "Low Value" },
];

const CHANNEL_OPTIONS = [
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SMS", label: "SMS" },
];

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

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [lifecycle, setLifecycle] = useState("");
  const [rfm, setRfm] = useState("");
  const [channel, setChannel] = useState("");

  const activeFilterCount = [lifecycle, rfm, channel].filter(Boolean).length;

  const fetchCustomers = useCallback(
    async (page: number, searchQuery: string, lc: string, rfmVal: string, ch: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (searchQuery) params.set("search", searchQuery);
        if (lc) params.set("lifecycle", lc);
        if (rfmVal) params.set("rfm", rfmVal);
        if (ch) params.set("channel", ch);

        const res = await fetch(`/api/customers?${params.toString()}`);
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
    fetchCustomers(1, "", "", "", "");
  }, [fetchCustomers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(1, search, lifecycle, rfm, channel);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, lifecycle, rfm, channel, fetchCustomers]);

  const clearFilters = () => {
    setLifecycle("");
    setRfm("");
    setChannel("");
  };

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
        fetchCustomers(pagination.page, search, lifecycle, rfm, channel);
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
      {/* Header with search, filters, and upload */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-4">
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-body font-medium transition-all ${
                showFilters || activeFilterCount > 0
                  ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                  : "border-border hover:bg-surface-panel text-text-secondary"
              }`}
            >
              <Filter size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-brand-blue text-white text-[11px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
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

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-surface-card border border-border rounded-lg p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-small font-semibold text-text-secondary uppercase tracking-wide">Filter Customers</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-small text-brand-coral font-medium hover:underline">
                  <X size={12} /> Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Lifecycle Filter */}
              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">Lifecycle Stage</label>
                <select
                  value={lifecycle}
                  onChange={(e) => setLifecycle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-body bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="">All Stages</option>
                  {LIFECYCLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* RFM Filter */}
              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">RFM Score</label>
                <select
                  value={rfm}
                  onChange={(e) => setRfm(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-body bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="">All Scores</option>
                  {RFM_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Channel Filter */}
              <div>
                <label className="block text-small font-medium text-text-secondary mb-1.5">Channel Preference</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-body bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="">All Channels</option>
                  {CHANNEL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                {lifecycle && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-small font-medium">
                    {LIFECYCLE_OPTIONS.find(o => o.value === lifecycle)?.label}
                    <button onClick={() => setLifecycle("")} className="hover:bg-brand-blue/20 rounded-full p-0.5"><X size={12} /></button>
                  </span>
                )}
                {rfm && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-green/10 text-brand-green rounded-full text-small font-medium">
                    {RFM_OPTIONS.find(o => o.value === rfm)?.label}
                    <button onClick={() => setRfm("")} className="hover:bg-brand-green/20 rounded-full p-0.5"><X size={12} /></button>
                  </span>
                )}
                {channel && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-small font-medium">
                    {CHANNEL_OPTIONS.find(o => o.value === channel)?.label}
                    <button onClick={() => setChannel("")} className="hover:bg-purple-200 rounded-full p-0.5"><X size={12} /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
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
                    {activeFilterCount > 0 ? "No customers match the selected filters" : "No customers found"}
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 hover:bg-surface-panel/30 transition-colors group"
                  >
                    <td className="px-6 py-4 text-body font-medium">
                      <Link href={`/customers/${c.id}`} className="text-text-primary hover:text-brand-blue group-hover:underline">
                        {c.name}
                      </Link>
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
                  fetchCustomers(pagination.page - 1, search, lifecycle, rfm, channel)
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
                  fetchCustomers(pagination.page + 1, search, lifecycle, rfm, channel)
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
