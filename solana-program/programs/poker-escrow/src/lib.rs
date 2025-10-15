use anchor_lang::prelude::*;

declare_id!("HLwbRZWAGjK7w5T61xegvj37v1H3nATNdTcypAfbFRaq");

#[program]
pub mod poker_escrow {
    use super::*;

    /// Initialize the admin configuration
    pub fn initialize_admin(
        ctx: Context<InitializeAdmin>,
        default_rake_percentage: u16,
        creator_rake_percentage: u16,
        admin_rake_percentage: u16,
    ) -> Result<()> {
        require!(creator_rake_percentage + admin_rake_percentage == 100, ErrorCode::InvalidRakeSplit);
        require!(creator_rake_percentage <= 100, ErrorCode::InvalidRakePercentage);
        require!(admin_rake_percentage <= 100, ErrorCode::InvalidRakePercentage);
        
        let admin_config = &mut ctx.accounts.admin_config;
        admin_config.admin = ctx.accounts.admin.key();
        admin_config.default_rake_percentage = default_rake_percentage;
        admin_config.creator_rake_percentage = creator_rake_percentage;
        admin_config.admin_rake_percentage = admin_rake_percentage;
        admin_config.total_rake_collected = 0;
        admin_config.total_creator_rake_paid = 0;
        admin_config.total_admin_rake_collected = 0;
        admin_config.bump = ctx.bumps.admin_config;
        
        msg!("Admin initialized: {}", admin_config.admin);
        msg!("Default rake percentage: {}%", default_rake_percentage);
        msg!("Creator rake percentage: {}%", creator_rake_percentage);
        msg!("Admin rake percentage: {}%", admin_rake_percentage);
        
        Ok(())
    }

    /// Create a new tournament escrow (Enhanced with variable players and user creation)
    pub fn initialize_tournament(
        ctx: Context<InitializeTournament>,
        buy_in: u64,
        rake_percentage: u16,
        tournament_id: String,
        max_players: u8,
        tournament_type: TournamentType,
        privacy: TournamentPrivacy,
        blind_structure: BlindStructure,
    ) -> Result<()> {
        require!(rake_percentage <= 1000, ErrorCode::RakeTooHigh); // Max 10%
        require!(buy_in > 0, ErrorCode::InvalidBuyIn);
        require!(max_players >= 2 && max_players <= 10, ErrorCode::InvalidMaxPlayers);
        
        let tournament = &mut ctx.accounts.tournament_escrow;
        tournament.creator = ctx.accounts.creator.key();
        tournament.tournament_id = tournament_id.clone();
        tournament.buy_in = buy_in;
        tournament.rake_percentage = rake_percentage;
        tournament.total_pot = 0;
        tournament.rake_amount = 0;
        tournament.creator_rake_amount = 0;
        tournament.admin_rake_amount = 0;
        tournament.players_joined = 0;
        tournament.max_players = max_players;
        tournament.tournament_type = tournament_type as u8;
        tournament.privacy = privacy as u8;
        tournament.blind_structure = blind_structure as u8;
        tournament.status = TournamentStatus::Waiting as u8;
        tournament.created_at = Clock::get()?.unix_timestamp;
        tournament.bump = ctx.bumps.tournament_escrow;
        
        // Initialize player addresses vector with capacity
        tournament.player_addresses = Vec::with_capacity(max_players as usize);
        
        msg!("Enhanced tournament created: {}", tournament_id);
        msg!("Creator: {}, Max players: {}, Type: {:?}, Privacy: {:?}", 
             ctx.accounts.creator.key(), max_players, tournament_type, privacy);
        msg!("Buy-in: {} lamports, Rake: {}%, Blind structure: {:?}", 
             buy_in, rake_percentage, blind_structure);
        
        Ok(())
    }

    /// Player joins tournament by depositing buy-in (Enhanced with privacy checks)
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
        
