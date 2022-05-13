import MyButton from "../components/MyButton";
import MyLink from "../components/MyLink";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import "./Home.css";

function Home({ pageStateRouters }) {
  return (
    <div className="Home">
      <h1>Proof of Click</h1>
      <p>A fully on-chain clicking game.</p>
      <MyButton onClick={pageStateRouters.goToAccounts}>
        <FontAwesomeIcon icon={faPlay} />
        <span>&nbsp;Play Now</span>
      </MyButton>
      <p>
        <MyLink onClick={pageStateRouters.goToHelp} value="What is this?" />
      </p>
    </div>
  );
}

export default Home;
