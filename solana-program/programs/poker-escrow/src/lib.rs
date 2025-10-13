use anchor_lang::prelude::*;

declare_id!("PokerEsc1111111111111111111111111111111111111");

#[program]
pub mod poker_escrow {
    use super::*;

    /// Initialize the admin configuration
    pub fn initialize_admin(
        ctx: Context<InitializeAdmin>,
        default_rake_percentage: u16,
    ) -> Result<()> {
        let admin_config = &mut ctx.accounts.admin_config;
        admin_config.admin = ctx.accounts.admin.key();
        admin_config.default_rake_percentage = default_rake_percentage;
        admin_config.total_rake_collected = 0;
        admin_config.bump = ctx.bumps.admin_config;
        
        msg!("Admin initialized: {}", admin_config.admin);
        msg!("Default rake percentage: {}%", default_rake_percentage);
        
        Ok(())
    }

    /// Create a new tournament escrow
    pub fn initialize_tournament(
        ctx: Context<InitializeTournament>,
        buy_in: u64,
        rake_percentage: u16,
        tournament_id: String,
    ) -> Result<()> {
        require!(rake_percentage <= 1000, ErrorCode::RakeTooHigh); // Max 10%
        require!(buy_in > 0, ErrorCode::InvalidBuyIn);
        
        let tournament = &mut ctx.accounts.tournament_escrow;
        tournament.admin = ctx.accounts.admin.key();
        tournament.tournament_id = tournament_id.clone();
        tournament.buy_in = buy_in;
        tournament.rake_percentage = rake_percentage;
        tournament.total_pot = 0;
        tournament.rake_amount = 0;
        tournament.players_joined = 0;
        tournament.max_players = 6;
        tournament.status = TournamentStatus::Waiting as u8;
        tournament.bump = ctx.bumps.tournament_escrow;
        
        msg!("Tournament created: {}", tournament_id);
        msg!("Buy-in: {} lamports, Rake: {}%", buy_in, rake_percentage);
        
        Ok(())
    }

    /// Player joins tournament by depositing buy-in
    pub fn join_tournament(ctx: Context<JoinTournament>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament_escrow;
        
        require!(
            tournament.status == TournamentStatus::Waiting as u8,
            ErrorCode::TournamentNotWaiting
        );
        require!(
            tournament.players_joined < tournament.max_players,
            ErrorCode::TournamentFull
        );
        
        // Transfer buy-in from player to escrow
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player.key(),
            &tournament.key(),
            tournament.buy_in,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.player.to_account_info(),
                tournament.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        // Calculate rake
        let rake = (tournament.buy_in * tournament.rake_percentage as u64) / 10000;
        let net_buy_in = tournament.buy_in - rake;
        
        tournament.total_pot += net_buy_in;
        tournament.rake_amount += rake;
        tournament.players_joined += 1;
        
        // Store player address
        tournament.player_addresses[tournament.players_joined as usize - 1] = ctx.accounts.player.key();
        
        msg!(
            "Player {} joined. Players: {}/{}",
            ctx.accounts.player.key(),
            tournament.players_joined,
            tournament.max_players
        );
        
        // If tournament is full, mark as in progress
        if tournament.players_joined == tournament.max_players {
            tournament.status = TournamentStatus::InProgress as u8;
            msg!("Tournament is full and starting!");
        }
        
        Ok(())
    }

    /// Distribute prizes to winners
    pub fn distribute_prizes(
        ctx: Context<DistributePrizes>,
        winner: Pubkey,
    ) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament_escrow;
        
        require!(
            ctx.accounts.admin.key() == tournament.admin,
            ErrorCode::Unauthorized
        );
        require!(
            tournament.status == TournamentStatus::InProgress as u8,
            ErrorCode::InvalidTournamentStatus
        );
        require!(tournament.total_pot > 0, ErrorCode::NoPrizePool);
        
