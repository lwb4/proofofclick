import { useState } from "react";
import "./App.css";
import Home from "./pagestates/Home";
import Accounts from "./pagestates/Accounts";
import Game from "./pagestates/Game";
import Drain from "./pagestates/Drain";
import useLocalAccounts from "./hooks/useLocalAccounts";
import { Connection, PublicKey } from "@solana/web3.js";
import ProofOfClick from "./rpc/proofofclick";

// const TOKEN_MINT = "3wcgWYAFgztbQy8TBBzutUC4AyoCiXHBo56WNcUpGy1m"; // local
const TOKEN_MINT = "C73wX9ATj7K8K62dFqWEEG14wfupnZqUxZRTXVdEib7S"; // devnet
const PROGRAM_ID = "7khCm9h5cWdU1KBiMztMvzFiXNCum1iwGUcRVFwKhoP9";
const PDA_AUTHORITY = "2dQuRZEk2pYhbrWqACq2LPzTTLAUcLT9trGFnb37rFka";
const PDA_AUTHORITY_BUMP = 254;

// const CONNECTION_URL = "http://localhost:8899"
const CONNECTION_URL = "https://api.devnet.solana.com";

const PAGESTATE_HOME = "home";
const PAGESTATE_ACCOUNTS = "accounts";
const PAGESTATE_GAME = "game";
const PAGESTATE_DRAIN = "drain";

const pageStateComponents = {
  [PAGESTATE_HOME]: Home,
  [PAGESTATE_ACCOUNTS]: Accounts,
  [PAGESTATE_GAME]: Game,
  [PAGESTATE_DRAIN]: Drain,
};

function App() {
  const [connection, _] = useState(new Connection(CONNECTION_URL));
  const [pageState, setPageState] = useState(PAGESTATE_HOME);
  const [accounts, addAccount, removeAccount] = useLocalAccounts();
  const [currentAccount, setCurrentAccount] = useState(null);

  const goToHome = () => setPageState(PAGESTATE_HOME);
  const goToAccounts = () => setPageState(PAGESTATE_ACCOUNTS);
  const goToGame = () => setPageState(PAGESTATE_GAME);
  const goToDrain = () => setPageState(PAGESTATE_DRAIN);
  const pageStateRouters = { goToHome, goToAccounts, goToGame, goToDrain };

  const CurrentPageState = pageStateComponents[pageState];

  const proofOfClick = new ProofOfClick(
    connection,
    new PublicKey(PROGRAM_ID),
    new PublicKey(TOKEN_MINT),
    new PublicKey(PDA_AUTHORITY),
    PDA_AUTHORITY_BUMP
  );

  return (
    <div className="App">
      <CurrentPageState
        connection={connection}
        accounts={accounts}
        addAccount={addAccount}
        removeAccount={removeAccount}
        currentAccount={currentAccount}
        setCurrentAccount={setCurrentAccount}
        pageStateRouters={pageStateRouters}
        tokenMint={new PublicKey(TOKEN_MINT)}
        program={proofOfClick}
      />
    </div>
  );
}

export default App;
