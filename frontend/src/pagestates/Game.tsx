import { useState, useEffect, useCallback } from "react";
import "./Game.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import useAccountBalance from "../hooks/useAccountBalance";
import useSolanaFees from "../hooks/useSolanaFees";
import useTokenSupply from "../hooks/useTokenSupply";
import MyButton from "../components/MyButton";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

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
  const { clickFee, refreshFees } = useSolanaFees(
    connection,
    program,
    currentAccount
  );
  const totalSupply = useTokenSupply(connection, tokenMint);

  const [unconfirmedTokenBalance, setUnconfirmedTokenBalance] = useState(null);
  const [confirmedTokenBalance, setConfirmedTokenBalance] = useState(null);

  useEffect(() => {
    if (clickFee == null && refreshFees != null) {
      refreshFees();
    }
  }, [balances, clickFee, refreshFees]);

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
        <div className="header-title">Proof of Click (devnet)</div>
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
        <div className="Game">
          {solBalance > 0 ? (
            <>
              <p>
                Token balance:{" "}
                {confirmedTokenBalance == null
                  ? "loading..."
                  : confirmedTokenBalance}
              </p>
              <MyButton onClick={clickButton}>
                CLICK ME FOR TOKENS (
                {clickFee != null ? (
                  <>costs {clickFee / LAMPORTS_PER_SOL} SOL</>
                ) : (
                  <>loading fee...</>
                )}
                )
              </MyButton>
              {confirmedTokenBalance === unconfirmedTokenBalance ? null : (
                <p className="orange">
                  Pending balance:{" "}
                  {unconfirmedTokenBalance == null
                    ? "loading..."
                    : unconfirmedTokenBalance}
                </p>
              )}
            </>
          ) : (
            <>
              <p>To play Proof of Click, you need some SOL!</p>
              <p>
                Try requesting 2 devnet SOL into this address from{" "}
                <a target="_blank" href="https://solfaucet.com/">
                  Sol Faucet
                </a>
                . Then refresh this page.
              </p>
            </>
          )}
        </div>
      </div>
      <div className="footer">
        <div className="left">
          Total token supply: {totalSupply == null ? "loading..." : totalSupply}
        </div>
        <div className="right">Token address: {tokenMint.toBase58()}</div>
      </div>
    </>
  );
}

export default Game;
