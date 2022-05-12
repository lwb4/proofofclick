import fs from "mz/fs";
import * as anchor from "@project-serum/anchor";
import {
  Keypair,
  PublicKey,
  Connection,
  ConfirmOptions,
} from "@solana/web3.js";
import { Proofofclick } from "../target/types/proofofclick";

async function main() {
  const args = process.argv.slice(2);
  console.log(args);

  const programId = args[0];
  const tokenToMint = new PublicKey(args[1]);
  const userMinting = await newKeypairFromFile(args[2]);
  const userReceiving = new PublicKey(args[3]);
  const pdaAuthority = new PublicKey(args[4]);
  const bump = parseInt(args[5]);
  const tokenProgram = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  );

  const connection = new Connection("https://api.devnet.solana.com");
  const wallet = new anchor.Wallet(userMinting);
  anchor.setProvider(
    new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions()
    )
  );

  const program = await getProgram("./target/idl/proofofclick.json", programId);

  await program.methods
    .mintAndSendOneToken(bump)
    .accounts({
      tokenToMint,
      userMinting: userMinting.publicKey,
      userReceiving,
      pdaAuthority,
      tokenProgram,
    })
    .signers([userMinting])
    .rpc();
}

async function getProgram(idlFile, programId) {
  const idlFileString = await fs.readFile(idlFile, { encoding: "utf8" });
  const idl = JSON.parse(idlFileString);
  const program = new anchor.Program(idl, new PublicKey(programId));
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
