import { motion } from "framer-motion";
import { FaSearch, FaTasks, FaTrophy } from "react-icons/fa";
import { FiSearch, FiClipboard, FiAward } from "react-icons/fi";

const steps = [
  {
    icon: <FiSearch size={42} />,
    title: "Explore Quests",
    desc: "Discover exciting quests within the SnappQuest community",
  },
  {
    icon: <FiClipboard size={42} />,
    title: "Complete Quests",
    desc: "Participate and submit your contributions to the community",
  },
  {
    icon: <FiAward size={42} />,
    title: "Earn Rewards",
    desc: "You earn rewards for completing active quests on time",
  },
];

export const HowItWorks = () => (
  <section
    id="how-it-works"
    className="py-28 bg-gradient-to-b from-gray-50 to-gray-200 text-center px-6"
  >
    <h2 className="text-4xl md:text-5xl font-bold mb-14 bg-gradient-to-r from-indigo-500 to-emerald-400 bg-clip-text text-transparent uppercase tracking-tight">
      How It Works
    </h2>
    <div className="steps">
      <div className="step">
        <div className="step-icon">
          <FaSearch />
        </div>
        <h3>Create Quest</h3>
        <p>Incentivize community participation with a Quest</p>
      </div>
      <div className="step">
        <div className="step-icon">
          <FaTasks />
        </div>
        <h3>Join Quests</h3>
        <p>Support Solana to access exclusive Quest rewards</p>
      </div>
      <div className="step">
        <div className="step-icon">
          <FaTrophy />
        </div>
        <h3>Earn Rewards</h3>
        <p>Get rewarded once your completed Quest is verified</p>
      </div>
    </div>
  </section>
);
