import "./Drain.css";
import { useState, useEffect } from "react";
import MyIconButton from "../components/MyIconButton";
import MyButton from "../components/MyButton";
import MyLongButton from "../components/MyLongButton";
import MyLink from "../components/MyLink";
import ThreeDots from "../components/ThreeDots";
import OverlayModal from "../components/OverlayModal";
import useAccountBalance from "../hooks/useAccountBalance";
import useSolanaFees from "../hooks/useSolanaFees";
import {
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  closeAccount,
  transfer,
} from "@solana/spl-token";

const SendStatus = {
  Default: 1,
  IntendToSend: 2,
  Sending: 3,
  SendSuccessful: 4,
  SendFailure: 5,
};

function useDoesTokenAccountExist(connection, account, tokenMint) {
  const [exists, setExists] = useState(null);

  useEffect(() => {
    const fn = async () => {
      if (account == null) {
        return false;
      }
      const associatedTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        account
      );
      try {
        await getAccount(connection, associatedTokenAccount);
        return true;
      } catch (error) {
        return false;
      }
    };
    fn()
      .then((x) => setExists(x))
      .catch(console.error);
  }, [setExists, connection, account, tokenMint]);

  return exists;
}

function Drain({
  connection,
  removeAccount,
  currentAccount,
  pageStateRouters,
  tokenMint,
  cursorTokenMint,
  program,
}) {
  const [sendStatus, setSendStatus] = useState(SendStatus.Default);
  const balances = useAccountBalance(
    connection,
    currentAccount,
    tokenMint,
    cursorTokenMint,
  );
  const { transferFee, createTokenAccountFee, deleteTokenAccountFee } =
    useSolanaFees(connection, program, currentAccount);
  const [account, setAccount] = useState("");
  const [accountPubkey, setAccountPubkey] = useState(null);
  const currentAccountAddress = currentAccount.publicKey.toBase58();
  const sourceTokenAccountExists = useDoesTokenAccountExist(
    connection,
    currentAccount.publicKey,
    tokenMint
  );
  const destTokenAccountExists = useDoesTokenAccountExist(
    connection,
    accountPubkey,
    tokenMint
  );

  useEffect(() => {
    try {
      setAccountPubkey(new PublicKey(account));
    } catch (e) {
      setAccountPubkey(null);
    }
  }, [account, setAccountPubkey]);

  const { solBalance, tokenBalance } = balances as any;

  const totalFees = () => {
    if (transferFee == null || deleteTokenAccountFee == null) {
      return null;
    }
    let amount = transferFee;
    if (tokenBalance > 0 && sourceTokenAccountExists) {
      amount += deleteTokenAccountFee;
      if (!destTokenAccountExists) {
        amount += createTokenAccountFee;
      }
    }
    return amount / LAMPORTS_PER_SOL;
  };

  const drainAccount = async () => {
    setSendStatus(SendStatus.Sending);

    let updatedSolBalance = solBalance;
    if (tokenBalance > 0 && sourceTokenAccountExists) {
      try {
        const sourceAccount = await getAssociatedTokenAddress(
          tokenMint,
          currentAccount.publicKey
        );
        const destAccount = (
          await getOrCreateAssociatedTokenAccount(
            connection,
            currentAccount,
            tokenMint,
            accountPubkey
          )
        ).address;

        await transfer(
          connection,
          currentAccount,
          sourceAccount,
          destAccount,
          currentAccount.publicKey,
          tokenBalance * LAMPORTS_PER_SOL
        );

        await closeAccount(
          connection,
          currentAccount,
          sourceAccount,
          destAccount,
          currentAccount
        );

        updatedSolBalance =
          (await connection.getBalance(currentAccount.publicKey)) /
          LAMPORTS_PER_SOL;
      } catch (e) {
        console.log(e);
        setSendStatus(SendStatus.SendFailure);
        return;
      }
    }

    const sendTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: currentAccount.publicKey,
        toPubkey: new PublicKey(account),
        lamports: updatedSolBalance * LAMPORTS_PER_SOL - transferFee,
      })
    );
    try {
      await sendAndConfirmTransaction(connection, sendTx, [currentAccount]);
      removeAccount(currentAccount);
      setSendStatus(SendStatus.SendSuccessful);
    } catch (e) {
      console.log(e);
      setSendStatus(SendStatus.SendFailure);
    }
  };

  let sendingModal = null;
  if (sendStatus === SendStatus.Sending) {
    sendingModal = (
      <OverlayModal>
        <p>Sending {solBalance} SOL...</p>
        <p>
          <b>From:</b> {currentAccountAddress}
        </p>
        <p>
          <b>To:</b> {account}
        </p>
        <p>This may take a while -- DO NOT close this browser window!</p>
      </OverlayModal>
    );
  } else if (sendStatus === SendStatus.SendSuccessful) {
    sendingModal = (
      <OverlayModal>
        <p>Success!</p>
        <MyButton onClick={pageStateRouters.goToAccounts}>
          Return to accounts page.
        </MyButton>
      </OverlayModal>
    );
  } else if (sendStatus === SendStatus.SendFailure) {
    sendingModal = (
      <OverlayModal>
        <p>
          <b>Transaction failed!</b>
        </p>
        <p>View the console for more information.</p>
        <MyButton onClick={() => setSendStatus(SendStatus.Default)}>
          Huh... okay.
        </MyButton>
      </OverlayModal>
    );
  } else if (sendStatus === SendStatus.IntendToSend) {
    sendingModal = (
      <OverlayModal>
        <p>
          You are about to send {solBalance - totalFees()} SOL (with fee:{" "}
          {totalFees()} SOL), as well as a balance of {tokenBalance} tokens.
        </p>
        <p>
          <b>From:</b> {currentAccountAddress}
        </p>
        <p>
          <b>To:</b> {account}
        </p>
        <p>
          If the transaction is successful, the private key for this account
          will be erased from local storage, making it inaccessible. Unless you
          have saved the private key, you WILL lose access to this account
          forever.
        </p>
        <MyLongButton onClick={drainAccount}>
          I understand. Send the balance and delete this account.
        </MyLongButton>
        <p>
          <MyLink
            onClick={() => setSendStatus(SendStatus.Default)}
            value="Wait, I don't want to do this! Take me back."
          />
        </p>
      </OverlayModal>
    );
  }

  return (
    <>
      <div className="Drain">
        <h2 className="center">Drain Account</h2>
        <p>
          <b>Account:</b> {currentAccount.publicKey.toBase58()}
        </p>
        <p>
          <b>Balance:</b>{" "}
          {solBalance == null ? "loading..." : `${solBalance} SOL`} +{" "}
          {tokenBalance == null ? "loading..." : `${tokenBalance} tokens`}
        </p>
        <p>
          <b>Transaction fee:</b>{" "}
          {totalFees() == null ? "loading..." : `${totalFees()} SOL`}
        </p>
        <p>
          Enter an account address below. This operation will drain the account
          of its entire balance and delete it from local storage. Unless you
          saved the private key, you will not be able to access this account
          again.
        </p>
        <div className="input-row">
          <input
            type="text"
            id="destination-account"
            autoComplete="off"
            autoFocus
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
          <MyIconButton
            onClick={() => setSendStatus(SendStatus.IntendToSend)}
            icon="paper-plane"
          />
        </div>
        <ThreeDots />
        <MyLink
          onClick={pageStateRouters.goToAccounts}
          value="Never mind, take me back."
        />
      </div>
      {sendingModal}
    </>
  );
}

export default Drain;
