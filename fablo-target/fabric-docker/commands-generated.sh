#!/usr/bin/env bash

generateArtifacts() {
  printHeadline "Generating basic configs" "U1F913"

  printItalics "Generating crypto material for Orderer" "U1F512"
  certsGenerate "$FABLO_NETWORK_ROOT/fabric-config" "crypto-config-orderer.yaml" "peerOrganizations/orderer.example.com" "$FABLO_NETWORK_ROOT/fabric-config/crypto-config/"

  printItalics "Generating crypto material for Org1" "U1F512"
  certsGenerate "$FABLO_NETWORK_ROOT/fabric-config" "crypto-config-org1.yaml" "peerOrganizations/org1.example.com" "$FABLO_NETWORK_ROOT/fabric-config/crypto-config/"

  printItalics "Generating genesis block for group group1" "U1F3E0"
  genesisBlockCreate "$FABLO_NETWORK_ROOT/fabric-config" "$FABLO_NETWORK_ROOT/fabric-config/config" "Group1Genesis"

  # Create directories to avoid permission errors on linux
  mkdir -p "$FABLO_NETWORK_ROOT/fabric-config/chaincode-packages"
  mkdir -p "$FABLO_NETWORK_ROOT/fabric-config/config"
}

startNetwork() {
  printHeadline "Starting network" "U1F680"
  (cd "$FABLO_NETWORK_ROOT"/fabric-docker && docker compose up -d)
  sleep 4
}

generateChannelsArtifacts() {
  printHeadline "Generating config for 'my-channel1'" "U1F913"
  createChannelTx "my-channel1" "$FABLO_NETWORK_ROOT/fabric-config" "MyChannel1" "$FABLO_NETWORK_ROOT/fabric-config/config"
}

installChannels() {
  printHeadline "Creating 'my-channel1' on Org1/peer0" "U1F63B"
  docker exec -i cli.org1.example.com bash -c "source scripts/channel_fns.sh; createChannelAndJoin 'my-channel1' 'Org1MSP' 'peer0.org1.example.com:7041' 'crypto/users/Admin@org1.example.com/msp' 'orderer0.group1.orderer.example.com:7030';"

  printItalics "Joining 'my-channel1' on Org1/peer1" "U1F638"
  docker exec -i cli.org1.example.com bash -c "source scripts/channel_fns.sh; fetchChannelAndJoin 'my-channel1' 'Org1MSP' 'peer1.org1.example.com:7042' 'crypto/users/Admin@org1.example.com/msp' 'orderer0.group1.orderer.example.com:7030';"
}

installChaincodes() {
  if [ -n "$(ls "$CHAINCODES_BASE_DIR/./chaincodes/chaincode-submission-ts")" ]; then
    local version="1.0.0"
    printHeadline "Packaging chaincode 'chaincode-submission-ts'" "U1F60E"
    chaincodeBuild "chaincode-submission-ts" "node" "$CHAINCODES_BASE_DIR/./chaincodes/chaincode-submission-ts" "16"
    chaincodePackage "cli.org1.example.com" "peer0.org1.example.com:7041" "chaincode-submission-ts" "$version" "node" printHeadline "Installing 'chaincode-submission-ts' for Org1" "U1F60E"
    chaincodeInstall "cli.org1.example.com" "peer0.org1.example.com:7041" "chaincode-submission-ts" "$version" ""
    chaincodeInstall "cli.org1.example.com" "peer1.org1.example.com:7042" "chaincode-submission-ts" "$version" ""
    chaincodeApprove "cli.org1.example.com" "peer0.org1.example.com:7041" "my-channel1" "chaincode-submission-ts" "$version" "orderer0.group1.orderer.example.com:7030" "" "false" "" "" "node" ""
    printItalics "Committing chaincode 'chaincode-submission-ts' on channel 'my-channel1' as 'Org1'" "U1F618"
    chaincodeCommit "cli.org1.example.com" "peer0.org1.example.com:7041" "my-channel1" "chaincode-submission-ts" "$version" "orderer0.group1.orderer.example.com:7030" "" "false" "" "peer0.org1.example.com:7041" "" ""
  else
    echo "Warning! Skipping chaincode 'chaincode-submission-ts' installation. Chaincode directory is empty."
    echo "Looked in dir: '$CHAINCODES_BASE_DIR/./chaincodes/chaincode-submission-ts'"
  fi

}