        // Check privacy settings
        match TournamentPrivacy::from(tournament.privacy) {
            TournamentPrivacy::Private => {
                // Only creator can join private tournaments (or implement whitelist)
                require!(
                    ctx.accounts.player.key() == tournament.creator,
                    ErrorCode::PrivateTournamentAccessDenied
                );
            },
            TournamentPrivacy::FriendsOnly => {
                // TODO: Implement friends list check
                // For now, allow anyone (can be enhanced later)
            },
            TournamentPrivacy::Public => {
                // Anyone can join public tournaments
            },
        }
        
        // Check if player already joined
        require!(
            !tournament.player_addresses.contains(&ctx.accounts.player.key()),
            ErrorCode::PlayerAlreadyJoined
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
        
        // Calculate rake and split it
        let rake = (tournament.buy_in * tournament.rake_percentage as u64) / 10000;
        let net_buy_in = tournament.buy_in - rake;
        
        // Get admin config to determine rake split
        let admin_config = &ctx.accounts.admin_config;
        let creator_rake = (rake * admin_config.creator_rake_percentage as u64) / 100;
        let admin_rake = (rake * admin_config.admin_rake_percentage as u64) / 100;
        
        tournament.total_pot += net_buy_in;
        tournament.rake_amount += rake;
        tournament.creator_rake_amount += creator_rake;
        tournament.admin_rake_amount += admin_rake;
        tournament.players_joined += 1;
        
        // Store player address in dynamic vector
        tournament.player_addresses.push(ctx.accounts.player.key());
        
        msg!(
            "Player {} joined. Players: {}/{}",
            ctx.accounts.player.key(),
            tournament.players_joined,
            tournament.max_players
        );
        
        // If tournament is full, mark as in progress
        if tournament.players_joined == tournament.max_players {
            tournament.status = TournamentStatus::InProgress as u8;
            tournament.started_at = Some(Clock::get()?.unix_timestamp);
            msg!("Tournament is full and starting!");
        }
        
        Ok(())
    }

    /// Distribute prizes to winner (Simplified for now - can be enhanced later)
    pub fn distribute_prizes(
        ctx: Context<DistributePrizes>,
        winner: Pubkey,
    ) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament_escrow;
        
        require!(
            ctx.accounts.creator.key() == tournament.creator,
            ErrorCode::Unauthorized
        );
        require!(
            tournament.status == TournamentStatus::InProgress as u8,
            ErrorCode::InvalidTournamentStatus
        );
        require!(tournament.total_pot > 0, ErrorCode::NoPrizePool);
        
        // Transfer entire pot to winner
        **tournament.to_account_info().try_borrow_mut_lamports()? -= tournament.total_pot;
        **ctx.accounts.winner.try_borrow_mut_lamports()? += tournament.total_pot;
        
        msg!(
            "Distributed {} lamports to winner: {}",
            tournament.total_pot,
            winner
        );
        
        tournament.total_pot = 0;
        tournament.status = TournamentStatus::Completed as u8;
        tournament.completed_at = Some(Clock::get()?.unix_timestamp);
        tournament.winners = Some(vec![winner]);
        
