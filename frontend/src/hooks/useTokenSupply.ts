import { useState, useEffect } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";

function useTokenSupply(connection: Connection, tokenMint: PublicKey) {
  const [supply, setSupply] = useState(null);

  useEffect(() => {
    const fn = async () => {
      const mint = await getMint(connection, tokenMint);
      setSupply(Number(mint.supply / BigInt(LAMPORTS_PER_SOL)));
    };
    const refreshSupply = () => fn().catch(console.log);

    refreshSupply();
    const interval = setInterval(refreshSupply, 4000);
    return () => {
      clearInterval(interval);
    };
  }, [setSupply, connection, tokenMint]);

  return supply;
}

export default useTokenSupply;
