use anchor_lang::prelude::*;
use anchor_spl::token::*;
use solana_program::native_token::LAMPORTS_PER_SOL;

declare_id!("7khCm9h5cWdU1KBiMztMvzFiXNCum1iwGUcRVFwKhoP9");

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
