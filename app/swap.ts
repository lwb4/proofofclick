import fs from "mz/fs";
import * as anchor from "@project-serum/anchor";
import {
  Keypair,
  PublicKey,
  Connection,
  ConfirmOptions,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Proofofclick } from "../target/types/proofofclick";
import BN from "bn.js";

async function main() {
  const args = process.argv.slice(2);

  const payer = await newKeypairFromFile(args[0]);

  const programId = new PublicKey(
    "7khCm9h5cWdU1KBiMztMvzFiXNCum1iwGUcRVFwKhoP9"
  );
  const clickTokenMint = new PublicKey(
    "C73wX9ATj7K8K62dFqWEEG14wfupnZqUxZRTXVdEib7S"
  );
  const cursorTokenMint = new PublicKey(
    "9VaYi71F955j88tCc82FAks5iJkRf7YjEyp34MiwU34o"
  );

  const clickTokenAccount = await getAssociatedTokenAddress(
    clickTokenMint,
    payer.publicKey
  );

  const cursorTokenAccount = await getAssociatedTokenAddress(
    cursorTokenMint,
    payer.publicKey
  );

  const [pdaAuthority, _] = await PublicKey.findProgramAddress(
    [anchor.utils.bytes.utf8.encode("mint")],
    programId
  );

  const connection = new Connection("https://api.devnet.solana.com");
  const wallet = new anchor.Wallet(payer);
  anchor.setProvider(
    new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions()
    )
  );

  const program = await getProgram("./target/idl/proofofclick.json", programId);

  await program.methods
    .buyCursor(254, new BN(1))
    .accounts({
      payer: payer.publicKey,
      clickTokenMint,
      cursorTokenMint,
      clickTokenAccount,
      cursorTokenAccount,
      pdaAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([payer])
    .rpc();
}

async function getProgram(idlFile, programId) {
  const idlFileString = await fs.readFile(idlFile, { encoding: "utf8" });
  const idl = JSON.parse(idlFileString);
  const program = new anchor.Program(idl, programId);
  return program;
}

async function newKeypairFromFile(filePath) {
  const secretKeyString = await fs.readFile(filePath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
}

// run async main
main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);
