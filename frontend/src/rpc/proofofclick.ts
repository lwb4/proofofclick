import { setProvider, Program, AnchorProvider } from "@project-serum/anchor";
import { Transaction, Keypair, Connection, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import IDL from "../../../target/idl/proofofclick.json";
import BN from "bn.js";

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

  getProgram(userAccount: Keypair) {
    const userAccountKey = userAccount.publicKey.toBase58();
    if (this.userPrograms[userAccountKey] === undefined) {
      if (this.userPrograms[userAccountKey] === undefined) {
        const wallet = new BrowserWallet(userAccount);
        setProvider(
          new AnchorProvider(
            this.connection,
            wallet,
            AnchorProvider.defaultOptions()
          )
        );
        this.userPrograms[userAccountKey] = new Program(
          IDL as any,
          this.programId
        );
      }
    }
    return this.userPrograms[userAccountKey];
  }

  async getFees(userAccount: Keypair, blockhash) {
    const [clickFee, createTokenAccountFee, deleteTokenAccountFee] =
      await Promise.all([
        this.getClickTxFee(userAccount, blockhash),
        this.getCreateAssociatedTokenAccountTxFee(userAccount, blockhash),
        this.getDeleteTokenAccountTxFee(userAccount, blockhash),
      ]);

    return {
      clickFee: clickFee.value,
      createTokenAccountFee,
      deleteTokenAccountFee,
    };
  }

  async getClickTxFee(userAccount: Keypair, blockhash) {
    const userTokenAccount = await this.getUserTokenAccount(userAccount);
    const clickTx = this.getProgram(
      userAccount
    ).transaction.mintAndSendOneToken(this.bump, new BN(1), {
      accounts: {
        tokenToMint: this.tokenToMint,
        userMinting: userAccount.publicKey,
        userReceiving: userTokenAccount,
        pdaAuthority: this.pdaAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });
    clickTx.feePayer = userAccount.publicKey;
    clickTx.recentBlockhash = blockhash;
    return await this.connection.getFeeForMessage(clickTx.compileMessage());
  }

  async getDeleteTokenAccountTxFee(userAccount: Keypair, blockhash) {
    const dest = Keypair.generate();
    const transferTokenAccountTx = new Transaction({
      feePayer: userAccount.publicKey,
      recentBlockhash: blockhash,
    }).add(
      createTransferInstruction(
        userAccount.publicKey,
        dest.publicKey,
        userAccount.publicKey,
        1
      )
    );

    const closeTokenAccountTx = new Transaction({
      feePayer: userAccount.publicKey,
      recentBlockhash: blockhash,
    }).add(
      createCloseAccountInstruction(
        userAccount.publicKey,
        dest.publicKey,
        userAccount.publicKey
      )
    );

    return (
      (
        await this.connection.getFeeForMessage(
          transferTokenAccountTx.compileMessage()
        )
      ).value +
      (
        await this.connection.getFeeForMessage(
          closeTokenAccountTx.compileMessage()
        )
      ).value
    );
  }

  async getCreateAssociatedTokenAccountTxFee(userAccount: Keypair, blockhash) {
    const associatedTokenAccount = await getAssociatedTokenAddress(
      this.tokenToMint,
      userAccount.publicKey
    );

    const createTokenAccountTx = new Transaction({
      feePayer: userAccount.publicKey,
      recentBlockhash: blockhash,
    }).add(
      createAssociatedTokenAccountInstruction(
        userAccount.publicKey,
        associatedTokenAccount,
        userAccount.publicKey,
        this.tokenToMint
      )
    );

    return (
      await this.connection.getFeeForMessage(
        createTokenAccountTx.compileMessage()
      )
    ).value;
  }

  async getUserTokenAccount(userAccount: Keypair) {
    const userAccountKey = userAccount.publicKey.toBase58();
    if (this.userTokenAccounts[userAccountKey] === undefined) {
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        userAccount,
        this.tokenToMint,
        userAccount.publicKey
      );
      this.userTokenAccounts[userAccountKey] = userTokenAccount.address;
    }
    return this.userTokenAccounts[userAccountKey];
  }

  async mintAndSendOne(userAccount: Keypair, nonce: number) {
    const tokenAccount = await this.getUserTokenAccount(userAccount);
    const program = this.getProgram(userAccount);
    await program.methods
      .mintAndSendOneToken(this.bump, new BN(nonce))
      .accounts({
        tokenToMint: this.tokenToMint,
        userMinting: userAccount.publicKey,
        userReceiving: tokenAccount,
        pdaAuthority: this.pdaAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([userAccount])
      .rpc();
  }
}

export default ProofOfClick;
