use anchor_lang::prelude::*;
use anchor_spl::token::*;
use anchor_spl::associated_token::*;
use solana_program::pubkey;
use solana_program::native_token::LAMPORTS_PER_SOL;

declare_id!("7khCm9h5cWdU1KBiMztMvzFiXNCum1iwGUcRVFwKhoP9");

static CLICK_TOKEN: Pubkey = pubkey!("C73wX9ATj7K8K62dFqWEEG14wfupnZqUxZRTXVdEib7S");
static CURSOR_TOKEN: Pubkey = pubkey!("9VaYi71F955j88tCc82FAks5iJkRf7YjEyp34MiwU34o");

#[program]
pub mod proofofclick {
    use super::*;

    // Mint a fungible token specified by token_to_mint.
    // Mint only one token, and send it to user_receiving.
    // user_minting pays for this operation.
    // token_to_mint must have pda_authority as an authorized minting authority.
    // There is no initialize function; initialization is a manual operation outside of this
    // program.
    pub fn mint_and_send_one_token(ctx: Context<MintSendToken>, bump: u8, _nonce: u64) -> Result<()> {

        let mint_to_ix = MintTo{
            mint: ctx.accounts.token_to_mint.to_account_info(),
            to: ctx.accounts.user_receiving.clone(),
            authority: ctx.accounts.pda_authority.to_account_info(),
        };

        let bump_seed = &[bump];
        let inner_seed = &[b"mint".as_ref(), bump_seed][..];
        let seeds = &[inner_seed][..];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_to_ix,
            seeds,
        );

        anchor_spl::token::mint_to(cpi_ctx, LAMPORTS_PER_SOL)?;

        Ok(())
    }

    // v2 of the click endpoint involves an initialization step. Instead of creating all the
    // accounts yourself, just call this endpoint and it will create them for you.
    pub fn initialize_mint_v2(ctx: Context<InitMint2>) -> Result<()> {
        msg!("Initialized PDA authority: {:?}", ctx.accounts.pda_authority.to_account_info().key);
        Ok(())
    }

    // This is v2 of the click endpoint.
    // Instead of minting one token to the specified address, it mints a number of CLICK tokens
    // equal to the balance of CURSOR tokens associated with this user.
    // The token mints are hard-coded and validated.
    pub fn mint_based_on_balances(ctx: Context<MintBalances>, _nonce: u64) -> Result<()> {
        let num_clicks = ctx.accounts.cursor_token_account.amount;

        let mint_to_ix = MintTo{
            mint: ctx.accounts.click_token_mint.to_account_info(),
            to: ctx.accounts.click_token_account.to_account_info(),
            authority: ctx.accounts.pda_authority.to_account_info(),
        };

        let bump_seed = &[254];
        let inner_seed = &[b"mint".as_ref(), bump_seed][..];
        let seeds = &[inner_seed][..];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_to_ix,
            seeds,
        );

        anchor_spl::token::mint_to(cpi_ctx, num_clicks + LAMPORTS_PER_SOL)?;

        Ok(())
    }

    // Trade 50 CLICK for 1 CURSOR
    pub fn buy_cursor(ctx: Context<BuyCursor>, _nonce: u64) -> Result<()> {

        let burn_ix = Burn{
            mint: ctx.accounts.click_token_mint.to_account_info(),
            from: ctx.accounts.click_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            burn_ix,
        );

        anchor_spl::token::burn(cpi_ctx, 50 * LAMPORTS_PER_SOL)?;

        let mint_to_ix = MintTo{
            mint: ctx.accounts.cursor_token_mint.to_account_info(),
            to: ctx.accounts.cursor_token_account.to_account_info(),
            authority: ctx.accounts.pda_authority.to_account_info(),
        };

        let bump_seed = &[254];
        let inner_seed = &[b"mint".as_ref(), bump_seed][..];
        let seeds = &[inner_seed][..];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_to_ix,
            seeds,
        );

        anchor_spl::token::mint_to(cpi_ctx, LAMPORTS_PER_SOL)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitMint2<'info> {
    // The person who is minting
    #[account(mut)]
    pub payer: Signer<'info>,

    // The CLICK token mint
    #[account(address = CLICK_TOKEN)]
    pub click_token_mint: Account<'info, Mint>,

    // The CURSOR token mint
    #[account(address = CURSOR_TOKEN)]
    pub cursor_token_mint: Account<'info, Mint>,

    // The payer's CLICK token account, where tokens will be minted to
    #[account(init_if_needed, payer = payer, associated_token::mint = click_token_mint, associated_token::authority = payer)]
    pub click_token_account: Account<'info, TokenAccount>,

    // The payer's CURSOR token account, which will determine the amount of CLICK minted
    #[account(init_if_needed, payer = payer, associated_token::mint = cursor_token_mint, associated_token::authority = payer)]
    pub cursor_token_account: Account<'info, TokenAccount>,

    // The minting authority for CLICK tokens
    #[account(init_if_needed, payer = payer, space = 8, seeds = [b"mint"], bump)]
    pub pda_authority: Account<'info, PDAAuthority>,

    // The SPL token program
    pub token_program: Program<'info, Token>,

    // The SPL associated token account program
    pub associated_token_program: Program<'info, AssociatedToken>,

    // The System Program
    pub system_program: Program<'info, System>,

    // Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

