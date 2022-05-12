import { useState } from "react";
import "./Accounts.css";
import MyLongButton from "../components/MyLongButton";
import ThreeDots from "../components/ThreeDots";
import { Keypair } from "@solana/web3.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExport, faPaperPlane } from "@fortawesome/free-solid-svg-icons";

function downloadTextStringAsFile(fileName, textString) {
  let url = URL.createObjectURL(
    new Blob([textString], { type: "application/text" })
  );
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

function Accounts({
  accounts,
  addAccount,
  setCurrentAccount,
  pageStateRouters,
}) {
  const selectAccount = (account) => {
    return () => {
      setCurrentAccount(account);
      pageStateRouters.goToGame();
    };
  };

  const createNewAccount = () => {
    addAccount(Keypair.generate());
  };
  const importAccount = () => {
    const input = document.getElementById("input");
    input.click();
    input.onchange = () => {
      // @ts-ignore
      const file = input.files[0];
      if (file == null) {
        return;
      }
      const reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onload = (e) => {
        const fileContents = e.target.result;
        // @ts-ignore
        const secretKey = JSON.parse(fileContents);
        const importedAccount = Keypair.fromSecretKey(
          Uint8Array.from(secretKey)
        );
        addAccount(importedAccount);
      };
      reader.onerror = (e) => {
        console.log(e);
      };
    };
  };

  const downloadPrivateKey = (account) => {
    return () => {
      const textString = JSON.stringify(Array.from(account.secretKey));
      const fileName = `private-key-for-${account.publicKey.toBase58()}.txt`;
      downloadTextStringAsFile(fileName, textString);
    };
  };

  const drainAccount = (account) => {
    return () => {
      setCurrentAccount(account);
      pageStateRouters.goToDrain();
    };
  };

  return (
    <div className="Accounts">
      <input type="file" id="input" hidden />
      {accounts.length == 0 ? (
        <>
          <p>To play Adventure 2D, you must first create an account.</p>
          <p>
            <b>BE WARNED</b>: The private key for this account will be stored in
            your browser's local storage. This is not very secure, and if you
            clear your browser's data the account will be lost.
          </p>
          <p>After creating an account, make sure to:</p>
          <ol>
            <li>Download the private key to a safe location</li>
            <li>
              Only put in the necessary funds to play the game. 0.01 SOL should
              be plenty.
            </li>
          </ol>
          <MyLongButton onClick={createNewAccount}>
            I understand the risks. Create a new local account.
          </MyLongButton>
          <MyLongButton onClick={importAccount}>
            I created an account already. Import a private key.
          </MyLongButton>
        </>
      ) : (
        <>
          <h2 className="center">Welcome to Adventure 2D!</h2>
          <p>Select an account to begin the game:</p>
          {accounts.map((a) => (
            <div className="account-button" key={a.publicKey.toBase58()}>
              <MyLongButton onClick={selectAccount(a)}>
                0x{a.publicKey.toBase58()}
              </MyLongButton>
              <div
                className="icon-button"
                title="Download the private key for this account"
                onClick={downloadPrivateKey(a)}
              >
                <FontAwesomeIcon icon={faFileExport} size="2x" />
              </div>
              <div
                className="icon-button"
                title="Send the balance of this account to another wallet"
                onClick={drainAccount(a)}
              >
                <FontAwesomeIcon icon={faPaperPlane} size="2x" />
              </div>
            </div>
          ))}
          <p>
            You can also{" "}
            <span className="link" onClick={createNewAccount}>
              create a new account
            </span>{" "}
            or{" "}
            <span className="link" onClick={importAccount}>
              import a private key
            </span>
            .
          </p>
          <ThreeDots />
          <p>
            To clear your accounts, clear your browsing data for this site. If
            you haven't saved your private keys, you WILL lose the entire
            balance in all of your wallets.
          </p>
        </>
      )}
    </div>
  );
}

export default Accounts;
