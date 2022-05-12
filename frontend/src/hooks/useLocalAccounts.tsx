import { useState, useEffect, useCallback } from "react";
import { Keypair } from "@solana/web3.js";

const localStorageKey = "local-accounts";

function useLocalAccounts() {
  let initialUnparsed = localStorage.getItem(localStorageKey);
  let initial = [];
  if (initialUnparsed !== null) {
    initial = JSON.parse(initialUnparsed);
  }
  const [secretKeys, setSecretKeys] = useState(initial);
  const [keyPairs, setKeyPairs] = useState(
    initial.map((sk) => Keypair.fromSecretKey(Uint8Array.from(sk)))
  );

  const addKeyPair = useCallback(
    (keyPair) => {
      let comparator = JSON.stringify(Array.from(keyPair.secretKey));
      for (let i = 0; i < secretKeys.length; i++) {
        if (JSON.stringify(secretKeys[i]) === comparator) {
          return;
        }
      }
      const newSecretKeys = [...secretKeys, keyPair.secretKey];
      setSecretKeys(newSecretKeys);
      setKeyPairs([...keyPairs, keyPair]);
      localStorage.setItem(
        localStorageKey,
        JSON.stringify(newSecretKeys.map((sk) => Array.from(sk)))
      );
    },
    [secretKeys, keyPairs, setSecretKeys, setKeyPairs]
  );

  const removeKeyPair = useCallback(
    (keyPair) => {
      debugger;
      let comparator = JSON.stringify(Array.from(keyPair.secretKey));
      for (let i = 0; i < secretKeys.length; i++) {
        if (JSON.stringify(secretKeys[i]) === comparator) {
          const newSecretKeys = secretKeys
            .slice(0, i)
            .concat(secretKeys.slice(i + 1));
          setSecretKeys(newSecretKeys);
          setKeyPairs(keyPairs.slice(0, i).concat(keyPairs.slice(i + 1)));
          localStorage.setItem(
            localStorageKey,
            JSON.stringify(newSecretKeys.map((sk) => Array.from(sk)))
          );
          return;
        }
      }
    },
    [secretKeys, keyPairs, setSecretKeys, setKeyPairs]
  );

  return [keyPairs, addKeyPair, removeKeyPair];
}

export default useLocalAccounts;
