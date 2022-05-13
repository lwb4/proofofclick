import { useMemo, useState, useEffect } from "react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Keypair,
  Transaction,
} from "@solana/web3.js";

function useSolanaFees(connection, program, account) {
  const [transferFee, setTransferFee] = useState(null);
  const [clickFee, setClickFee] = useState(null);
  const [createTokenAccountFee, setCreateTokenAccountFee] = useState(null);
  const [deleteTokenAccountFee, setDeleteTokenAccountFee] = useState(null);

  const refreshFees = useMemo(() => {
    const fn = async () => {
      const { blockhash } = await connection.getLatestBlockhash();

      const k1 = Keypair.generate();
      const k2 = Keypair.generate();
      const transferTx = new Transaction({
        feePayer: k1.publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: k1.publicKey,
          toPubkey: k2.publicKey,
          lamports: 1,
        })
      );

      const [transferFeeVal, otherFeesVal] = await Promise.all([
        transferTx.getEstimatedFee(connection),
        program.getFees(account, blockhash),
      ]);

      setTransferFee(transferFeeVal);
      setClickFee(otherFeesVal.clickFee);
      setCreateTokenAccountFee(otherFeesVal.createTokenAccountFee);
      setDeleteTokenAccountFee(otherFeesVal.deleteTokenAccountFee);
    };
    return () => fn().catch(console.error);
  }, [
    connection,
    program,
    account,
    setTransferFee,
    setClickFee,
    setCreateTokenAccountFee,
    setDeleteTokenAccountFee,
  ]);

  useEffect(() => {
    refreshFees();
  }, [refreshFees]);

  return {
    transferFee,
    clickFee,
    createTokenAccountFee,
    deleteTokenAccountFee,
    refreshFees,
  };
}

export default useSolanaFees;
