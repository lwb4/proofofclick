import { useState, useEffect, useCallback } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

function useAccountBalance(connection, account, tokenMint, oneShot?) {
  const [solBalance, setSolBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);

  const refreshBalances = useCallback(() => {
    if (account == null || connection == null) {
      return;
    }
    connection
      .getBalance(account.publicKey)
      .then((res) => setSolBalance(res / LAMPORTS_PER_SOL))
      .catch((e) => console.log(e));

    if (tokenMint == null) {
      return;
    }
    connection
      .getTokenAccountsByOwner(account.publicKey, { mint: tokenMint })
      .then((res) => {
        const promises = res.value.map(({ pubkey }) =>
          connection.getTokenAccountBalance(pubkey)
        );
        Promise.all(promises)
          .then((responses) => {
            const sum = responses
              .map((res) => res.value.uiAmount)
              .reduce((prev, curr) => prev + curr, 0);
            setTokenBalance(sum);
          })
          .catch((e) => console.log(e));
      })
      .catch((e) => console.log(e));
  }, [account, setSolBalance, setTokenBalance, connection]);

  useEffect(() => {
    refreshBalances();
    if (!oneShot) {
      const interval = setInterval(refreshBalances, 2000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [refreshBalances, oneShot]);

  return [{ solBalance, tokenBalance }, refreshBalances];
}

export default useAccountBalance;
