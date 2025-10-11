"use client";

import { FormEvent, useMemo, useState } from "react";
import { BackToTopButton } from "@/components/BackToTopButton";
import { BaseModal, LearnMoreModal } from "@/components/modals";

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSe9lmAvmoScW5kuVpZprjVq5rF7TLYQTU_PJYKnN1SRQXAI5Q/formResponse";

const QUEST_OPTIONS = [
  "X (Twitter) Likes",
  "X (Twitter) RTs",
  "X (Twitter) Comments",
  "X (Twitter) Followers",
];

const QUANTITY_OPTIONS = Array.from({ length: 50 }, (_, i) => String(i + 1));

type Currency = "NGN" | "USDC";

const CURRENCY_META: Record<
  Currency,
  { symbol: string; price: number; fee: number }
> = {
  NGN: { symbol: "₦", price: 20, fee: 20 },
  USDC: { symbol: "$", price: 0.2, fee: 0.2 },
};

const initialFormState = {
  email: "",
  title: "",
  sponsor: "",
  description: "",
  link: "",
  telegram: "",
  twitter: "",
  questOption: "",
  quantity: "",
};

type FormState = typeof initialFormState;

interface ConfirmationData {
  trackCode: string;
  questOption: string;
  quantity: string;
  totalDisplay: string;
  rewardDisplay: string;
  feeDisplay: string;
  title: string;
}

const generateTrackCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const formatCurrency = (value: number, currency: Currency) => {
  if (currency === "USDC") {
    return `$${value.toFixed(2)}`;
  }
  return `₦${Math.round(value).toLocaleString("en-NG")}`;
};

const CUSTOM_QUEST_URL = "https://t.me/SnappQuest/146";
const TELEGRAM_GROUP_URL = "https://t.me/SnappQuest/129";

const ENTRY_KEYS = {
  email: "entry.2147360639",
  title: "entry.1526178092",
  sponsor: "entry.884208731",
  description: "entry.1178007064",
  reward: "entry.1547645284",
  link: "entry.899075060",
  telegram: "entry.112634495",
  twitter: "entry.1507763482",
  trackcode: "entry.269247622",
  questOption: "entry.256576255",
  quantity: "entry.1138659293",
};

