import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SleepToEarnModule = buildModule("SleepToEarnModule", (m) => {
  // Deploy SLEEP token first
  const sleepToken = m.contract("SleepToken", []);

  // Deploy SleepToEarn contract with token address
  const sleepToEarn = m.contract("SleepToEarn", [sleepToken]);

  // Set the SleepToEarn contract address in the token contract
  m.call(sleepToken, "setSleepToEarnContract", [sleepToEarn]);

  return { sleepToken, sleepToEarn };
});

export default SleepToEarnModule;
