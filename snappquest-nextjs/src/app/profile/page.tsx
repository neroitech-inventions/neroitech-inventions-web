"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackToTopButton } from "@/components/BackToTopButton";
import { QuestCard } from "@/components/QuestCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUnlock, faCheckDouble } from "@fortawesome/free-solid-svg-icons";

// Configuration
const CONFIG = {
  STATS_RANGE: "SnappQuestData!A1:C2",
  RATE_RANGE: "SnappQuestData!D2:D2",
  QUESTS_RANGE: "Quests!A1:G100",
  QUANTITY_RANGE: "Form responses 3!A1:L1000",
  RESPONSE_RANGE: "Form responses 4!A1:F1000",
  FALLBACK_RATE: 1500,
};

// Types
interface Quest {
  id: number;
  title: string;
  sponsor: string;
  description: string;
  reward: number;
  link?: string;
  remaining?: number | string;
  status: "active" | "completed";
  trackCode?: string;
}

interface UserStats {
  availableQuests: number;
  completedQuests: number;
  earnings: number;
}

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [availableCurrentPage, setAvailableCurrentPage] = useState(1);
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
  const questsPerPage = 4;

  // Data state
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    availableQuests: 0,
    completedQuests: 0,
    earnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Currency state (NGN / USDC)
  type Currency = "NGN" | "USDC";
  const [currency, setCurrency] = useState<Currency>(
    () =>
      (typeof window !== "undefined" &&
        (localStorage.getItem("sq-currency") as Currency)) ||
      "NGN"
  );
  const [usdcRate, setUsdcRate] = useState<number>(CONFIG.FALLBACK_RATE);

  // Fetch data from API
  const fetchSheetData = useCallback(async (type: string, range: string) => {
    try {
      const response = await fetch(
        `/api/sheets?type=${type}&range=${encodeURIComponent(range)}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch data");
      }
      const data = await response.json();
      return data.values || [];
    } catch (err: any) {
      console.error(`Error fetching ${type} data:`, err);
      throw err;
    }
  }, []);

  // Get quest availability
  const getQuestAvailability = useCallback(
    async (trackCode: string) => {
      try {
        // Fetch quantity
        const quantityRows = await fetchSheetData(
          "quantity",
          CONFIG.QUANTITY_RANGE
        );
        const headers = quantityRows[0] || [];
        const trackCodeIndex = headers.findIndex(
          (h: string) => h.trim() === "Track Code"
        );
        const quantityIndex = headers.findIndex(
          (h: string) => h.trim() === "Quantity"
        );

        const quantityRow = quantityRows
          .slice(1)
          .find(
            (row: any[]) =>
              row[trackCodeIndex]?.trim().toLowerCase() ===
              trackCode.trim().toLowerCase()
          );
        const quantity = quantityRow
          ? parseInt(quantityRow[quantityIndex]) || 0
          : 0;

        // Fetch submission count
        const responseRows = await fetchSheetData(
          "response",
          CONFIG.RESPONSE_RANGE
        );
        const responseHeaders = responseRows[0] || [];
        const responseTrackIndex = responseHeaders.findIndex(
          (h: string) => h.trim() === "Track Code"
        );

        const submissionCount = responseRows
          .slice(1)
          .filter(
            (row: any[]) =>
              row[responseTrackIndex]?.trim().toLowerCase() ===
              trackCode.trim().toLowerCase()
          ).length;

        const remaining = quantity - submissionCount;
        return { remaining, total: quantity };
      } catch (error) {
        console.error(`Error checking availability for ${trackCode}:`, error);
        return { remaining: "Error checking availability", total: 0 };
      }
    },
    [fetchSheetData]
  );

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch USDC rate
        try {
          const rateData = await fetchSheetData("stats", CONFIG.RATE_RANGE);
          if (rateData && rateData[0] && rateData[0][0]) {
            const cleanedRate = rateData[0][0]
              .toString()
              .replace(/[^0-9.]/g, "");
            const rate = parseFloat(cleanedRate) || 0;
            if (rate > 0 && !isNaN(rate)) {
              setUsdcRate(rate);
            }
          }
        } catch (err) {
          console.warn("Failed to fetch USDC rate, using fallback:", err);
        }

        // Fetch stats
        try {
          const statsRows = await fetchSheetData("stats", CONFIG.STATS_RANGE);
          if (statsRows && statsRows.length > 1) {
            const headers = statsRows[0];
            const dataRow = statsRows[1];
            setUserStats({
              availableQuests: parseInt(dataRow[0]) || 0,
              completedQuests: parseInt(dataRow[1]) || 0,
              earnings: parseInt(dataRow[2]) || 0,
            });
          }
        } catch (err) {
          console.warn("Failed to fetch stats:", err);
        }

        // Fetch quests
        const questRows = await fetchSheetData("quests", CONFIG.QUESTS_RANGE);
        if (!questRows || questRows.length < 2) {
          throw new Error("No quest data found");
        }

        const headers = questRows[0];
        const questData = await Promise.all(
          questRows.slice(1).map(async (row: any[], index: number) => {
            const id = parseInt(row[0]) || index + 1;
            const title = row[1] || "Untitled Quest";
            const sponsor = row[2] || "Unknown Sponsor";
            const description = row[3] || "No description available";
            const reward =
              parseFloat(row[4]?.toString().replace(/[^0-9.]/g, "")) || 0;
            const link = row[5] || "";
            const statusValue = parseInt(row[6]) || 0;
            const status = statusValue === 0 ? "active" : "completed";
            const trackCode = row[7] || "";

            let availability = {
              remaining: undefined as number | string | undefined,
              total: 0,
            };
            if (status === "active" && trackCode) {
              availability = await getQuestAvailability(trackCode);
            }

            return {
              id,
              title,
              sponsor,
              description,
              reward,
              link,
              status,
              trackCode,
              remaining: availability.remaining,
            } as Quest;
          })
        );

        setQuests(questData);
      } catch (err: any) {
        console.error("Error loading data:", err);
        setError(err.message || "Failed to load quest data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchSheetData, getQuestAvailability]);

  useEffect(() => {
    try {
      localStorage.setItem("sq-currency", currency);
    } catch {}
  }, [currency]);

  const formatAmount = useCallback(
    (amountNgn: number) => {
      if (currency === "USDC") {
        const usdc = amountNgn / usdcRate;
        return `$${usdc.toFixed(2)}`;
      }
      return `₦${amountNgn.toLocaleString("en-NG")}`;
    },
    [currency, usdcRate]
  );

  // Mock user data
  const userData = {
    name: publicKey
      ? `${publicKey.toBase58().slice(0, 4)}...${publicKey
          .toBase58()
          .slice(-4)}`
      : "User",
    wallet:
      publicKey?.toBase58() || "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    totalQuests: userStats.availableQuests,
    completedQuests: userStats.completedQuests,
    totalEarnings: userStats.earnings,
  };

  const availableQuests = useMemo(
    () => quests.filter((q) => q.status === "active"),
    [quests]
  );
  const completedQuests = useMemo(
    () => quests.filter((q) => q.status === "completed"),
    [quests]
  );

  const paginatedAvailable = useMemo(() => {
    const start = (availableCurrentPage - 1) * questsPerPage;
    return availableQuests.slice(start, start + questsPerPage);
  }, [availableQuests, availableCurrentPage]);

  const paginatedCompleted = useMemo(() => {
    const start = (completedCurrentPage - 1) * questsPerPage;
    return completedQuests.slice(start, start + questsPerPage);
  }, [completedQuests, completedCurrentPage]);

  const completeQuest = useCallback(
    (questId: number) => {
      const quest = quests.find((q) => q.id === questId);
      if (quest) {
        setCompletionMessage(
          `Congratulations! You have completed "${
            quest.title
          }" and earned ${formatAmount(quest.reward)}.`
        );
        setCompletionModalOpen(true);
      }
    },
    [quests, formatAmount]
  );

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-avatar">L</div>
            <div className="profile-name">Loading...</div>
            <p style={{ textAlign: "center", marginTop: "20px" }}>
              Fetching quest data from Google Sheets...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen">
        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-avatar">!</div>
            <div className="profile-name">Error Loading Data</div>
            <p
              style={{
                textAlign: "center",
                marginTop: "20px",
                color: "#EF4444",
              }}
            >
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="complete-btn"
              style={{ marginTop: "20px" }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">{userData.name.charAt(0)}</div>
          <div className="profile-name">{userData.name}</div>
          <div className="profile-wallet">
            {userData.wallet.substring(0, 8)}...{userData.wallet.slice(-8)}
          </div>
          <div className="profile-stats">
            <div className="stat">
              <div className="stat-number">{userData.totalQuests}</div>
              <div className="stat-label">Total Quests</div>
            </div>
            <div className="stat">
              <div className="stat-number">{userData.completedQuests}</div>
              <div className="stat-label">Completed Quests</div>
            </div>
            <div className="stat">
              <div className="stat-number">
                {formatAmount(userData.totalEarnings)}
              </div>
              <div className="stat-label">Earnings ({currency})</div>
            </div>
          </div>

          {/* Currency Toggle */}
          <div className="currency-switch">
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
        </div>

        <div className="quests-section" id="available-quests">
          <h2 className="section-title">
            <FontAwesomeIcon icon={faUnlock} /> Available Quests
          </h2>
          <div className="quests-grid">
            {paginatedAvailable.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                formatAmount={formatAmount}
                onSubmit={completeQuest}
              />
            ))}
          </div>
          {/* Pagination for available quests */}
          <div className="pagination">
            <button
              className="pagination-btn"
              disabled={availableCurrentPage === 1}
              onClick={() => setAvailableCurrentPage((p) => p - 1)}
            >
              Previous
            </button>
            {Array.from({
              length: Math.ceil(availableQuests.length / questsPerPage),
            }).map((_, i) => (
              <button
                key={i}
                className={`pagination-btn ${
                  availableCurrentPage === i + 1 ? "active" : ""
                }`}
                onClick={() => setAvailableCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="pagination-btn"
              disabled={
                availableCurrentPage ===
                Math.ceil(availableQuests.length / questsPerPage)
              }
              onClick={() => setAvailableCurrentPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <div className="quests-section" id="completed-quests">
          <h2 className="section-title">
            <FontAwesomeIcon icon={faCheckDouble} /> Completed Quests
          </h2>
          <div className="quests-grid">
            {paginatedCompleted.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                formatAmount={formatAmount}
              />
            ))}
          </div>
          {/* Pagination for completed quests */}
          <div className="pagination">
            <button
              className="pagination-btn"
              disabled={completedCurrentPage === 1}
              onClick={() => setCompletedCurrentPage((p) => p - 1)}
            >
              Previous
            </button>
            {Array.from({
              length: Math.ceil(completedQuests.length / questsPerPage),
            }).map((_, i) => (
              <button
                key={i}
                className={`pagination-btn ${
                  completedCurrentPage === i + 1 ? "active" : ""
                }`}
                onClick={() => setCompletedCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="pagination-btn"
              disabled={
                completedCurrentPage ===
                Math.ceil(completedQuests.length / questsPerPage)
              }
              onClick={() => setCompletedCurrentPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Quest Completion Modal */}
      {completionModalOpen && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Quest Completed!</h2>
              <span
                className="close"
                onClick={() => setCompletionModalOpen(false)}
              >
                &times;
              </span>
            </div>
            <div className="modal-body">
              <p>{completionMessage}</p>
              <button
                className="modal-close-btn"
                onClick={() => setCompletionModalOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