installChaincode() {
  local chaincodeName="$1"
  if [ -z "$chaincodeName" ]; then
    echo "Error: chaincode name is not provided"
    exit 1
  fi

  local version="$2"
  if [ -z "$version" ]; then
    echo "Error: chaincode version is not provided"
    exit 1
  fi

  if [ "$chaincodeName" = "chaincode-submission-ts" ]; then
    if [ -n "$(ls "$CHAINCODES_BASE_DIR/./chaincodes/chaincode-submission-ts")" ]; then
      printHeadline "Packaging chaincode 'chaincode-submission-ts'" "U1F60E"
      chaincodeBuild "chaincode-submission-ts" "node" "$CHAINCODES_BASE_DIR/./chaincodes/chaincode-submission-ts" "16"
      chaincodePackage "cli.org1.example.com" "peer0.org1.example.com:7041" "chaincode-submission-ts" "$version" "node" printHeadline "Installing 'chaincode-submission-ts' for Org1" "U1F60E"
      chaincodeInstall "cli.org1.example.com" "peer0.org1.example.com:7041" "chaincode-submission-ts" "$version" ""
      chaincodeInstall "cli.org1.example.com" "peer1.org1.example.com:7042" "chaincode-submission-ts" "$version" ""
      chaincodeApprove "cli.org1.example.com" "peer0.org1.example.com:7041" "my-channel1" "chaincode-submission-ts" "$version" "orderer0.group1.orderer.example.com:7030" "" "false" "" "" "node" ""
      printItalics "Committing chaincode 'chaincode-submission-ts' on channel 'my-channel1' as 'Org1'" "U1F618"
      chaincodeCommit "cli.org1.example.com" "peer0.org1.example.com:7041" "my-channel1" "chaincode-submission-ts" "$version" "orderer0.group1.orderer.example.com:7030" "" "false" "" "peer0.org1.example.com:7041" "" ""

    else
      echo "Warning! Skipping chaincode 'chaincode-submission-ts' install. Chaincode directory is empty."
      echo "Looked in dir: '$CHAINCODES_BASE_DIR/./chaincodes/chaincode-submission-ts'"
    fi
  fi
}

runDevModeChaincode() {
  local chaincodeName=$1
  if [ -z "$chaincodeName" ]; then
    echo "Error: chaincode name is not provided"
    exit 1
  fi

  if [ "$chaincodeName" = "chaincode-submission-ts" ]; then
    local version="1.0.0"
    printHeadline "Approving 'chaincode-submission-ts' for Org1 (dev mode)" "U1F60E"
    chaincodeApprove "cli.org1.example.com" "peer0.org1.example.com:7041" "my-channel1" "chaincode-submission-ts" "1.0.0" "orderer0.group1.orderer.example.com:7030" "" "false" "" "" "" ""
    printItalics "Committing chaincode 'chaincode-submission-ts' on channel 'my-channel1' as 'Org1' (dev mode)" "U1F618"
    chaincodeCommit "cli.org1.example.com" "peer0.org1.example.com:7041" "my-channel1" "chaincode-submission-ts" "1.0.0" "orderer0.group1.orderer.example.com:7030" "" "false" "" "peer0.org1.example.com:7041" "" ""

  fi
}

