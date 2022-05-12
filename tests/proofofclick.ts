import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Proofofclick } from "../target/types/proofofclick";

describe("proofofclick", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Proofofclick as Program<Proofofclick>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
