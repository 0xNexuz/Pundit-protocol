import { network } from "hardhat";

async function main() {
  console.log("Deploying UserRegistry only...");

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();

  const userRegistryAddress = await userRegistry.getAddress();

  console.log("\nUSER REGISTRY DEPLOYED");
  console.log("=========================================");
  console.log("USER_REGISTRY_ADDRESS =", userRegistryAddress);
  console.log("VITE_USER_REGISTRY_ADDRESS =", userRegistryAddress);
  console.log("=========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