upgradeChaincode() {
  local chaincodeName="$1"
  if [ -z "$chaincodeName" ]; then
    echo "Error: chaincode name is not provided"
    exit 1
  fi

  local version="$2"
  if [ -z "$version" ]; then
    echo "Error: chaincode version is not provided"
    exit 1
  fi

  if [ "$chaincodeName" = "chaincode-submission-ts" ]; then
    if [ -n "$(ls "$CHAINCODES_BASE_DIR/./chaincodes/chaincode-submission-ts")" ]; then
      printHeadline "Packaging chaincode 'chaincode-submission-ts'" "U1F60E"
      chaincodeBuild "chaincode-submission-ts" "node" "$CHAINCODES_BASE_DIR/./chaincodes/chaincode-submission-ts" "16"
      chaincodePackage "cli.org1.example.com" "peer0.org1.example.com:7041" "chaincode-submission-ts" "$version" "node" printHeadline "Installing 'chaincode-submission-ts' for Org1" "U1F60E"
      chaincodeInstall "cli.org1.example.com" "peer0.org1.example.com:7041" "chaincode-submission-ts" "$version" ""
      chaincodeInstall "cli.org1.example.com" "peer1.org1.example.com:7042" "chaincode-submission-ts" "$version" ""
      chaincodeApprove "cli.org1.example.com" "peer0.org1.example.com:7041" "my-channel1" "chaincode-submission-ts" "$version" "orderer0.group1.orderer.example.com:7030" "" "false" "" "" "node" ""
      printItalics "Committing chaincode 'chaincode-submission-ts' on channel 'my-channel1' as 'Org1'" "U1F618"
      chaincodeCommit "cli.org1.example.com" "peer0.org1.example.com:7041" "my-channel1" "chaincode-submission-ts" "$version" "orderer0.group1.orderer.example.com:7030" "" "false" "" "peer0.org1.example.com:7041" "" ""

    else
      echo "Warning! Skipping chaincode 'chaincode-submission-ts' upgrade. Chaincode directory is empty."
      echo "Looked in dir: '$CHAINCODES_BASE_DIR/./chaincodes/chaincode-submission-ts'"
    fi
  fi
}

notifyOrgsAboutChannels() {

  printHeadline "Creating new channel config blocks" "U1F537"
  createNewChannelUpdateTx "my-channel1" "Org1MSP" "MyChannel1" "$FABLO_NETWORK_ROOT/fabric-config" "$FABLO_NETWORK_ROOT/fabric-config/config"

  printHeadline "Notyfing orgs about channels" "U1F4E2"
  notifyOrgAboutNewChannel "my-channel1" "Org1MSP" "cli.org1.example.com" "peer0.org1.example.com" "orderer0.group1.orderer.example.com:7030"

  printHeadline "Deleting new channel config blocks" "U1F52A"
  deleteNewChannelUpdateTx "my-channel1" "Org1MSP" "cli.org1.example.com"

}

printStartSuccessInfo() {
  printHeadline "Done! Enjoy your fresh network" "U1F984"
}

stopNetwork() {
  printHeadline "Stopping network" "U1F68F"
  (cd "$FABLO_NETWORK_ROOT"/fabric-docker && docker compose stop)
  sleep 4
}

networkDown() {
  printf "Removing chaincode containers & images... \U1F5D1 \n"
  for container in $(docker ps -a | grep "peer0.org1.example.com-chaincode-submission-ts" | awk '{print $1}'); do
    echo "Removing container $container..."
    docker rm -f "$container" || echo "docker rm of $container failed. Check if all fabric dockers properly was deleted"
  done
  for image in $(docker images "peer0.org1.example.com-chaincode-submission-ts*" -q); do
    echo "Removing image $image..."
    docker rmi "$image" || echo "docker rmi of $image failed. Check if all fabric dockers properly was deleted"
  done
  for container in $(docker ps -a | grep "peer1.org1.example.com-chaincode-submission-ts" | awk '{print $1}'); do
    echo "Removing container $container..."
    docker rm -f "$container" || echo "docker rm of $container failed. Check if all fabric dockers properly was deleted"
  done
  for image in $(docker images "peer1.org1.example.com-chaincode-submission-ts*" -q); do
    echo "Removing image $image..."
    docker rmi "$image" || echo "docker rmi of $image failed. Check if all fabric dockers properly was deleted"
  done

  printHeadline "Destroying network" "U1F916"
  (cd "$FABLO_NETWORK_ROOT"/fabric-docker && docker compose down)

  printf "Removing generated configs... \U1F5D1 \n"
  rm -rf "$FABLO_NETWORK_ROOT/fabric-config/config"
  rm -rf "$FABLO_NETWORK_ROOT/fabric-config/crypto-config"
  rm -rf "$FABLO_NETWORK_ROOT/fabric-config/chaincode-packages"

  printHeadline "Done! Network was purged" "U1F5D1"
}