export default function QuestPage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [trackCode, setTrackCode] = useState(generateTrackCode);
  const [submitting, setSubmitting] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationData, setConfirmationData] =
    useState<ConfirmationData | null>(null);

  const currencyMeta = CURRENCY_META[currency];

  const quantityValue = useMemo(
    () => Number(form.quantity || 0),
    [form.quantity]
  );

  const rewardAmount = quantityValue * currencyMeta.price;
  const totalPrice = rewardAmount + currencyMeta.fee;

  const totalDisplay = formatCurrency(totalPrice, currency);
  const rewardDisplay = formatCurrency(rewardAmount, currency);
  const feeDisplay = formatCurrency(currencyMeta.fee, currency);

  const handleInputChange =
    (field: keyof FormState) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleCurrencyToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrency(event.target.checked ? "USDC" : "NGN");
  };

  const resetForm = () => {
    setForm(initialFormState);
    setCurrency("NGN");
    setTrackCode(generateTrackCode());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const submissionSummary: ConfirmationData = {
      trackCode,
      questOption: form.questOption,
      quantity: form.quantity,
      totalDisplay,
      rewardDisplay,
      feeDisplay,
      title: form.title,
    };

    const formData = new FormData();
    formData.append(ENTRY_KEYS.email, form.email.trim());
    formData.append(ENTRY_KEYS.title, form.title.trim());
    formData.append(ENTRY_KEYS.sponsor, form.sponsor.trim());
    formData.append(ENTRY_KEYS.description, form.description.trim());
    formData.append(ENTRY_KEYS.reward, rewardDisplay);
    formData.append(ENTRY_KEYS.link, form.link.trim());
    formData.append(ENTRY_KEYS.telegram, form.telegram.trim());
    formData.append(ENTRY_KEYS.twitter, form.twitter.trim());
    formData.append(ENTRY_KEYS.trackcode, trackCode);
    formData.append(ENTRY_KEYS.questOption, form.questOption);
    formData.append(ENTRY_KEYS.quantity, form.quantity);

    try {
      await fetch(GOOGLE_FORM_URL, {
        method: "POST",
        body: formData,
        mode: "no-cors",
      });
    } catch (error) {
      console.error("Quest submission failed", error);
    } finally {
      setConfirmationData(submissionSummary);
      setConfirmationOpen(true);
      resetForm();
      setSubmitting(false);
    }
  };

  return (
    <div className="quest-page">
      <main className="quest-main">
        <div className="quote-container">
          <div className="quote-header">Submit a New Quest</div>
          <div className="quote-body">
            <h3>Quest Details</h3>
            <p>
              Fill out the fields below to create your quest. Cost is{" "}
              <span>
                {formatCurrency(CURRENCY_META[currency].price, currency)}
              </span>{" "}
              per engagement plus a service fee of {feeDisplay}.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleInputChange("email")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  required
                  placeholder="Enter quest title"
                  value={form.title}
                  onChange={handleInputChange("title")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="sponsor">Sponsor</label>
                <input
                  id="sponsor"
                  type="text"
                  required
                  placeholder="Enter sponsor name"
                  value={form.sponsor}
                  onChange={handleInputChange("sponsor")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  required
                  placeholder="Describe your quest"
                  value={form.description}
                  onChange={handleInputChange("description")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="reward">Reward (Auto-generated)</label>
                <input id="reward" type="text" readOnly value={rewardDisplay} />
              </div>

              <div className="form-group">
                <label htmlFor="link">Link</label>
                <input
                  id="link"
                  type="text"
                  required
                  placeholder="Enter quest link"
                  value={form.link}
                  onChange={handleInputChange("link")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="telegram">Telegram</label>
                <input
                  id="telegram"
                  type="text"
                  required
                  placeholder="Enter Telegram handle or link"
                  value={form.telegram}
                  onChange={handleInputChange("telegram")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="twitter">Twitter (X)</label>
                <input
                  id="twitter"
                  type="text"
                  required
                  placeholder="Enter Twitter (X) handle or link"
                  value={form.twitter}
                  onChange={handleInputChange("twitter")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="trackcode">Track Code (Auto-generated)</label>
                <input id="trackcode" type="text" readOnly value={trackCode} />
              </div>

              <h3>Quest Options</h3>
              <p>Select an engagement type and quantity.</p>

              <div className="currency-switch">
                <span>NGN</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={currency === "USDC"}
                    onChange={handleCurrencyToggle}
                  />
                  <span className="slider" />
                </label>
                <span>USDC</span>
              </div>

              <div className="form-group">
                <label htmlFor="questOptions">Quest Options</label>
                <select
                  id="questOptions"
                  required
                  value={form.questOption}
                  onChange={handleInputChange("questOption")}
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  {QUEST_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Quantity</label>
                <select
                  id="quantity"
                  required
                  value={form.quantity}
                  onChange={handleInputChange("quantity")}
                >
                  <option value="" disabled>
                    Select a quantity
                  </option>
                  {QUANTITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="price-calculation">
                <h3>
                  Total Price: <span id="totalPrice">{totalDisplay}</span>
                </h3>
                <div className="price-breakdown">
                  Reward pool: {rewardDisplay} • Service fee: {feeDisplay}
                </div>
              </div>

              <div className="flex items-center justify-center gap-10 ">
                <button
                  type="submit"
                  className="quote-btn"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Quest"}
                </button>
                <button
                  type="button"
                  className="quote-btn"
                  onClick={() =>
                    window.open(
                      CUSTOM_QUEST_URL,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  Custom Quest
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <BackToTopButton />

      <BaseModal
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        title="Quest Submitted"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            Your quest has been added to the pending list. Join the{" "}
            <a
              href={TELEGRAM_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-semibold"
            >
              SnappQuest Telegram group
            </a>{" "}
            to finalize details with the admin team.
          </p>
          {confirmationData && (
            <ul className="space-y-2">
              <li>
                <strong>Quest:</strong> {confirmationData.title || "Untitled"}
              </li>
              <li>
                <strong>Track Code:</strong> {confirmationData.trackCode}
              </li>
              <li>
                <strong>Engagement:</strong>{" "}
                {confirmationData.questOption || "—"} ×{" "}
                {confirmationData.quantity || "0"}
              </li>
              <li>
                <strong>Total:</strong> {confirmationData.totalDisplay}
              </li>
              <li>
                <strong>Reward:</strong> {confirmationData.rewardDisplay} •{" "}
                <strong>Fee:</strong> {confirmationData.feeDisplay}
              </li>
            </ul>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              className="quote-btn"
              onClick={() => setConfirmationOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </BaseModal>

      <LearnMoreModal open={learnOpen} onClose={() => setLearnOpen(false)} />
    </div>
  );
}
