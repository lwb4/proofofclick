import { useState, useEffect, useMemo } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AccountLayout } from "@solana/spl-token";

function useTokenAccountBalance(connection, account, tokenMint) {
  const [tokenBalance, setTokenBalance] = useState(null);
  const [tokenBalances, setTokenBalances] = useState({});
  // Check token balances, similar to the above but made more complicated
  // by the fact that a wallet can have multiple token accounts for the
  // same mint. We store each wallet address in an object and sum them
  // together into a single value on change.
  useEffect(() => {
    if (account == null || connection == null || tokenMint == null) {
      return;
    }
    let accountChangeListeners = [];
    async function init() {
      const tokenBalanceResponse =
        await connection.getTokenAccountsByOwner(account.publicKey, {
          mint: tokenMint,
        });
      const tokenBalancePromises = tokenBalanceResponse.value.map(
        ({ pubkey }) => new Promise((resolve, reject) => {
          connection.getTokenAccountBalance(pubkey)
            .then(val => resolve([pubkey, val]))
            .catch(reject);
        })
      );
      const tokenBalances = await Promise.all(tokenBalancePromises);
      const tokenValues = tokenBalances
        .map(([pk, res]) => [pk, res.value.uiAmount]);
      setTokenBalances(Object.fromEntries(tokenValues));
      accountChangeListeners = tokenBalanceResponse.value.map(
        ({ pubkey }) => connection.onAccountChange(
          pubkey,
          ({ data }, _) => {
            const rawAccount = AccountLayout.decode(data);
            setTokenBalances(balances => ({
              ...balances,
              [pubkey.toString()]: Number(rawAccount.amount / BigInt(LAMPORTS_PER_SOL)),
            }));
          },
          "processed",
        )
      );
    }
    init();
    return () => {
      async function cleanUp() {
        await Promise.all(
          accountChangeListeners.map(
            connection.removeAccountChangeListener));
      }
      cleanUp();
    }
  }, [connection, account, tokenMint, setTokenBalances]);


  // Sum together balances for all associated token addresses whenever any
  // of them change.
  useEffect(() => {
    if (Object.values(tokenBalances).length > 0) {
      setTokenBalance(
        Object.values(tokenBalances).reduce((a: any, b: any) => a + b, 0));
    }
  }, [tokenBalances, setTokenBalance]);
  
  return tokenBalance;
}

function useAccountBalance(
  connection,
  account,
  tokenMint,
  cursorMint,
) {
  const [solBalance, setSolBalance] = useState(null);
  const tokenBalance = useTokenAccountBalance(connection, account, tokenMint);
  const cursorBalance = useTokenAccountBalance(connection, account, cursorMint);

  // Keep the balances up to date by connecting via the WebSocket API
  // However, the WebSocket API only sends messages when the balance
  // changes, so we still have to check the initial value manually
  useEffect(() => {
    if (account == null || connection == null) {
      return;
    }
    async function init() {
      const solBalanceValue = await connection.getBalance(account.publicKey);
      setSolBalance(solBalanceValue / LAMPORTS_PER_SOL);
    }
    init();
    const accountChangeListener = connection.onAccountChange(
      account.publicKey,
      ({ lamports }, _) => {
        setSolBalance(lamports / LAMPORTS_PER_SOL);
      },
      "processed",
    );
    return () => {
      async function cleanUp() {
        await connection.removeAccountChangeListener(accountChangeListener);
      }
      cleanUp();
    };
  }, [connection, account, setSolBalance]);

  return { solBalance, tokenBalance, cursorBalance };
}

export default useAccountBalance;
