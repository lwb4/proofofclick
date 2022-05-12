import { useState, useEffect, useCallback } from "react";
import "./Game.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import useAccountBalance from "../hooks/useAccountBalance";
import MyButton from "../components/MyButton";

function Game({
  connection,
  currentAccount,
  setCurrentAccount,
  pageStateRouters,
  tokenMint,
  program,
}) {
  const [balances, _] = useAccountBalance(
    connection,
    currentAccount,
    tokenMint
  );
  const { solBalance, tokenBalance } = balances as any;

  const [unconfirmedTokenBalance, setUnconfirmedTokenBalance] = useState(null);
  const [confirmedTokenBalance, setConfirmedTokenBalance] = useState(null);

  useEffect(() => {
    if (confirmedTokenBalance == null || tokenBalance > confirmedTokenBalance) {
      setConfirmedTokenBalance(tokenBalance);
    }
  }, [balances, confirmedTokenBalance, tokenBalance, setConfirmedTokenBalance]);

  useEffect(() => {
    if (confirmedTokenBalance !== null && unconfirmedTokenBalance === null) {
      setUnconfirmedTokenBalance(confirmedTokenBalance);
    }
  }, [
    confirmedTokenBalance,
    unconfirmedTokenBalance,
    setUnconfirmedTokenBalance,
  ]);

  let currentAccountAddress = `${currentAccount.publicKey.toBase58()}`;
  let solanaBeachLink = `https://solanabeach.io/address/${currentAccountAddress}?cluster=devnet`;

  const copyAccountAddress = () => {
    navigator.clipboard.writeText(currentAccountAddress);
  };

  const logOut = () => {
    setCurrentAccount(null);
    pageStateRouters.goToAccounts();
  };

  const clickButton = async () => {
    setUnconfirmedTokenBalance((x) => x + 1);
    await program.mintAndSendOne(currentAccount, unconfirmedTokenBalance);
    setConfirmedTokenBalance((x) => x + 1);
  };

  return (
    <>
      <div className="header">
        <div className="header-title">Adventure 2D (devnet)</div>
        <div
          className="header-account"
          title="Click to copy account address"
          onClick={copyAccountAddress}
        >
          {currentAccountAddress}
        </div>
        <div className="header-balance">
          <a target="_blank" href={solanaBeachLink}>
            Balance: {solBalance == null ? "loading..." : `${solBalance} SOL`}
          </a>
        </div>
        <div className="header-logout" onClick={logOut}>
          <FontAwesomeIcon icon={faRightFromBracket} />
          &nbsp;Log out
        </div>
      </div>
      <div className="content">
        <p>
          Token balance: {tokenBalance == null ? "loading..." : tokenBalance}
        </p>
        <p>
          Confirmed token balance:{" "}
          {confirmedTokenBalance == null ? "loading..." : confirmedTokenBalance}
        </p>
        <p>
          Unconfirmed token balance:{" "}
          {unconfirmedTokenBalance == null
            ? "loading..."
            : unconfirmedTokenBalance}
        </p>
        <MyButton onClick={clickButton}>CLICK ME</MyButton>
      </div>
    </>
  );
}

export default Game;
