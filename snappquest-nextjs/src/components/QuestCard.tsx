import React from "react";

interface QuestCardProps {
  quest: {
    id: number;
    title: string;
    sponsor: string;
    description: string;
    reward: number;
    link?: string;
    remaining?: number | string;
    status: "active" | "completed";
  };
  formatAmount: (amount: number) => string;
  onSubmit?: (questId: number) => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({
  quest,
  formatAmount,
  onSubmit,
}) => {
  const isActive = quest.status === "active";
  console.log("Rendering QuestCard:", quest); // Debugging line

  return (
    <div className="quest-card">
      <div className="quest-title">{quest.title}</div>
      <div className="quest-sponsor">Sponsored by: {quest.sponsor}</div>

      {/* Show remaining only for active quests */}
      {isActive && (
        <div
          className={`text-red-500 mb-4 text-sm quest-remaining ${
            typeof quest.remaining === "number"
              ? quest.remaining < 3
                ? "low"
                : "normal"
              : "low"
          }`}
        >
          {quest.remaining === undefined
            ? "No more rewards for this Quest"
            : `${quest.remaining} submission${
                quest.remaining === 1 ? "" : "s"
              } remaining`}
        </div>
      )}

      <div className="quest-description text-sm text-[#4B5563]">
        {quest.description}
      </div>

      <div className="quest-reward">
        <span className="reward-amount">{formatAmount(quest.reward)}</span>

        {/* Show action buttons only for active quests */}
        {isActive && (
          <div style={{ display: "flex", gap: "8px" }}>
            {quest.link && (
              <a
                href={quest.link}
                target="_blank"
                rel="noopener noreferrer"
                className="complete-btn"
              >
                Go to Quest
              </a>
            )}
            {typeof quest.remaining === "number" &&
              quest.remaining > 0 &&
              onSubmit && (
                <button
                  className="submit-btn"
                  onClick={() => onSubmit(quest.id)}
                >
                  Submit Quest
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
