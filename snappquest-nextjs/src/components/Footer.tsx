import {
  faGift,
  faMicrochip,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FaTasks } from "react-icons/fa";
import { FaTwitter, FaTelegram } from "react-icons/fa";

export const Footer: React.FC = () => (
  <footer>
    <div className="footer-container">
      <div className="footer-row">
        <div className="footer-col footer-info">
          <h2>SnappQuest</h2>
          <p>
            An Engage-to-Earn tool empowering the Solana community to own
            engagement and grow together.
          </p>
        </div>

        <div className="footer-col">
          <h2>Quick Links</h2>
          <ul className="footer-link">
            <li>
              <a href="#hero">Home</a>
            </li>
            <li>
              <a href="#create-quest">Create Quest</a>
            </li>
            <li>
              <a href="https://t.me/SnappQuest/134" target="_blank">
                Join Quest
              </a>
            </li>
            <li>
              <a href="#how-it-works">How It Works</a>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h2>Other Tools</h2>
          <ul className="footer-link">
            <li>
              <a href="https://t.me/EarnlyQuestBot" target="_blank">
                <FontAwesomeIcon
                  icon={faMicrochip}
                  // style={{ marginRight: "3px" }}
                />
                Earnly Bot
              </a>
            </li>
            <li>
              <a href="https://t.me/EarnlyQuestBot" target="_blank">
                <FontAwesomeIcon
                  icon={faPlusCircle}
                  // style={{ marginRight: "3px" }}
                />
                Snapp Quote
              </a>
            </li>
            <li>
              <a href="https://t.me/EarnlyQuestBot" target="_blank">
                <FontAwesomeIcon
                  icon={faGift}
                  // style={{ marginRight: "3px" }}
                />
                Gift Card
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h2>Custom Quest</h2>
          <p>
            Reach out on Telegram for partnerships or customized quests. Create
            your own custom quest by contacting the team!
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="copyright-text">
          <p>&copy; 2025 SnappQuest. All rights reserved.</p>
        </div>
        <div className="social-icons">
          <ul>
            <li>
              <a href="https://x.com/SnappQuest" target="_blank">
                <FaTwitter /> X (Twitter)
              </a>
            </li>
            <li>
              <a href="https://t.me/SnappQuest" target="_blank">
                <FaTelegram /> Telegram
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
);