// PDAAuthority is a no-op PDA account to act as the authority for token mints
#[account]
pub struct PDAAuthority {}

// MintBalances has the same properties as InitMint2
#[derive(Accounts)]
pub struct MintBalances<'info> {
    // The person who is minting
    pub payer: Signer<'info>,

    // The CLICK token mint
    #[account(mut, address = CLICK_TOKEN)]
    pub click_token_mint: Account<'info, Mint>,

    // The CURSOR token mint
    #[account(address = CURSOR_TOKEN)]
    pub cursor_token_mint: Account<'info, Mint>,

    // The payer's CLICK token account, where tokens will be minted to
    #[account(mut, associated_token::mint = click_token_mint, associated_token::authority = payer)]
    pub click_token_account: Account<'info, TokenAccount>,

    // The payer's CURSOR token account, which will determine the amount of CLICK minted
    #[account(associated_token::mint = cursor_token_mint, associated_token::authority = payer)]
    pub cursor_token_account: Account<'info, TokenAccount>,

    // The minting authority for CLICK tokens
    #[account(seeds = [b"mint"], bump)]
    pub pda_authority: Account<'info, PDAAuthority>,

    // The SPL token program
    pub token_program: Program<'info, Token>,

    // The SPL associated token account program
    pub associated_token_program: Program<'info, AssociatedToken>,

    // Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyCursor<'info> {
    // The person who is minting
    pub payer: Signer<'info>,

    // The CLICK token mint
    #[account(mut, address = CLICK_TOKEN)]
    pub click_token_mint: Account<'info, Mint>,

    // The CURSOR token mint
    #[account(mut, address = CURSOR_TOKEN)]
    pub cursor_token_mint: Account<'info, Mint>,

    // The payer's CLICK token account, where tokens will be minted to
    #[account(mut, associated_token::mint = click_token_mint, associated_token::authority = payer)]
    pub click_token_account: Account<'info, TokenAccount>,

    // The payer's CURSOR token account, which will determine the amount of CLICK minted
    #[account(mut, associated_token::mint = cursor_token_mint, associated_token::authority = payer)]
    pub cursor_token_account: Account<'info, TokenAccount>,

    // The minting authority for CLICK tokens
    #[account(seeds = [b"mint"], bump)]
    pub pda_authority: Account<'info, PDAAuthority>,

    // The SPL token program
    pub token_program: Program<'info, Token>,

    // The SPL associated token account program
    pub associated_token_program: Program<'info, AssociatedToken>,

    // Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintSendToken<'info> {
    // The token to mint. This program must have authority to mint the token.
    #[account(mut)]
    pub token_to_mint: Account<'info, Mint>,

    // The user who will be minting the token. This person pays for everything.
    pub user_minting: Signer<'info>,

    // The token address where newly minted tokens will be sent.
    /// CHECK: idk how else to do this
    #[account(mut)]
    pub user_receiving: AccountInfo<'info>,

    // An address derived from this program with the seed "mint", which acts as the minting authority for token_to_mint.
    /// CHECK: Only used as a signing PDA.
    pub pda_authority: UncheckedAccount<'info>,

    // The SPL token program.
    pub token_program: Program<'info, Token>,
}
