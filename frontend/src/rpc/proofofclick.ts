import { setProvider, Program, AnchorProvider } from "@project-serum/anchor";
import {
  SYSVAR_RENT_PUBKEY,
  Transaction,
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
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
  clickTokenMint: PublicKey;
  cursorTokenMint: PublicKey;
  pdaAuthority: PublicKey;
  bump: number;

  userTokenAccounts: any;
  userPrograms: any;
  mintV2Accounts: any;
  hasInitialized: any;

  constructor(
    connection: Connection,
    programId: PublicKey,
    clickTokenMint: PublicKey,
    cursorTokenMint: PublicKey,
    pdaAuthority: PublicKey,
    bump: number
  ) {
    this.connection = connection;
    this.clickTokenMint = clickTokenMint;
    this.cursorTokenMint = cursorTokenMint;
    this.pdaAuthority = pdaAuthority;
    this.bump = bump;
    this.programId = programId;

    // map for storing user's associated token accounts
    this.userTokenAccounts = {};

    // map for storing user's anchor program objects
    this.userPrograms = {};

    // optimization so we don't have to query the network for the
    // mint V2 API accounts every time
    this.mintV2Accounts = {};

    // optimization so we don't initialize more than once per run
    this.hasInitialized = {};
  }

  // FEES CODE
  // (not very accurate, doesn't take rent exemption into account)

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
        tokenToMint: this.clickTokenMint,
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
      this.clickTokenMint,
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
        this.clickTokenMint
      )
    );

    return (
      await this.connection.getFeeForMessage(
        createTokenAccountTx.compileMessage()
      )
    ).value;
  }

  // used for caching associated token account and program initialization

  async getUserTokenAccount(userAccount: Keypair) {
    const userAccountKey = userAccount.publicKey.toBase58();
    if (this.userTokenAccounts[userAccountKey] === undefined) {
      const userTokenAccount = await getAssociatedTokenAddress(
        this.clickTokenMint,
        userAccount.publicKey
      );
      this.userTokenAccounts[userAccountKey] = userTokenAccount;
    }
    return this.userTokenAccounts[userAccountKey];
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

  // v1 of the mint and send API
  async mintAndSendOne(userAccount: Keypair, nonce: number) {
    const tokenAccount = await this.getUserTokenAccount(userAccount);
    const program = this.getProgram(userAccount);
    await program.methods
      .mintAndSendOneToken(this.bump, new BN(nonce))
      .accounts({
        tokenToMint: this.clickTokenMint,
        userMinting: userAccount.publicKey,
        userReceiving: tokenAccount,
        pdaAuthority: this.pdaAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([userAccount])
      .rpc();
  }

  // v2 of the mint and send API has three parts: init, mint, and swap

  // pretty much all of the V2 apis use the same accounts structure, so this helper
  // function helps to organize them
  async getMintV2Accounts(userAccount: Keypair) {
    const userAccountKey = userAccount.publicKey.toBase58();
    if (this.mintV2Accounts[userAccountKey] === undefined) {
      const clickTokenAccount = await getAssociatedTokenAddress(
        this.clickTokenMint,
        userAccount.publicKey
      );
      const cursorTokenAccount = await getAssociatedTokenAddress(
        this.cursorTokenMint,
        userAccount.publicKey
      );
      this.mintV2Accounts[userAccountKey] = {
        payer: userAccount.publicKey,
        clickTokenMint: this.clickTokenMint,
        cursorTokenMint: this.cursorTokenMint,
        clickTokenAccount,
        cursorTokenAccount,
        pdaAuthority: this.pdaAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      };
    }
    return this.mintV2Accounts[userAccountKey];
  }

  // init makes sure all the associated token accounts exist for a given account
  async initializeMintV2(userAccount: Keypair) {
    const userAccountKey = userAccount.publicKey.toBase58();
    if (this.hasInitialized[userAccountKey]) {
      return;
    }

    let accounts = await this.getMintV2Accounts(userAccount);
    accounts = {
      ...accounts,
      systemProgram: SystemProgram.programId,
    };
    const program = this.getProgram(userAccount);
    await program.methods
      .initializeMintV2()
      .accounts(accounts)
      .signers([userAccount])
      .rpc();

    this.hasInitialized[userAccountKey] = true;
  }

  // uses your cursor balance to determine how many click tokens you get
  async mintBasedOnBalances(userAccount: Keypair, nonce: number) {
    await this.initializeMintV2(userAccount);
    const accounts = await this.getMintV2Accounts(userAccount);
    const program = this.getProgram(userAccount);
    await program.methods
      .mintBasedOnBalances(new BN(nonce))
      .accounts(accounts)
      .signers([userAccount])
      .rpc();
  }

  // burn 50 click and mint 1 cursor
  async buyCursor(userAccount: Keypair, nonce: number) {
    await this.initializeMintV2(userAccount);
    const accounts = await this.getMintV2Accounts(userAccount);
    const program = this.getProgram(userAccount);
    await program.methods
      .buyCursor(new BN(nonce))
      .accounts(accounts)
      .signers([userAccount])
      .rpc();
  }
}

export default ProofOfClick;
