// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SleepToken.sol";

/**
 * @title SleepToEarn
 * @dev Main contract for SleepToEarn reward system
 * Handles sleep data submission and token rewards calculation
 */
contract SleepToEarn is Ownable, ReentrancyGuard {
    SleepToken public sleepToken;
    
    // Sleep data structure
    struct SleepData {
        uint256 timestamp;
        uint256 sleepDurationMinutes;    // Total sleep time in minutes
        uint256 efficiencyPercentage;    // 0-100 (representing 0-100%)
        uint256 sleepCycles;             // Number of complete sleep cycles
        uint256 deepSleepMinutes;        // Deep sleep time in minutes
        uint256 remSleepMinutes;         // REM sleep time in minutes
        bool isValid;                    // Whether this entry exists
    }
    
    // User data structure
    struct UserStats {
        uint256 totalTokensEarned;
        uint256 currentStreak;           // Current consecutive days streak
        uint256 longestStreak;           // Longest streak achieved
        uint256 lastSubmissionDate;      // Last date sleep data was submitted (YYYYMMDD format)
        uint256 totalSleepSessions;     // Total number of sleep sessions recorded
        mapping(uint256 => SleepData) sleepHistory; // date => SleepData
    }
    
    // Mappings
    mapping(address => UserStats) public userStats;
    mapping(address => bool) public authorizedOracles; // Addresses that can submit sleep data
    
    // Reward calculation constants
    uint256 public constant MAX_DAILY_TOKENS = 10 * 10**18; // 10 tokens with 18 decimals
    uint256 public constant BASE_SLEEP_HOURS = 6;           // Minimum sleep hours for any reward
    uint256 public constant IMPROVEMENT_WINDOW_DAYS = 7;    // Days to look back for improvement calculation
    
    // Events
    event SleepDataSubmitted(address indexed user, uint256 indexed date, uint256 tokensAwarded);
    event OracleAuthorized(address indexed oracle, bool authorized);
    event TokensAwarded(address indexed user, uint256 amount, string reason);
    
    constructor(address _sleepToken) Ownable(msg.sender) {
        require(_sleepToken != address(0), "Invalid token address");
        sleepToken = SleepToken(_sleepToken);
    }
    
    /**
     * @dev Authorize or deauthorize an oracle address
     * @param oracle Address to authorize/deauthorize
     * @param authorized Whether to authorize or deauthorize
     */
    function setOracleAuthorization(address oracle, bool authorized) external onlyOwner {
        authorizedOracles[oracle] = authorized;
        emit OracleAuthorized(oracle, authorized);
    }
    
    /**
     * @dev Submit sleep data for a user (only authorized oracles)
     * @param user User's wallet address
     * @param date Date in YYYYMMDD format (e.g., 20240115)
     * @param sleepDurationMinutes Total sleep time in minutes
     * @param efficiencyPercentage Sleep efficiency (0-100)
     * @param sleepCycles Number of sleep cycles
     * @param deepSleepMinutes Deep sleep time in minutes
     * @param remSleepMinutes REM sleep time in minutes
     */
    function submitSleepData(
        address user,
        uint256 date,
        uint256 sleepDurationMinutes,
        uint256 efficiencyPercentage,
        uint256 sleepCycles,
        uint256 deepSleepMinutes,
        uint256 remSleepMinutes
    ) external nonReentrant {
        require(authorizedOracles[msg.sender], "Not authorized oracle");
        require(user != address(0), "Invalid user address");
        require(date >= 20240101 && date <= 20991231, "Invalid date format");
        require(efficiencyPercentage <= 100, "Invalid efficiency percentage");
        require(sleepDurationMinutes <= 1440, "Sleep duration too long"); // Max 24 hours
        
        UserStats storage stats = userStats[user];
        
        // Check if data already exists for this date
        require(!stats.sleepHistory[date].isValid, "Sleep data already exists for this date");
        
        // Store sleep data
        stats.sleepHistory[date] = SleepData({
            timestamp: block.timestamp,
            sleepDurationMinutes: sleepDurationMinutes,
            efficiencyPercentage: efficiencyPercentage,
            sleepCycles: sleepCycles,
            deepSleepMinutes: deepSleepMinutes,
            remSleepMinutes: remSleepMinutes,
            isValid: true
        });
        
        // Update user stats
        stats.totalSleepSessions++;
        _updateStreak(user, date);
        
        // Calculate and award tokens
        uint256 tokensToAward = _calculateReward(user, date);
        
        if (tokensToAward > 0) {
            stats.totalTokensEarned += tokensToAward;
            sleepToken.mint(user, tokensToAward);
            emit TokensAwarded(user, tokensToAward, "Daily sleep reward");
        }
        
        emit SleepDataSubmitted(user, date, tokensToAward);
    }
    
    /**
     * @dev Calculate reward tokens for a user's sleep data
     * @param user User's address
     * @param date Date of sleep data
     * @return tokens Amount of tokens to award
     */
    function _calculateReward(address user, uint256 date) internal view returns (uint256) {
        UserStats storage stats = userStats[user];
        SleepData memory sleepData = stats.sleepHistory[date];
        
        uint256 sleepHours = sleepData.sleepDurationMinutes / 60;
        
        // No reward if less than minimum sleep hours
        if (sleepHours < BASE_SLEEP_HOURS) {
            return 0;
        }
        
        uint256 baseTokens = _calculateBaseReward(sleepData);
        uint256 improvementBonus = _calculateImprovementBonus(user, date);
        uint256 consistencyBonus = _calculateConsistencyBonus(user);
        
        uint256 totalTokens = baseTokens + improvementBonus + consistencyBonus;
        
        // Cap at maximum daily tokens
        if (totalTokens > MAX_DAILY_TOKENS) {
            totalTokens = MAX_DAILY_TOKENS;
        }
        
        return totalTokens;
    }
    
    /**
     * @dev Calculate base reward based on absolute performance
     * @param sleepData Sleep data for the night
     * @return tokens Base tokens (1-4 tokens)
     */
    function _calculateBaseReward(SleepData memory sleepData) internal pure returns (uint256) {
        uint256 sleepHours = sleepData.sleepDurationMinutes / 60;
        uint256 efficiency = sleepData.efficiencyPercentage;
        uint256 cycles = sleepData.sleepCycles;
        
        uint256 baseTokens = 0;
        
        // Tier 1: 6+ hours, >70% efficiency
        if (sleepHours >= 6 && efficiency >= 70) {
            baseTokens = 1 * 10**18;
        }
        
        // Tier 2: 7+ hours, >75% efficiency
        if (sleepHours >= 7 && efficiency >= 75) {
            baseTokens = 2 * 10**18;
        }
        
        // Tier 3: 8+ hours, >80% efficiency
        if (sleepHours >= 8 && efficiency >= 80) {
            baseTokens = 3 * 10**18;
        }
        
        // Tier 4: 8+ hours, >85% efficiency, 3+ cycles
        if (sleepHours >= 8 && efficiency >= 85 && cycles >= 3) {
            baseTokens = 4 * 10**18;
        }
        
        return baseTokens;
    }
    
    /**
     * @dev Calculate improvement bonus based on recent performance
     * @param user User's address
     * @param date Current date
     * @return tokens Improvement bonus (0-4 tokens)
     */
    function _calculateImprovementBonus(address user, uint256 date) internal view returns (uint256) {
        UserStats storage stats = userStats[user];
        SleepData memory currentSleep = stats.sleepHistory[date];
        
        // Need at least 3 previous days of data to calculate improvement
        uint256 validDaysCount = 0;
        uint256 totalPreviousEfficiency = 0;
        
        // Look back IMPROVEMENT_WINDOW_DAYS days
        for (uint256 i = 1; i <= IMPROVEMENT_WINDOW_DAYS; i++) {
            uint256 previousDate = _subtractDays(date, i);
            if (stats.sleepHistory[previousDate].isValid) {
                totalPreviousEfficiency += stats.sleepHistory[previousDate].efficiencyPercentage;
                validDaysCount++;
            }
        }
        
        if (validDaysCount < 3) {
            return 0; // Not enough historical data
        }
        
        uint256 averagePreviousEfficiency = totalPreviousEfficiency / validDaysCount;
        uint256 currentEfficiency = currentSleep.efficiencyPercentage;
        
        // Calculate improvement percentage
        if (currentEfficiency <= averagePreviousEfficiency) {
            return 0; // No improvement
        }
        
        uint256 improvementPercent = ((currentEfficiency - averagePreviousEfficiency) * 100) / averagePreviousEfficiency;
        
        // Award improvement bonuses
        if (improvementPercent >= 5 && improvementPercent < 10) {
            return 1 * 10**18; // 5-10% improvement
        } else if (improvementPercent >= 10 && improvementPercent < 20) {
            return 2 * 10**18; // 10-20% improvement
        } else if (improvementPercent >= 20 && improvementPercent < 30) {
            return 3 * 10**18; // 20-30% improvement
        } else if (improvementPercent >= 30) {
            return 4 * 10**18; // 30%+ improvement
        }
        
        return 0;
    }
    
    /**
     * @dev Calculate consistency bonus based on streak
     * @param user User's address
     * @return tokens Consistency bonus (0-2 tokens)
     */
    function _calculateConsistencyBonus(address user) internal view returns (uint256) {
        uint256 streak = userStats[user].currentStreak;
        
        if (streak >= 7) {
            return 2 * 10**18; // 7+ day streak
        } else if (streak >= 3) {
            return 1 * 10**18; // 3+ day streak
        }
        
        return 0;
    }
    
    /**
     * @dev Update user's streak based on new sleep data
     * @param user User's address
     * @param date Current date
     */
    function _updateStreak(address user, uint256 date) internal {
        UserStats storage stats = userStats[user];
        
        uint256 previousDate = _subtractDays(date, 1);
        
        if (stats.lastSubmissionDate == previousDate) {
            // Consecutive day - increment streak
            stats.currentStreak++;
        } else if (stats.lastSubmissionDate > 0) {
            // Gap in submissions - reset streak
            stats.currentStreak = 1;
        } else {
            // First submission
            stats.currentStreak = 1;
        }
        
        // Update longest streak if current is longer
        if (stats.currentStreak > stats.longestStreak) {
            stats.longestStreak = stats.currentStreak;
        }
        
        stats.lastSubmissionDate = date;
    }
    
    /**
     * @dev Subtract days from a date in YYYYMMDD format
     * @param date Date in YYYYMMDD format
     * @param numDays Number of days to subtract
     * @return newDate New date in YYYYMMDD format
     */
    function _subtractDays(uint256 date, uint256 numDays) internal pure returns (uint256) {
        // Simple implementation - assumes 30 days per month for simplicity
        // In production, you'd want a more accurate date library
        uint256 year = date / 10000;
        uint256 month = (date % 10000) / 100;
        uint256 day = date % 100;
        
        if (day > numDays) {
            return date - numDays;
        } else {
            // Simplified: go to previous month
            if (month > 1) {
                return ((year * 10000) + ((month - 1) * 100) + (30 - (numDays - day)));
            } else {
                // Go to previous year
                return (((year - 1) * 10000) + (12 * 100) + (30 - (numDays - day)));
            }
        }
    }
    
    /**
     * @dev Get user's sleep data for a specific date
     * @param user User's address
     * @param date Date in YYYYMMDD format
     * @return sleepData Sleep data for the specified date
     */
    function getUserSleepData(address user, uint256 date) external view returns (SleepData memory) {
        return userStats[user].sleepHistory[date];
    }
    
    /**
     * @dev Get user's overall stats
     * @param user User's address
     * @return totalTokens Total tokens earned
     * @return currentStreak Current consecutive days streak
     * @return longestStreak Longest streak achieved
     * @return totalSessions Total sleep sessions recorded
     */
    function getUserStats(address user) external view returns (
        uint256 totalTokens,
        uint256 currentStreak,
        uint256 longestStreak,
        uint256 totalSessions
    ) {
        UserStats storage stats = userStats[user];
        return (
            stats.totalTokensEarned,
            stats.currentStreak,
            stats.longestStreak,
            stats.totalSleepSessions
        );
    }
}
