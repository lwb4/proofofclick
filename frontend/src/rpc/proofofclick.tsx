import { setProvider, Program, AnchorProvider } from "@project-serum/anchor";
import { Transaction, Keypair, Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const IDL: any = {
  version: "0.1.0",
  name: "proofofclick",
  instructions: [
    {
      name: "mintAndSendOneToken",
      accounts: [
        {
          name: "tokenToMint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userMinting",
          isMut: false,
          isSigner: true,
        },
        {
          name: "userReceiving",
          isMut: true,
          isSigner: false,
        },
        {
          name: "pdaAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "bump",
          type: "u8",
        },
        {
          name: "nonce",
          type: "u8",
        },
      ],
    },
  ],
};

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

class BrowserWallet {
  constructor(readonly payer: Keypair) {}

  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return txs.map((t) => {
      t.partialSign(this.payer);
      return t;
    });
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}

class ProofOfClick {
  connection: Connection;
  programId: PublicKey;
  tokenToMint: PublicKey;
  pdaAuthority: PublicKey;
  bump: number;

  userTokenAccounts: any;
  userPrograms: any;

  constructor(
    connection: Connection,
    programId: PublicKey,
    tokenToMint: PublicKey,
    pdaAuthority: PublicKey,
    bump: number
  ) {
    this.connection = connection;
    this.tokenToMint = tokenToMint;
    this.pdaAuthority = pdaAuthority;
    this.bump = bump;
    this.programId = programId;

    // map for storing user's associated token accounts
    this.userTokenAccounts = {};

    // map for storing user's anchor program objects
    this.userPrograms = {};
  }

  async mintAndSendOne(userAccount: Keypair, nonce: number) {
    const userAccountKey = userAccount.publicKey.toBase58();
    if (this.userTokenAccounts[userAccountKey] === undefined) {
      this.userTokenAccounts[userAccountKey] = await findAssociatedTokenAddress(
        userAccount.publicKey,
        this.tokenToMint
      );
    }

    if (this.userPrograms[userAccountKey] === undefined) {
      const wallet = new BrowserWallet(userAccount);
      setProvider(
        new AnchorProvider(
          this.connection,
          wallet,
          AnchorProvider.defaultOptions()
        )
      );
      this.userPrograms[userAccountKey] = new Program(IDL, this.programId);
    }

    await this.userPrograms[userAccountKey].methods
      .mintAndSendOneToken(this.bump, nonce)
      .accounts({
        tokenToMint: this.tokenToMint,
        userMinting: userAccount.publicKey,
        userReceiving: this.userTokenAccounts[userAccountKey],
        pdaAuthority: this.pdaAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([userAccount])
      .rpc();
  }
}

async function findAssociatedTokenAddress(
  walletAddress: PublicKey,
  tokenMintAddress: PublicKey
): Promise<PublicKey> {
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    )
  )[0];
}

export default ProofOfClick;
