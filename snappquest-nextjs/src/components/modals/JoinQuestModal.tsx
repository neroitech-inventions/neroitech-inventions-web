"use client";
import { useEffect } from "react";
import Image from "next/image";
import { BaseModal } from "./BaseModal";

interface JoinQuestModalProps {
  open: boolean;
  onClose: () => void;
}

export const JoinQuestModal: React.FC<JoinQuestModalProps> = ({
  open,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow || "";
    };
  }, [open]);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Members Only"
      widthClass="join-quest-modal"
    >
      <Image
        src="/images/vip.png"
        alt="SnappQuest VIP Card"
        width={200}
        height={200}
        className="nft-card "
        priority
      />
      <h3>Exclusive Access</h3>
      <p>
        For real Solana supporters only, join the movement and get access on
        Telegram.
      </p>
      <a
        href="https://t.me/SnappQuest"
        target="_blank"
        rel="noopener noreferrer"
        className="modal-close-btn"
      >
        Join Telegram
      </a>
      <button type="button" className="modal-close-btn" onClick={onClose}>
        Close
      </button>
    </BaseModal>
  );
};
