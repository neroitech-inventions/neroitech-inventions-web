import { faPlusCircle, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";

export const Hero = () => (
  <section id="hero">
    <div className="hero-content">
      <h1>Welcome to SnappQuest</h1>
      <p>Empowering Communities to Own Engagement</p>
      <div className="journey-text">Engage-to-Earn</div>
      <div className="action-icons ">
        <a href="#create-quest" className="action-icon">
          <FontAwesomeIcon icon={faPlusCircle} className="nav-icon" size="lg" />
          <span className="whitespace-nowrap">Create Quest</span>
        </a>
        <a
          href="https://t.me/SnappQuest/134"
          className="action-icon"
          target="_blank"
        >
          <FontAwesomeIcon icon={faUsers} className="nav-icon" size="lg" />
          <span>Join Quest</span>
        </a>
      </div>
    </div>
  </section>
);
