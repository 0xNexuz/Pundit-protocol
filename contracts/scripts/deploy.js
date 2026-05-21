import { network } from "hardhat";

async function main() {
  console.log("Initiating Pundit Protocol deployment...");

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // 1. Deploy Prediction Registry
  console.log("Deploying PredictionRegistry...");
  const Registry = await ethers.getContractFactory("PredictionRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`PredictionRegistry deployed to: ${registryAddress}`);

  // 2. Deploy Accuracy Tracker
  console.log("Deploying AccuracyTracker...");
  const Tracker = await ethers.getContractFactory("AccuracyTracker");
  const tracker = await Tracker.deploy(registryAddress);
  await tracker.waitForDeployment();
  const trackerAddress = await tracker.getAddress();
  console.log(`AccuracyTracker deployed to: ${trackerAddress}`);

  // 3. Deploy Pundit Subscription
  console.log("Deploying PunditSubscription...");
  const Subscription = await ethers.getContractFactory("PunditSubscription");
  const subscription = await Subscription.deploy();
  await subscription.waitForDeployment();
  const subscriptionAddress = await subscription.getAddress();
  console.log(`PunditSubscription deployed to: ${subscriptionAddress}`);

  console.log("\nDEPLOYMENT COMPLETE!");
  console.log("=========================================");
  console.log("REGISTRY_ADDRESS =", registryAddress);
  console.log("TRACKER_ADDRESS =", trackerAddress);
  console.log("SUBSCRIPTION_ADDRESS =", subscriptionAddress);
  console.log("=========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
