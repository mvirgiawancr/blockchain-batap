#!/usr/bin/env bash

chaincodeList() {
  if [ "$#" -ne 2 ]; then
    echo "Expected 2 parameters for chaincode list, but got: $*"
    exit 1

  elif [ "$1" = "peer0.org1.example.com" ]; then

    peerChaincodeList "cli.org1.example.com" "peer0.org1.example.com:7041" "$2" # $2 is channel name

  elif
    [ "$1" = "peer1.org1.example.com" ]
  then

    peerChaincodeList "cli.org1.example.com" "peer1.org1.example.com:7042" "$2" # $2 is channel name

  else

    echo "Fail to call listChaincodes. No peer or channel found. Provided peer: $1, channel: $2"
    exit 1

  fi
}

# Function to perform chaincode invoke. Accepts 5 parameters:
#   1. comma-separated peers
#   2. channel name
#   3. chaincode name
#   4. chaincode command
#   5. transient data (optional)
chaincodeInvoke() {
  if [ "$#" -ne 4 ] && [ "$#" -ne 5 ]; then
    echo "Expected 4 or 5 parameters for chaincode list, but got: $*"
    echo "Usage: fablo chaincode invoke <peer_domains_comma_separated> <channel_name> <chaincode_name> <command> [transient]"
    exit 1
  fi

  # Cli needs to be from the same org as the first peer
  if [[ "$1" == "peer0.org1.example.com"* ]]; then
    cli="cli.org1.example.com"
  fi
  if [[ "$1" == "peer1.org1.example.com"* ]]; then
    cli="cli.org1.example.com"
  fi

  peer_addresses="$1"
  peer_addresses="${peer_addresses//peer0.org1.example.com/peer0.org1.example.com:7041}"
  peer_addresses="${peer_addresses//peer1.org1.example.com/peer1.org1.example.com:7042}"

  peerChaincodeInvoke "$cli" "$peer_addresses" "$2" "$3" "$4" "$5"
}

# Function to perform chaincode query for single peer
# Accepts 4-5 parameters:
#   1. single peer domain
#   2. channel name
#   3. chaincode name
#   4. chaincode command
#   5. transient data (optional)
chaincodeQuery() {
  if [ "$#" -ne 4 ] && [ "$#" -ne 5 ]; then
    echo "Expected 4 or 5 parameters for chaincode query, but got: $*"
    echo "Usage: fablo chaincode query <peer_domain> <channel_name> <chaincode_name> <command> [transient]"
    exit 1
  fi

  peer_domain="$1"
  channel_name="$2"
  chaincode_name="$3"
  command="$4"
  transient="$5"

  cli=""
  peer_address=""

  if [ "$peer_domain" = "peer0.org1.example.com" ]; then
    cli="cli.org1.example.com"
    peer_address="peer0.org1.example.com:7041"

  fi
  if [ "$peer_domain" = "peer1.org1.example.com" ]; then
    cli="cli.org1.example.com"
    peer_address="peer1.org1.example.com:7042"

  fi

  if [ -z "$peer_address" ]; then
    echo "Unknown peer: $peer_domain"
    exit 1
  fi

  peerChaincodeQuery "$cli" "$peer_address" "$channel_name" "$chaincode_name" "$command" "$transient"

}
