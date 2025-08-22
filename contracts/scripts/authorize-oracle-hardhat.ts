import hre from "hardhat";
import { parseAbi } from "viem";

async function main() {
  // Contract addresses
  const SLEEP_TO_EARN_ADDRESS = "0x97c381648BF3a0344D4A3a3d6c7eAfD4Ad96996A" as const;
  const ORACLE_ADDRESS = "0xd90704358d7Bf9F9B5d8CBE7235eEbf107c6d592" as const;

  console.log("🔗 Authorizing oracle on Base Sepolia...");
  console.log("📋 Contract Address:", SLEEP_TO_EARN_ADDRESS);
  console.log("🏛️  Oracle Address:", ORACLE_ADDRESS);

  // Contract ABI
  const sleepToEarnAbi = parseAbi([
    'function setOracleAuthorization(address oracle, bool authorized) external',
    'function authorizedOracles(address) external view returns (bool)',
    'function owner() external view returns (address)'
  ]);

  // Get public and wallet clients
  const publicClient = await hre.viem.getPublicClient();
  const [walletClient] = await hre.viem.getWalletClients();
  
  console.log("👤 Wallet Address:", walletClient.account.address);

  // Check if signer is the owner
  const owner = await publicClient.readContract({
    address: SLEEP_TO_EARN_ADDRESS,
    abi: sleepToEarnAbi,
    functionName: 'owner'
  });
  
  console.log("👑 Contract Owner:", owner);
  
  if (owner.toLowerCase() !== walletClient.account.address.toLowerCase()) {
    console.error("❌ Error: Wallet is not the owner of this contract");
    console.log("   Contract owner:", owner);
    console.log("   Wallet address:", walletClient.account.address);
    process.exit(1);
  }

  // Check current authorization status
  const isCurrentlyAuthorized = await publicClient.readContract({
    address: SLEEP_TO_EARN_ADDRESS,
    abi: sleepToEarnAbi,
    functionName: 'authorizedOracles',
    args: [ORACLE_ADDRESS]
  });
  
  console.log("🔍 Current authorization status:", isCurrentlyAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED");

  if (isCurrentlyAuthorized) {
    console.log("✅ Oracle is already authorized! No action needed.");
    return;
  }

  console.log("📝 Authorizing oracle...");

  // Authorize the oracle
  const hash = await walletClient.writeContract({
    address: SLEEP_TO_EARN_ADDRESS,
    abi: sleepToEarnAbi,
    functionName: 'setOracleAuthorization',
    args: [ORACLE_ADDRESS, true]
  });
  
  console.log("🚀 Transaction submitted!");
  console.log("📋 Transaction hash:", hash);
  
  // Wait for confirmation
  console.log("⏳ Waiting for transaction confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  console.log("✅ Transaction confirmed!");
  console.log("📊 Gas used:", receipt.gasUsed.toString());
  console.log("🎯 Block number:", receipt.blockNumber.toString());

  // Verify the authorization
  const isNowAuthorized = await publicClient.readContract({
    address: SLEEP_TO_EARN_ADDRESS,
    abi: sleepToEarnAbi,
    functionName: 'authorizedOracles',
    args: [ORACLE_ADDRESS]
  });
  
  if (isNowAuthorized) {
    console.log("🎉 SUCCESS: Oracle has been successfully authorized!");
    console.log("🏛️  Oracle address:", ORACLE_ADDRESS);
    console.log("✅ Status: AUTHORIZED");
  } else {
    console.log("❌ Error: Oracle authorization failed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