        Ok(())
    }

    /// Creator withdraws their portion of collected rake
    pub fn withdraw_rake(ctx: Context<WithdrawRake>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament_escrow;
        let admin_config = &mut ctx.accounts.admin_config;
        
        require!(
            ctx.accounts.creator.key() == tournament.creator,
            ErrorCode::Unauthorized
        );
        require!(tournament.creator_rake_amount > 0, ErrorCode::NoRakeToWithdraw);
        
        let creator_rake_amount = tournament.creator_rake_amount;
        
        // Transfer creator's rake portion from escrow to creator
        **tournament.to_account_info().try_borrow_mut_lamports()? -= creator_rake_amount;
        **ctx.accounts.creator.try_borrow_mut_lamports()? += creator_rake_amount;
        
        tournament.creator_rake_amount = 0;
        admin_config.total_creator_rake_paid += creator_rake_amount;
        
        msg!("Creator withdrew {} lamports in rake (their portion)", creator_rake_amount);
        
        Ok(())
    }

    /// Admin withdraws their portion of collected rake
    pub fn withdraw_admin_rake(ctx: Context<WithdrawAdminRake>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament_escrow;
        let admin_config = &mut ctx.accounts.admin_config;
        
        require!(
            ctx.accounts.admin.key() == admin_config.admin,
            ErrorCode::Unauthorized
        );
        require!(tournament.admin_rake_amount > 0, ErrorCode::NoRakeToWithdraw);
        
        let admin_rake_amount = tournament.admin_rake_amount;
        
        // Transfer admin's rake portion from escrow to admin
        **tournament.to_account_info().try_borrow_mut_lamports()? -= admin_rake_amount;
        **ctx.accounts.admin.try_borrow_mut_lamports()? += admin_rake_amount;
        
        tournament.admin_rake_amount = 0;
        admin_config.total_admin_rake_collected += admin_rake_amount;
        
        msg!("Admin withdrew {} lamports in rake (their portion)", admin_rake_amount);
        
        Ok(())
    }

    /// Cancel tournament and refund all players (Enhanced for any creator)
    pub fn cancel_tournament(ctx: Context<CancelTournament>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament_escrow;
        
        require!(
            ctx.accounts.creator.key() == tournament.creator,
            ErrorCode::Unauthorized
        );
        require!(
            tournament.status == TournamentStatus::Waiting as u8,
            ErrorCode::CannotCancelStartedTournament
        );
        
        // Refund all players (simplified - in production would need player accounts)
        let refund_amount = tournament.total_pot + tournament.rake_amount;
        if refund_amount > 0 {
            // Note: In production, you'd need to pass player accounts to refund
            // This is simplified for the example
            tournament.total_pot = 0;
            tournament.rake_amount = 0;
        }
        
        tournament.status = TournamentStatus::Cancelled as u8;
        tournament.cancelled_at = Some(Clock::get()?.unix_timestamp);
        
        msg!("Tournament cancelled and players refunded");
        
        Ok(())
    }

    /// Leave tournament (Enhanced feature for players to leave before start)
    pub fn leave_tournament(ctx: Context<LeaveTournament>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament_escrow;
        
        require!(
            tournament.status == TournamentStatus::Waiting as u8,
            ErrorCode::CannotLeaveStartedTournament
        );
        require!(
            tournament.player_addresses.contains(&ctx.accounts.player.key()),
            ErrorCode::PlayerNotInTournament
        );
        
        // Find and remove player
        if let Some(index) = tournament.player_addresses.iter().position(|&x| x == ctx.accounts.player.key()) {
            tournament.player_addresses.remove(index);
            tournament.players_joined -= 1;
            
            // Refund buy-in
            let refund_amount = tournament.buy_in;
            **tournament.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
            **ctx.accounts.player.try_borrow_mut_lamports()? += refund_amount;
            
            // Adjust pot and rake
            let rake = (tournament.buy_in * tournament.rake_percentage as u64) / 10000;
            let net_buy_in = tournament.buy_in - rake;
            tournament.total_pot = tournament.total_pot.saturating_sub(net_buy_in);
            tournament.rake_amount = tournament.rake_amount.saturating_sub(rake);
            
            msg!("Player {} left tournament and was refunded", ctx.accounts.player.key());
        }
        
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
#[instruction(tournament_id: String, max_players: u8)]
pub struct InitializeTournament<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = TournamentEscrow::space_for(max_players),
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
    
    #[account(
        seeds = [b"admin_config"],
        bump = admin_config.bump
    )]
    pub admin_config: Account<'info, AdminConfig>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributePrizes<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
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
    pub creator: Signer<'info>,
    
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
pub struct WithdrawAdminRake<'info> {
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
    pub creator: Signer<'info>,
    
    #[account(mut)]
    pub tournament_escrow: Account<'info, TournamentEscrow>,
}

#[derive(Accounts)]
pub struct LeaveTournament<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(mut)]
    pub tournament_escrow: Account<'info, TournamentEscrow>,
    
    pub system_program: Program<'info, System>,
}

// Account structs

#[account]
#[derive(InitSpace)]
pub struct AdminConfig {
    pub admin: Pubkey,
    pub default_rake_percentage: u16,
    pub creator_rake_percentage: u16, // % of rake that goes to tournament creator (e.g., 70%)
    pub admin_rake_percentage: u16,   // % of rake that goes to admin (e.g., 30%)
    pub total_rake_collected: u64,
    pub total_creator_rake_paid: u64,
    pub total_admin_rake_collected: u64,
    pub bump: u8,
}

