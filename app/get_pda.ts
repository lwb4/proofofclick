import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const args = process.argv.slice(2);
  const programId = args[0];

  const [mintAuthorityPDA, mintAuthorityPDABump] =
    await PublicKey.findProgramAddress(
      [anchor.utils.bytes.utf8.encode("mint")],
      new PublicKey(programId)
    );

  console.log(`mintAuthorityPDA: ${mintAuthorityPDA}`);
  console.log(`mintAuthorityPDABump: ${mintAuthorityPDABump}`);
}

// run async main
main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);