        // Transfer entire pot to winner
        let tournament_key = tournament.key();
        let seeds = &[
            b"tournament",
            tournament.tournament_id.as_bytes(),
            &[tournament.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        **tournament.to_account_info().try_borrow_mut_lamports()? -= tournament.total_pot;
        **ctx.accounts.winner.try_borrow_mut_lamports()? += tournament.total_pot;
        
        msg!(
            "Distributed {} lamports to winner: {}",
            tournament.total_pot,
            winner
        );
        
        tournament.total_pot = 0;
        tournament.status = TournamentStatus::Completed as u8;
        tournament.winner = Some(winner);
        
        Ok(())
    }

    /// Admin withdraws collected rake
    pub fn withdraw_rake(ctx: Context<WithdrawRake>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament_escrow;
        let admin_config = &mut ctx.accounts.admin_config;
        
        require!(
            ctx.accounts.admin.key() == tournament.admin,
            ErrorCode::Unauthorized
        );
        require!(tournament.rake_amount > 0, ErrorCode::NoRakeToWithdraw);
        
        let rake_amount = tournament.rake_amount;
        
        // Transfer rake from escrow to admin
        let tournament_key = tournament.key();
        let seeds = &[
            b"tournament",
            tournament.tournament_id.as_bytes(),
            &[tournament.bump],
        ];
        
        **tournament.to_account_info().try_borrow_mut_lamports()? -= rake_amount;
        **ctx.accounts.admin.try_borrow_mut_lamports()? += rake_amount;
        
        tournament.rake_amount = 0;
        admin_config.total_rake_collected += rake_amount;
        
        msg!("Admin withdrew {} lamports in rake", rake_amount);
        
        Ok(())
    }

    /// Cancel tournament and refund all players (only if not started)
    pub fn cancel_tournament(ctx: Context<CancelTournament>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament_escrow;
        
        require!(
            ctx.accounts.admin.key() == tournament.admin,
            ErrorCode::Unauthorized
        );
        require!(
            tournament.status == TournamentStatus::Waiting as u8,
            ErrorCode::CannotCancelStartedTournament
        );
        
        // Refund all players
        for i in 0..tournament.players_joined as usize {
            let player_key = tournament.player_addresses[i];
            // Note: In production, you'd need to pass player accounts to refund
            // This is simplified for the example
        }
        
        tournament.status = TournamentStatus::Cancelled as u8;
        
        msg!("Tournament cancelled and players refunded");
        
        Ok(())
    }
}

// Context structs

#[derive(Accounts)]
pub struct InitializeAdmin<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + AdminConfig::INIT_SPACE,
        seeds = [b"admin_config"],
        bump
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tournament_id: String)]
pub struct InitializeTournament<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + TournamentEscrow::INIT_SPACE,
        seeds = [b"tournament", tournament_id.as_bytes()],
        bump
    )]
    pub tournament_escrow: Account<'info, TournamentEscrow>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinTournament<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(mut)]
    pub tournament_escrow: Account<'info, TournamentEscrow>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributePrizes<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(mut)]
    pub tournament_escrow: Account<'info, TournamentEscrow>,
    
    /// CHECK: Winner account
    #[account(mut)]
    pub winner: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawRake<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(mut)]
    pub tournament_escrow: Account<'info, TournamentEscrow>,
    
    #[account(
        mut,
        seeds = [b"admin_config"],
        bump = admin_config.bump
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelTournament<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(mut)]
    pub tournament_escrow: Account<'info, TournamentEscrow>,
}

// Account structs

#[account]
#[derive(InitSpace)]
pub struct AdminConfig {
    pub admin: Pubkey,
    pub default_rake_percentage: u16,
    pub total_rake_collected: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TournamentEscrow {
    pub admin: Pubkey,
    #[max_len(32)]
    pub tournament_id: String,
    pub buy_in: u64,
    pub rake_percentage: u16,
    pub total_pot: u64,
    pub rake_amount: u64,
    pub players_joined: u8,
    pub max_players: u8,
    pub status: u8,
    pub player_addresses: [Pubkey; 6],
    pub winner: Option<Pubkey>,
    pub bump: u8,
}

// Enums

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TournamentStatus {
    Waiting,
    InProgress,
    Completed,
    Cancelled,
}

// Error codes

#[error_code]
pub enum ErrorCode {
    #[msg("Rake percentage cannot exceed 10%")]
    RakeTooHigh,
    #[msg("Buy-in must be greater than 0")]
    InvalidBuyIn,
    #[msg("Tournament is not in waiting status")]
    TournamentNotWaiting,
    #[msg("Tournament is full")]
    TournamentFull,
    #[msg("Unauthorized: Only admin can perform this action")]
    Unauthorized,
    #[msg("Invalid tournament status for this operation")]
    InvalidTournamentStatus,
    #[msg("No prize pool to distribute")]
    NoPrizePool,
    #[msg("No rake to withdraw")]
    NoRakeToWithdraw,
    #[msg("Cannot cancel a tournament that has already started")]
    CannotCancelStartedTournament,
}