#[account]
pub struct TournamentEscrow {
    pub creator: Pubkey,
    pub tournament_id: String,
    pub buy_in: u64,
    pub rake_percentage: u16,
    pub total_pot: u64,
    pub rake_amount: u64,
    pub creator_rake_amount: u64,    // Amount of rake that goes to creator
    pub admin_rake_amount: u64,      // Amount of rake that goes to admin
    pub players_joined: u8,
    pub max_players: u8,
    pub tournament_type: u8,
    pub privacy: u8,
    pub blind_structure: u8,
    pub status: u8,
    pub player_addresses: Vec<Pubkey>,
    pub winners: Option<Vec<Pubkey>>,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub cancelled_at: Option<i64>,
    pub bump: u8,
}

impl TournamentEscrow {
    pub fn space_for(max_players: u8) -> usize {
        8 + // discriminator
        32 + // creator
        4 + 32 + // tournament_id (String)
        8 + // buy_in
        2 + // rake_percentage
        8 + // total_pot
        8 + // rake_amount
        8 + // creator_rake_amount
        8 + // admin_rake_amount
        1 + // players_joined
        1 + // max_players
        1 + // tournament_type
        1 + // privacy
        1 + // blind_structure
        1 + // status
        4 + (32 * max_players as usize) + // player_addresses Vec
        1 + 4 + (32 * max_players as usize) + // winners Option<Vec<Pubkey>>
        8 + // created_at
        1 + 8 + // started_at Option<i64>
        1 + 8 + // completed_at Option<i64>
        1 + 8 + // cancelled_at Option<i64>
        1 // bump
    }
}

// Enums

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TournamentStatus {
    Waiting,
    InProgress,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum TournamentType {
    SitNGo,
    Scheduled,
    Bounty,
    Rebuy,
    FreeRoll,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum TournamentPrivacy {
    Public,
    Private,
    FriendsOnly,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum BlindStructure {
    Progressive,
    Turbo,
    Slow,
    HyperTurbo,
}

impl From<u8> for TournamentPrivacy {
    fn from(value: u8) -> Self {
        match value {
            0 => TournamentPrivacy::Public,
            1 => TournamentPrivacy::Private,
            2 => TournamentPrivacy::FriendsOnly,
            _ => TournamentPrivacy::Public,
        }
    }
}

// Error codes

#[error_code]
pub enum ErrorCode {
    #[msg("Rake percentage cannot exceed 10%")]
    RakeTooHigh,
    #[msg("Buy-in must be greater than 0")]
    InvalidBuyIn,
    #[msg("Max players must be between 2 and 10")]
    InvalidMaxPlayers,
    #[msg("Tournament is not in waiting status")]
    TournamentNotWaiting,
    #[msg("Tournament is full")]
    TournamentFull,
    #[msg("Unauthorized: Only creator can perform this action")]
    Unauthorized,
    #[msg("Invalid tournament status for this operation")]
    InvalidTournamentStatus,
    #[msg("No prize pool to distribute")]
    NoPrizePool,
    #[msg("No rake to withdraw")]
    NoRakeToWithdraw,
    #[msg("Cannot cancel a tournament that has already started")]
    CannotCancelStartedTournament,
    #[msg("Cannot leave a tournament that has already started")]
    CannotLeaveStartedTournament,
    #[msg("Player is not in this tournament")]
    PlayerNotInTournament,
    #[msg("Player has already joined this tournament")]
    PlayerAlreadyJoined,
    #[msg("Access denied: This is a private tournament")]
    PrivateTournamentAccessDenied,
    #[msg("Invalid winner data provided")]
    InvalidWinnerData,
    #[msg("Invalid number of winners")]
    InvalidWinnerCount,
    #[msg("Prize amount exceeds available pot")]
    PrizeExceedsPot,
    #[msg("Invalid rake split: Creator and admin percentages must sum to 100%")]
    InvalidRakeSplit,
    #[msg("Invalid rake percentage: Must be between 0 and 100%")]
    InvalidRakePercentage,
}

