"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletSelector } from "./wallet/WalletSelectorContext";
import { FiMenu } from "react-icons/fi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlusCircle,
  faFlagCheckered,
  faSignInAlt,
  faHome,
  faHomeAlt,
  faSignOutAlt,
  faWallet,
  faTrophy,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { usePathname } from "next/navigation";
import { JoinQuestModal } from "./modals";

interface NavbarProps {
  variant?: "home" | "quest" | "profile";
}

export const Navbar: React.FC<NavbarProps> = ({ variant }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [joinQuestModalOpen, setJoinQuestModalOpen] = useState(false);
  const { publicKey, disconnect } = useWallet();
  const { open } = useWalletSelector();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = usePathname();
  const routeVariant = useMemo<"home" | "quest" | "profile">(() => {
    const p = pathname || "/";
    return p.startsWith("/quest")
      ? "quest"
      : p.startsWith("/profile") ||
        p.startsWith("/balance") ||
        p.startsWith("/leaderboard")
      ? "profile"
      : "home";
  }, [pathname]);
  const effectiveVariant: "home" | "quest" | "profile" =
    variant ?? routeVariant;
  const isHome = effectiveVariant === "home";
  const isQuest = effectiveVariant === "quest";
  const isLanding = isHome || isQuest; // pages with CTA: Create/Join or Home + Member Access
  const isLeaderboard = pathname === "/leaderboard";
  const isBalance = pathname === "/balance";

  // After connecting via the modal on the home page, redirect to profile
  useEffect(() => {
    if (publicKey && isHome) {
      window.location.href = "/profile";
    }
  }, [publicKey, isHome]);

  const Logout = async () => {
    if (publicKey) {
      // Call the disconnect function from the wallet adapter
      await disconnect();
      window.location.href = "/";
    }
  };

  const Login = async () => {
    if (publicKey) {
      window.location.href = "/profile";
      return;
    }
    // Open the custom wallet selector modal
    open();
  };

  return (
    <header className="flex justify-between">
      <div className="logo">
        <Link href="/">
          <Image
            src="/images/logo.png"
            alt="SnappQuest Logo"
            width={140}
            height={40}
          />
        </Link>
      </div>
      <div className={`nav-container  ${mobileOpen ? "active" : ""}`}>
        <nav className="nav-links">
          {isHome ? (
            <>
              <Link className="flex items-center" href="/quest">
                <FontAwesomeIcon
                  icon={faPlusCircle}
                  style={{ color: "#34D399", marginRight: "3px" }}
                  size="1x"
                />
                <p>Create Quest</p>
              </Link>
              <Link
                className="flex items-center"
                href="#join-quest"
                onClick={(event) => {
                  event.preventDefault();
                  setJoinQuestModalOpen(true);
                }}
              >
                <FontAwesomeIcon
                  icon={faFlagCheckered}
                  style={{ color: "#34D399", marginRight: "3px" }}
                  size="1x"
                />
                <p>Join Quest</p>
              </Link>
            </>
          ) : isQuest ? (
            <>
              <Link className="flex items-center" href="/">
                <FontAwesomeIcon
                  icon={faHomeAlt}
                  style={{ color: "#34D399", marginRight: "3px" }}
                  size="1x"
                />
                <p>Home</p>
              </Link>
            </>
          ) : (
            <>
              {isLeaderboard ? (
                <>
                  {/* Leaderboard page shows Profile and Check Your Balance */}
                  <Link className="flex items-center" href="/profile">
                    <FontAwesomeIcon
                      icon={faUser}
                      style={{ color: "#34D399", marginRight: "3px" }}
                      size="1x"
                    />
                    <p>Profile</p>
                  </Link>
                  <Link className="flex items-center" href="/balance">
                    <FontAwesomeIcon
                      icon={faWallet}
                      style={{ color: "#34D399", marginRight: "3px" }}
                      size="1x"
                    />
                    <p>Check Your Balance</p>
                  </Link>
                </>
              ) : isBalance ? (
                <>
                  {/* Balance page shows Profile and View Leaderboard */}
                  <Link className="flex items-center" href="/profile">
                    <FontAwesomeIcon
                      icon={faUser}
                      style={{ color: "#34D399", marginRight: "3px" }}
                      size="1x"
                    />
                    <p>Profile</p>
                  </Link>
                  <Link className="flex items-center" href="/leaderboard">
                    <FontAwesomeIcon
                      icon={faTrophy}
                      style={{ color: "#34D399", marginRight: "3px" }}
                      size="1x"
                    />
                    <p>View Leaderboard</p>
                  </Link>
                </>
              ) : (
                <>
                  {/* Profile page shows Check Your Balance and View Leaderboard */}
                  <Link className="flex items-center" href="/balance">
                    <FontAwesomeIcon
                      icon={faWallet}
                      style={{ color: "#34D399", marginRight: "3px" }}
                      size="1x"
                    />
                    <p>Check Your Balance</p>
                  </Link>
                  <Link className="flex items-center" href="/leaderboard">
                    <FontAwesomeIcon
                      icon={faTrophy}
                      style={{ color: "#34D399", marginRight: "3px" }}
                      size="1x"
                    />
                    <p>View Leaderboard</p>
                  </Link>
                </>
              )}
            </>
          )}
        </nav>
        {mounted &&
          (publicKey ? (
            isLanding ? (
              <Link href="/profile" className="connect-btn">
                Profile
              </Link>
            ) : (
              <button
                className="disconnect-btn flex items-center"
                onClick={Logout}
              >
                <FontAwesomeIcon
                  icon={faSignOutAlt}
                  style={{ color: "#ffffff", marginRight: "3px" }}
                  size="1x"
                />
                <p>Sign Out</p>
              </button>
            )
          ) : (
            <button
              onClick={Login}
              className={
                isLanding
                  ? "connect-btn flex items-center"
                  : "disconnect-btn flex items-center"
              }
            >
              <FontAwesomeIcon
                icon={faSignInAlt}
                style={{ color: "#ffffff", marginRight: "3px" }}
                size="1x"
              />
              <p>Member Access</p>
            </button>
          ))}
      </div>
      {/* <div
        className={`hamburger ${mobileOpen ? "active" : ""}`}
        onClick={() => setMobileOpen((o) => !o)}
      >
        <FiMenu />
      </div>
      <div
        className={`overlay ${mobileOpen ? "active" : ""}`}
        onClick={() => setMobileOpen(false)}
      /> */}

      <JoinQuestModal
        open={joinQuestModalOpen}
        onClose={() => setJoinQuestModalOpen(false)}
      />
    </header>
  );
};
