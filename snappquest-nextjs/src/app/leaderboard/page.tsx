"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackToTopButton } from "@/components/BackToTopButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMedal } from "@fortawesome/free-solid-svg-icons";

type Row = string[];

const RANGE = "Form responses 3!A1:K1000";
const RATE_RANGE = "SnappQuestData!D2:D2";
const FALLBACK_RATE = 1500;

const getEnv = (key: string, fallback = "") =>
  (typeof process !== "undefined" ? (process as any).env?.[key] : undefined) ||
  fallback;

const USERNAME_COL = getEnv("NEXT_PUBLIC_SHEETS_USERNAME_COLUMN", "Username");
const NAME_COL = getEnv("NEXT_PUBLIC_SHEETS_NAME_COLUMN", "Name");
const EARNINGS_COL = getEnv(
  "NEXT_PUBLIC_SHEETS_EARNINGS_COLUMN",
  "Total Earnings"
);
const COMPLETED_COL = getEnv(
  "NEXT_PUBLIC_SHEETS_COMPLETED_COLUMN",
  "TotalQuestsCompleted"
);
const CURRENCY_SYMBOL = getEnv("NEXT_PUBLIC_CURRENCY_SYMBOL", "₦");

async function fetchSheet(): Promise<Row[]> {
  const url = `/api/sheets?type=leaderboard&range=${encodeURIComponent(RANGE)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const json = await res.json();
  return (json.values as Row[]) || [];
}

function findColumnIndex(headers: Row, name: string): number | null {
  const idx = headers.findIndex(
    (h) => h.trim().toLowerCase() === name.trim().toLowerCase()
  );
  return idx >= 0 ? idx : null;
}

function findFirstExistingIndex(headers: Row, names: string[]): number | null {
  for (const n of names) {
    const idx = findColumnIndex(headers, n);
    if (idx != null) return idx;
  }
  return null;
}

function includesAll(hay: string, subs: string[]) {
  const s = hay.toLowerCase();
  return subs.every((sub) => s.includes(sub.toLowerCase()));
}

function findByIncludes(
  headers: Row,
  mustInclude: string[],
  mustNotInclude: string[] = []
): number | null {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || "").toLowerCase();
    if (mustNotInclude.some((w) => h.includes(w.toLowerCase()))) continue;
    if (mustInclude.every((w) => h.includes(w.toLowerCase()))) return i;
  }
  return null;
}

function toNumber(val: string | undefined): number {
  const n = Number(String(val ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Currency state
  type Currency = "NGN" | "USDC";
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [usdcRate, setUsdcRate] = useState<number>(FALLBACK_RATE);

  // Fetch USDC rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch(
          `/api/sheets?type=stats&range=${encodeURIComponent(RATE_RANGE)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.values && json.values[0] && json.values[0][0]) {
            const cleanedRate = json.values[0][0]
              .toString()
              .replace(/[^0-9.]/g, "");
            const rate = parseFloat(cleanedRate) || 0;
            if (rate > 0 && !isNaN(rate)) {
              setUsdcRate(rate);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch USDC rate, using fallback:", err);
      }
    };
    fetchRate();
  }, []);

  // Format currency
  const formatCurrency = useCallback(
    (amount: number) => {
      if (currency === "USDC") {
        const usdc = amount / usdcRate;
        // Format USDC with K, M, B abbreviations
        return formatNumber(usdc, "$");
      }
      // Format NGN with K, M, B abbreviations
      return formatNumber(amount, "₦");
    },
    [currency, usdcRate]
  );

  // Format number with K, M, B abbreviations
  function formatNumber(num: number, prefix: string): string {
    const absNum = Math.abs(num);
    if (absNum >= 1_000_000_000) {
      const value = num / 1_000_000_000;
      return `${prefix}${value.toFixed(value % 1 === 0 ? 0 : 1)}B`;
    } else if (absNum >= 1_000_000) {
      const value = num / 1_000_000;
      return `${prefix}${value.toFixed(value % 1 === 0 ? 0 : 1)}M`;
    } else if (absNum >= 10_000) {
      const value = num / 1_000;
      return `${prefix}${value.toFixed(value % 1 === 0 ? 0 : 1)}K`;
    } else {
      return `${prefix}${num.toLocaleString("en-US", {
        minimumFractionDigits: prefix === "$" ? 2 : 0,
        maximumFractionDigits: prefix === "$" ? 2 : 0,
      })}`;
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchSheet();
        if (mounted) setRows(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to fetch leaderboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const table = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const [headers, ...data] = rows;

    // Debug: Log all headers
    console.log("Sheet Headers:", headers);

    // Look for Name column (vanilla uses Name or Access)
    let uIdx =
      findFirstExistingIndex(headers, [
        "Name",
        "Access",
        NAME_COL,
        USERNAME_COL,
        "Username",
      ]) ??
      findByIncludes(headers, ["name"]) ??
      findByIncludes(headers, ["user"]) ??
      null;
    if (uIdx == null) {
      // Avoid picking timestamp as a fallback
      if (
        headers.length > 1 &&
        String(headers[0]).toLowerCase().includes("time")
      )
        uIdx = 1;
      else uIdx = 0;
    }

    // Look for Total Earnings column
    const eIdx =
      findFirstExistingIndex(headers, ["Total Earnings", EARNINGS_COL]) ??
      findByIncludes(headers, ["total", "earning"]) ??
      0;

    // Look for TotalQuestsCompleted column (no spaces!)
    const cIdx =
      findFirstExistingIndex(headers, [
        "TotalQuestsCompleted",
        COMPLETED_COL,
        "Completed Quests",
        "Total Quests Completed",
      ]) ??
      findByIncludes(headers, ["totalquest"]) ??
      findByIncludes(headers, ["quest", "complet"]) ??
      null;

    console.log("Column Indices:", {
      nameIdx: uIdx,
      nameColumn: headers[uIdx],
      earningsIdx: eIdx,
      earningsColumn: headers[eIdx],
      completedIdx: cIdx,
      completedColumn: cIdx !== null ? headers[cIdx] : null,
    });

    const sorted = [...data].sort(
      (a, b) => toNumber(b[eIdx]) - toNumber(a[eIdx])
    );
    return { headers, rows: sorted, uIdx, eIdx, cIdx } as const;
  }, [rows]);

  return (
    <div className="min-h-screen">
      <section
        style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 16,
            color: "#1F2937",
          }}
        >
          <FontAwesomeIcon icon={faMedal} style={{ marginRight: 8 }} />
          SnappQuest Leaderboard
        </h1>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <a
            href="/profile"
            style={{
              background: "#6B7280",
              color: "#fff",
              textDecoration: "none",
              padding: "10px 16px",
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            Back to Profile
          </a>
        </div>

        {/* Currency Toggle */}
        <div className="currency-switch" style={{ marginBottom: "20px" }}>
          <span className="usdc-label">NGN</span>
          <input
            type="checkbox"
            id="currencyToggle"
            checked={currency === "USDC"}
            onChange={(e) => setCurrency(e.target.checked ? "USDC" : "NGN")}
          />
          <label htmlFor="currencyToggle"></label>
          <span className="ngn-label">USDC</span>
        </div>

        {loading && <p style={{ textAlign: "center" }}>Loading...</p>}
        {error && (
          <p style={{ color: "#EF4444", textAlign: "center" }}>{error}</p>
        )}

        {table && (
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(52,211,153,0.1))",
              borderRadius: 16,
              border: "1px solid rgba(0,0,0,0.06)",
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: 14,
                      background: "linear-gradient(135deg, #6366F1, #34D399)",
                      color: "#fff",
                      borderTopLeftRadius: 12,
                    }}
                  >
                    Rank
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: 14,
                      background: "linear-gradient(135deg, #6366F1, #34D399)",
                      color: "#fff",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: 14,
                      background: "linear-gradient(135deg, #6366F1, #34D399)",
                      color: "#fff",
                    }}
                  >
                    Total Earnings
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: 14,
                      background: "linear-gradient(135deg, #6366F1, #34D399)",
                      color: "#fff",
                      borderTopRightRadius: 12,
                    }}
                  >
                    Total Quests Completed
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr
                    key={i}
                    style={{
                      background:
                        i % 2
                          ? "rgba(243,244,246,0.8)"
                          : "rgba(255,255,255,0.8)",
                    }}
                  >
                    <td
                      style={{
                        padding: 14,
                        fontWeight: 700,
                        color: "#34D399",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td style={{ padding: 14 }}>
                      {r[table.uIdx] || "Unknown"}
                    </td>
                    <td style={{ padding: 14 }}>
                      {formatCurrency(toNumber(r[table.eIdx]))}
                    </td>
                    <td style={{ padding: 14 }}>
                      {table.cIdx != null ? toNumber(r[table.cIdx]) : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <BackToTopButton />
    </div>
  );
}
