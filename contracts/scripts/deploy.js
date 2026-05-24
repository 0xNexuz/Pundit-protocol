import { network } from "hardhat";

async function main() {
  console.log("Initiating Pundit Protocol deployment...");

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // 1. Deploy User Registry
  console.log("Deploying UserRegistry...");
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  console.log(`UserRegistry deployed to: ${userRegistryAddress}`);

  // 2. Deploy Prediction Registry
  console.log("Deploying PredictionRegistry...");
  const Registry = await ethers.getContractFactory("PredictionRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`PredictionRegistry deployed to: ${registryAddress}`);

  // 3. Deploy Accuracy Tracker
  console.log("Deploying AccuracyTracker...");
  const Tracker = await ethers.getContractFactory("AccuracyTracker");
  const tracker = await Tracker.deploy(registryAddress);
  await tracker.waitForDeployment();
  const trackerAddress = await tracker.getAddress();
  console.log(`AccuracyTracker deployed to: ${trackerAddress}`);

  // 4. Deploy Pundit Subscription
  console.log("Deploying PunditSubscription...");
  const Subscription = await ethers.getContractFactory("PunditSubscription");
  const subscription = await Subscription.deploy();
  await subscription.waitForDeployment();
  const subscriptionAddress = await subscription.getAddress();
  console.log(`PunditSubscription deployed to: ${subscriptionAddress}`);

  console.log("\nDEPLOYMENT COMPLETE!");
  console.log("=========================================");
  console.log("USER_REGISTRY_ADDRESS =", userRegistryAddress);
  console.log("REGISTRY_ADDRESS =", registryAddress);
  console.log("TRACKER_ADDRESS =", trackerAddress);
  console.log("SUBSCRIPTION_ADDRESS =", subscriptionAddress);
  console.log("=========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
