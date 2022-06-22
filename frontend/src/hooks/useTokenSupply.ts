import { useState, useEffect } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getMint, MintLayout } from "@solana/spl-token";

function useTokenSupply(connection: Connection, tokenMint: PublicKey) {
  const [supply, setSupply] = useState(null);

  useEffect(() => {
    let listener;
    async function init() {
      const mint = await getMint(connection, tokenMint);
      setSupply(Number(mint.supply / BigInt(LAMPORTS_PER_SOL)));
      listener = connection.onAccountChange(
        tokenMint,
        ({ data }, _) => {
          const rawMint = MintLayout.decode(data);
          setSupply(Number(rawMint.supply / BigInt(LAMPORTS_PER_SOL)));
        },
        "processed"
      );
    }
    init();
    return () => {
      connection.removeAccountChangeListener(listener);
    };
  }, [connection, tokenMint, setSupply]);

  return supply;
}

export default useTokenSupply;
