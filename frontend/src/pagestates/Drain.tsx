import "./Drain.css";
import { useState, useEffect } from "react";
import MyIconButton from "../components/MyIconButton";
import MyButton from "../components/MyButton";
import MyLongButton from "../components/MyLongButton";
import MyLink from "../components/MyLink";
import ThreeDots from "../components/ThreeDots";
import OverlayModal from "../components/OverlayModal";
import useAccountBalance from "../hooks/useAccountBalance";
import {
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  PublicKey,
  Message,
  SystemProgram,
  Keypair,
  Transaction,
} from "@solana/web3.js";

function useSolanaFee(connection) {
  const [fee, setFee] = useState(null);

  useEffect(() => {
    connection
      .getLatestBlockhash()
      .then((res) => {
        const { blockhash } = res;
        const k1 = Keypair.generate();
        const k2 = Keypair.generate();
        const tx = new Transaction({
          feePayer: k1.publicKey,
          recentBlockhash: blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey: k1.publicKey,
            toPubkey: k2.publicKey,
            lamports: 1,
          })
        );
        tx.getEstimatedFee(connection)
          .then((res) => setFee(res / LAMPORTS_PER_SOL))
          .catch((e) => console.log(e));
      })
      .catch((e) => console.log(e));
  }, [setFee]);

  return fee;
}

const SendStatus = {
  Default: 1,
  IntendToSend: 2,
  Sending: 3,
  SendSuccessful: 4,
  SendFailure: 5,
};

function Drain({
  connection,
  removeAccount,
  currentAccount,
  pageStateRouters,
}) {
  const [sendStatus, setSendStatus] = useState(SendStatus.Default);
  const [balances, _] = useAccountBalance(connection, currentAccount);
  const fee = useSolanaFee(connection);
  const [account, setAccount] = useState("");
  const currentAccountAddress = currentAccount.publicKey.toBase58();

  const { solBalance } = balances as any;

  const drainAccount = () => {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: currentAccount.publicKey,
        toPubkey: new PublicKey(account),
        lamports: (solBalance - fee) * LAMPORTS_PER_SOL,
      })
    );

    setSendStatus(SendStatus.Sending);
    sendAndConfirmTransaction(connection, tx, [currentAccount])
      .then(() => {
        removeAccount(currentAccount);
        setSendStatus(SendStatus.SendSuccessful);
      })
      .catch((e) => {
        console.log(e);
        setSendStatus(SendStatus.SendFailure);
      });
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
          You are about to send {solBalance - fee} SOL (with fee: {fee} SOL)
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
          {solBalance == null ? "loading..." : `${solBalance} SOL`}
        </p>
        <p>
          <b>Transaction fee:</b> {fee == null ? "loading..." : `${fee} SOL`}
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
