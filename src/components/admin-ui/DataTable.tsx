"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input as UiInput } from "@/components/ui/input";
import { cn } from "cn";

export interface DtColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  /** Nilai pembanding untuk sorting; tanpa ini kolom tidak bisa disort. */
  sortValue?: (row: T) => string | number;
  className?: string;
  headClassName?: string;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  rows: T[];
  columns: DtColumn<T>[];
  rowKey: (row: T) => React.Key;
  /** Search terkontrol — bila `onSearchChange` diberikan, state milik modul. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Predikat filter teks (q sudah lowercase & trim). */
  searchPredicate?: (row: T, q: string) => boolean;
  /** Kontrol tambahan di toolbar (select filter, dll) — state milik modul. */
  filters?: React.ReactNode;
  /** Konten ujung kanan toolbar (mis. total count). */
  toolbarEnd?: React.ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" } | null;
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyTitle: string;
  emptyText?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchPredicate,
  filters,
  toolbarEnd,
  initialSort = null,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  emptyTitle,
  emptyText,
  emptyAction,
  className,
}: DataTableProps<T>) {
  const isControlled = onSearchChange !== undefined;
  const [internalQuery, setInternalQuery] = React.useState("");
  const query = isControlled ? (searchValue ?? "") : internalQuery;
  const setQuery = isControlled ? onSearchChange : setInternalQuery;

  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort);
  const [perPage, setPerPage] = React.useState(pageSize);
  const [page, setPage] = React.useState(0);

  const filtered = React.useMemo(() => {
    let out = rows;
    const q = query.trim().toLowerCase();
    if (q && searchPredicate) out = out.filter((row) => searchPredicate(row, q));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const dir = sort.dir === "asc" ? 1 : -1;
        out = [...out].sort((a, b) => {
          const va = col.sortValue!(a);
          const vb = col.sortValue!(b);
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchPredicate]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * perPage;
  const view = filtered.slice(start, start + perPage);

  const handleQuery = (value: string) => {
    setQuery(value);
    setPage(0);
  };
  const handlePerPage = (value: number) => {
    setPerPage(value);
    setPage(0);
  };

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev && prev.key === key) {
        return prev.dir === "asc" ? { key, dir: "desc" } : null;
      }
      return { key, dir: "asc" };
    });
  };

  const pagerWindow = React.useMemo(() => {
    const maxButtons = 5;
    if (pageCount <= maxButtons) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    let from = Math.max(0, safePage - 2);
    const to = Math.min(pageCount - 1, from + maxButtons - 1);
    from = Math.max(0, to - maxButtons + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [pageCount, safePage]);

  const hasToolbar = Boolean(searchPlaceholder || filters || toolbarEnd);
  const rangeText =
    total === 0 ? "Menampilkan 0 dari 0" : `Menampilkan ${start + 1}\u2013${Math.min(start + perPage, total)} dari ${total}`;

  return (
    <div className={cn("admin-dt", className)}>
      {hasToolbar && (
        <div className="admin-dt-toolbar">
          {searchPlaceholder && (
            <div className="admin-dt-search">
              <Search size={16} />
              <UiInput
                type="text"
                value={query}
                onChange={(e) => handleQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-h-10 px-3 text-base md:text-sm"
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          {filters}
          {toolbarEnd && <div className="admin-dt-toolbar-end">{toolbarEnd}</div>}
        </div>
      )}

      <div className="admin-dt-shell">
        <div className="admin-dt-scroll">
          <table className="admin-dt-table">
            <thead>
              <tr>
                {columns.map((col) => {
                  const sortProps: React.ComponentProps<"th"> & { "data-sort"?: string } = col.sortValue
                    ? {
                        "data-sort": "",
                        "aria-sort":
                          sort?.key === col.key
                            ? sort.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none",
                        onClick: () => toggleSort(col.key),
                      }
                    : {};
                  return (
                    <th
                      key={col.key}
                      className={col.headClassName}
                      style={{ textAlign: col.align ?? "left" }}
                      {...sortProps}
                    >
                      {col.header}
                      {col.sortValue && (
                        <span className={cn("admin-dt-sort", sort?.key === col.key && "on")} aria-hidden="true">
                          {sort?.key === col.key ? (sort.dir === "asc" ? "\u25B2" : "\u25BC") : "\u25B4\u25BE"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {view.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="admin-dt-empty">
                      <div className="admin-dt-empty-title">{emptyTitle}</div>
                      {emptyText && <div className="admin-dt-empty-text">{emptyText}</div>}
                      {emptyAction && <div style={{ marginTop: 14 }}>{emptyAction}</div>}
                    </div>
                  </td>
                </tr>
              ) : (
                view.map((row, i) => (
                  <tr key={rowKey(row)}>
                    {columns.map((col) => (
                      <td key={col.key} className={col.className} style={{ textAlign: col.align ?? "left" }}>
                        {col.render(row, start + i)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-dt-foot">
          <span>{rangeText}</span>
          <div className="admin-dt-foot-right">
            <label className="admin-dt-per">
              <span>Per halaman</span>
              <select
                value={perPage}
                onChange={(e) => handlePerPage(Number(e.target.value) || pageSize)}
                aria-label="Baris per halaman"
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-dt-pager">
              <button type="button" onClick={() => setPage(0)} disabled={safePage === 0} aria-label="Halaman pertama">
                {"\u00AB"}
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.max(0, safePage - 1))}
                disabled={safePage === 0}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              {pagerWindow.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === safePage ? "on" : undefined}
                  onClick={() => setPage(p)}
                  aria-current={p === safePage ? "page" : undefined}
                >
                  {p + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                disabled={safePage >= pageCount - 1}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage(pageCount - 1)}
                disabled={safePage >= pageCount - 1}
                aria-label="Halaman terakhir"
              >
                {"\u00BB"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
