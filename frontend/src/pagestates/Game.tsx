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
  cursorTokenMint,
  program,
}) {
  const [nonce, setNonce] = useState(0);
  const balances = useAccountBalance(
    connection,
    currentAccount,
    tokenMint,
    cursorTokenMint
  );
  const { solBalance, tokenBalance, cursorBalance } = balances as any;
  const { clickFee, refreshFees } = useSolanaFees(
    connection,
    program,
    currentAccount
  );
  const totalSupply = useTokenSupply(connection, tokenMint);
  const totalCursorSupply = useTokenSupply(connection, cursorTokenMint);

  const [unconfirmedTokenBalance, setUnconfirmedTokenBalance] = useState(null);
  const [unconfirmedCursorBalance, setUnconfirmedCursorBalance] =
    useState(null);

  const getNonce = () => {
    const ret = nonce;
    setNonce((x) => x + 1);
    return ret;
  };

  useEffect(() => {
    if (clickFee == null && refreshFees != null) {
      refreshFees();
    }
  }, [balances, clickFee, refreshFees]);

  useEffect(() => {
    if (
      tokenBalance !== null &&
      unconfirmedTokenBalance === null
    ) {
      setUnconfirmedTokenBalance(tokenBalance);
    }
    if (
      cursorBalance !== null &&
      unconfirmedCursorBalance === null
    ) {
      setUnconfirmedCursorBalance(cursorBalance);
    }
  }, [
    balances,
    unconfirmedTokenBalance,
    setUnconfirmedTokenBalance,
    unconfirmedCursorBalance,
    setUnconfirmedCursorBalance,
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

  const clickToMintToken = async () => {
    setUnconfirmedTokenBalance((x) => x + 1 + cursorBalance);
    await program.mintBasedOnBalances(currentAccount, getNonce());
  };

  const buyCursor = async () => {
    if (tokenBalance < 50) {
      return;
    }
    setUnconfirmedTokenBalance((x) => x - 50);
    setUnconfirmedCursorBalance((x) => x + 1);
    await program.buyCursor(currentAccount, getNonce());
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
                {tokenBalance == null
                  ? "loading..."
                  : tokenBalance}
                {tokenBalance === unconfirmedTokenBalance ? null : (
                  <span className="orange">{" "}(pending: {unconfirmedTokenBalance})</span>
                )}
              </p>
              <MyButton onClick={clickToMintToken}>
                CLICK ME FOR TOKENS (
                {clickFee != null ? (
                  <>costs {clickFee / LAMPORTS_PER_SOL} SOL</>
                ) : (
                  <>loading fee...</>
                )}
                )
              </MyButton>
              <p>
                Cursor balance:{" "}
                {cursorBalance == null
                  ? "loading..."
                  : cursorBalance}
                {cursorBalance === unconfirmedCursorBalance ? null : (
                  <span className="orange">{" "}(pending: {unconfirmedCursorBalance})</span>
                )}
              </p>
              <MyButton disabled={tokenBalance < 50 || unconfirmedTokenBalance < 50} onClick={buyCursor}>
                BUY CURSOR FOR 50 TOKENS (
                {clickFee != null ? (
                  <>costs {clickFee / LAMPORTS_PER_SOL} SOL</>
                ) : (
                  <>loading fee...</>
                )}
                )
              </MyButton>
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
          <p>
            Total token supply:{" "}
            {totalSupply == null ? "loading..." : totalSupply}
          </p>
          <p>
            Total cursor supply:{" "}
            {totalCursorSupply == null ? "loading..." : totalCursorSupply}
          </p>
        </div>
        <div className="right">
          <p>Token address: <a target="_blank" href={`https://solanabeach.io/address/${tokenMint.toBase58()}?cluster=devnet`}>{tokenMint.toBase58()}</a></p>
          <p>Cursor address: <a target="_blank" href={`https://solanabeach.io/address/${cursorTokenMint.toBase58()}?cluster=devnet`}>{cursorTokenMint.toBase58()}</a></p>
        </div>
      </div>
    </>
  );
}

export default Game;
