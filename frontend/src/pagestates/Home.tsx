import MyButton from "../components/MyButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import "./Home.css";

function Home({ pageStateRouters }) {
  return (
    <div className="Home">
      <h1>Adventure 2D</h1>
      <p>
        A fully on-chain adventure game, hosted on Solana and playable in the
        browser. No trusted server is involved. Prepare to be underwhelmed.
      </p>
      <MyButton onClick={pageStateRouters.goToAccounts}>
        <FontAwesomeIcon icon={faPlay} />
        <span>&nbsp;Play Now</span>
      </MyButton>
    </div>
  );
}

export default Home;
