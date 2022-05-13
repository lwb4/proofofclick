import "./Help.css";
import MyLongButton from "../components/MyLongButton";

function Help({ pageStateRouters }) {
  return (
    <div className="Help">
      <h1>What is Proof of Click?</h1>
      <p>
        Proof of Click is a simple clicking game inspired by{" "}
        <a target="_blank" href="https://orteil.dashnet.org/cookieclicker/">
          Cookie Clicker
        </a>
        , hosted completely on the Solana blockchain.
      </p>
      <p>
        In most crypto games -- often called "Play to Earn" -- the majority of
        the game is off-chain in centralized servers, and only bridges assets to
        the blockchain when necessary.
      </p>
      <p>
        This game is different. Every interaction you have in the game is a
        transaction on the blockchain. Other than the CDN hosting this
        Javascript front-end, there is no centralized server involved
        whatsoever.
      </p>
      <p>
        Right now you can only click one button and watch your token count go
        up. Every time you click, a new token is minted and sent to your wallet.
        In the future, there will be more things you can do, like buying cursor
        tokens that increase the number of tokens you get with each click, and
        so on.
      </p>
      <p>To play, you will need some SOL. Follow these steps:</p>
      <ol>
        <li>
          Create a burner account by clicking "Play Game" and "Create Account"
        </li>
        <li>
          Airdrop some devnet SOL to your account via{" "}
          <a target="_blank" href="https://solfaucet.com/">
            Sol Faucet
          </a>{" "}
          or any other faucet
        </li>
        <li>You're ready to play!</li>
      </ol>
      <p>
        Note: this is a <i>very early</i> alpha release. If things aren't
        working the way you expected, contact me{" "}
        <a target="_blank" href="https://twitter.com/chalcidfly">
          on Twitter
        </a>{" "}
        and I'll fix it ASAP.
      </p>
      <MyLongButton onClick={pageStateRouters.goToHome}>
        I'm ready! Take me back.
      </MyLongButton>
    </div>
  );
}

export default Help;
