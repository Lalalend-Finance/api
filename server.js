const express = require('express');
const bodyParser = require('body-parser');
const Web3 = require('web3');
const addresses = require('./addresses.json');
require('dotenv').config()

const config = require('./config.json');
// ABIS
const comptrollerAbi = require('./abis/comptroller_abi.json');

const sebControllerAbi = require('./abis/seb_controller_abi.json');

const sebVaultAbi = require('./abis/seb_vault_abi.json');

const ntokenAbi = require('./abis/ntoken_abi.json');

const erc20Abi = require('./abis/erc20_abi.json');

const miaLensAbi = require('./abis/mia_lens_abi.json');

const governorAbi = require('./abis/governor_abi.json');

const miaAbi = require('./abis/mia_abi.json');

const oracleAbi = require('./abis/oracle_abi.json');

const walletPrivateKey = process.env.walletPrivateKey;
const web3 = new Web3(new Web3.providers.HttpProvider('https://eth.bd.evmos.dev:8545'));
const myAcc = web3.eth.accounts.wallet.add(walletPrivateKey);
//const myWalletAddress = web3.eth.accounts.wallet[0].address;

// Unitroller which delegates calls to Comptroller
const unitrollerAddress = addresses.unitrollerAddress;
const unitrollerContract = new web3.eth.Contract(comptrollerAbi, unitrollerAddress);

// SEBUnitroller which delegates calls to SEBController
const sebUnitrollerAddress = addresses.sebUnitrollerAddress;
const sebUnitrollerContract = new web3.eth.Contract(sebControllerAbi, sebUnitrollerAddress);

// SEBVaultProxy which delegates calls to SEBVault
const sebVaultProxyAddress = addresses.sebVaultProxyAddress;
const sebVaultProxyContract = new web3.eth.Contract(sebVaultAbi, sebVaultProxyAddress);

//array that contains all ntokens address whitelisted on lalalend
const ntokens_array = config.ntokens_array;

//MiaLens 
const miaLensAddress = addresses.miaLensAddress;
const miaLensContract = new web3.eth.Contract(miaLensAbi, miaLensAddress);

//GovernorBravoDelegator which delegates calls to GovernorBravoDelegate
const governorAddress = addresses.governorAddress;
const governorContract = new web3.eth.Contract(governorAbi, governorAddress);

// MIA address
const miaAddress = addresses.miaAddress;
const miaContract = new web3.eth.Contract(miaAbi, miaAddress);

// ORACLE
const oracleAddress = addresses.oracleAddress;
const oracleContract = new web3.eth.Contract(oracleAbi, oracleAddress);

function getNTokenContract(address) {
  return new web3.eth.Contract(ntokenAbi, address);
}

function getErc20Contract(address) {
  if (address === "0x0000000000000000000000000000000000000000") return;
  return new web3.eth.Contract(erc20Abi, address);
}

async function getPastEvents(contract, type, fromBlock, toBlock) {
  if (fromBlock <= toBlock) {
      try {
          const options = {
              fromBlock: fromBlock,
              toBlock  : toBlock
          };
          return await contract.getPastEvents(type, options);
      }
      catch (error) {
          const midBlock = (fromBlock + toBlock) >> 1;
          const arr1 = await getPastEvents(contract, type, fromBlock, midBlock);
          const arr2 = await getPastEvents(contract, type, midBlock + 1, toBlock);
          return [...arr1, ...arr2];
      }
  }
  return [];
}

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req,res) => {
  res.send('hello this is the LALALEND API');
})

app.get('/governance/mia', async (req,res) => {
  var miaRate;
  var dailyMia;

  await unitrollerContract.methods.miaRate().call()
    .then((result) => {
      miaRate = web3.utils.fromWei(result);
      console.log("miaRate : " + miaRate);
    }).catch((error) => {
      console.error('mia rate error:', error);
      return res.sendStatus(400);
  });


  var markets = [];
  var marketsRes = [];
  var finalArray= [];

  const evmosMantissa = 1e18;
  const blocksPerDay = 20 * 60 * 24;
  const daysPerYear = 365;

  await unitrollerContract.methods.getAllMarkets().call()
    .then((result) => {
      markets = result;
      console.log("markets : " + JSON.stringify(markets));
    }).catch((error) => {
      console.error('getAllMarkets error:', error);
      return res.sendStatus(400);
  });

  await miaLensContract.methods.nTokenMetadataAll(markets).call()
    .then((result)=> {
      marketsRes = result
      /*for (var i=0; i<marketsRes.length; i++) {
        console.log("token " + i+ " : " + JSON.stringify(marketsRes[i]));
      }*/
    }).catch((error) => {
      console.error('get nTokenMetadatAll error:', error);
      return res.sendStatus(400);
  });



  for (item of marketsRes) {
    if(item.nToken != "0x5fF141cd9fb7A3137d43f3116F99a78Ab46FE5e4") {
      var address = item.nToken;
      console.log("address is : " + address);
      var symbol;
      var name;
      var underlyingAddress = item.underlyingAssetAddress;
      console.log("underlyingAddress is : " + underlyingAddress);

      var underlyingName;
      var underlyingSymbol;
      var underlyingDecimal = item.underlyingDecimals; 
      var miaSpeeds;
      var borrowerDailyMia = item.dailyBorrowMia; 
      var supplierDailyMia = item.dailySupplyMia;

      var miaBorrowIndex;
      var miaSupplyIndex;

      var borrowRatePerBlock = item.borrowRatePerBlock; 
      var supplyRatePerBlock = item.supplyRatePerBlock; 
      var exchangeRate = item.exchangeRateCurrent;

      var underlyingPrice;

      var totalBorrows = item.totalBorrows; 
      var totalBorrows2 = item.totalBorrows; 
      var totalBorrowsUsd = item.totalBorrows;
      var totalSupply = item.totalSupply; 
      var totalSupply2 = item.totalSupply;
      var totalSupplyUsd = item.totalSupply;
      var cash = item.totalCash; 
      var totalReserves = item.totalReserves; 
      var reserveFactor = item.reserveFactorMantissa; 
      var collateralFactor = item.collateralFactorMantissa; 
      const borrowApy = (((Math.pow((borrowRatePerBlock / evmosMantissa * blocksPerDay) + 1, daysPerYear))) - 1) * 100;
      const supplyApy = (((Math.pow((supplyRatePerBlock / evmosMantissa * blocksPerDay) + 1, daysPerYear))) - 1) * 100;
      
      var borrowMiaApy;
      var supplyMiaApy;
      var borrowMiaApr;
      var supplyMiaApr;

      var liquidity; 
      var tokenPrice;
      var totalDistributed;
      var totalDistributed2;

      var borrowCaps;

      var lastCalculatedBlockNumber; 
      var borrowerCount; 
      var supplierCount;

      dailyMia += borrowerDailyMia + supplierDailyMia;

      await unitrollerContract.methods.miaSpeeds(address).call()
        .then((result) => {
          miaSpeeds = web3.utils.fromWei(result);
          console.log("miaSpeeds : " + miaSpeeds);
        }).catch((error) => {
          console.error('mia speed error:', error);
          return res.sendStatus(400);
      });
      await unitrollerContract.methods.borrowCaps(address).call()
        .then((result) => {
          borrowCaps = web3.utils.fromWei(result);
          console.log("borrow cap : " + borrowCaps);
        }).catch((error) => {
          console.error('borrow caps error: ', error);
          return res.sendStatus(400);
      });

      var contractToken = getNTokenContract(address);
      await contractToken.methods.symbol().call()
        .then((result) => {
          symbol = result;
          console.log("symbol : " + symbol);
        }).catch((error) => {
          console.error('get symbol error:', error);
          return res.sendStatus(400);
      });
      await contractToken.methods.name().call()
        .then((result) => {
          name = result;
          console.log("name : " + name);

        }).catch((error) => {
          console.error('get name error:', error);
          return res.sendStatus(400);
      });

      if(symbol != "nMIA" && symbol != "SEB") {
          switch (symbol) {
            case "nEVMOS":
              underlyingName = "WEVMOS"
              underlyingSymbol = "WEVMOS"
              break;
            default:
              break;
          }
      }else{
        console.log('trying to access ... underlying : '+ underlyingAddress);
        var contractUnderlyingToken = getErc20Contract(underlyingAddress);
        await contractUnderlyingToken.methods.name().call()
          .then((result) => {
            underlyingName = result;
            console.log("underlyingName : " + underlyingName);
  
          }).catch((error) => {
            console.error('get name underlying error:', error);
            return res.sendStatus(400);
        });
        await contractUnderlyingToken.methods.symbol().call()
          .then((result) => {
            underlyingSymbol = result;
            console.log("underlyingSymbol : " + underlyingSymbol);
  
          }).catch((error) => {
            console.error('get symbol underlying error:', error);
            return res.sendStatus(400);
        });
      }
      

      var MIA = addresses.miaAddress;
      var contractMIAUnderlyingToken = getNTokenContract(MIA);
      await contractMIAUnderlyingToken.methods.borrowIndex().call()
        .then((result) => {
          miaBorrowIndex = result;
        }).catch((error) => {
          console.error('get borrow index mia error:', error);
          return res.sendStatus(400);
      });

      /*await contractMIAUnderlyingToken.methods.supplyIndex().call()
        .then((result) => {
          miaSupplyIndex = result;
        }).catch((error) => {
          console.error('get supply index mia error:', error);
          return res.sendStatus(400);
      });
      */

      await miaLensContract.methods.nTokenUnderlyingPrice(address).call()
        .then((result)=> {
          underlyingPrice = result.underlyingPrice;
          //console.log("underlyingPrice is : "+ underlyingPrice.underlyingPrice);
        }).catch((error) => {
          console.error('get ntokenUnderlying Price error:', error);
          return res.sendStatus(400);
      });

      var miaPrice;
      // TODO :  read the oracle to get miaPrice : miaAddress
      await oracleContract.methods.getUnderlyingPrice(addresses.miaAddress).call()
        .then((result)=> {
            miaPrice = result;
        }).catch((error)=> {
          console.error('get ntokenUnderlying Price error:', error);
          return res.sendStatus(400);
      })
      borrowMiaApy = 100 * (Math.pow((1 + (miaPrice * borrowerDailyMia / (totalBorrows * underlyingPrice))), 365) - 1);
      supplyMiaApy = 100 * (Math.pow((1 + (miaPrice * supplierDailyMia / (totalSupply * exchangeRate * underlyingPrice))), 365) - 1);
      borrowMiaApr = (Math.pow((1 + borrowMiaApy), 1/365) - 1) * 365;
      supplyMiaApr = (Math.pow((1 + supplyMiaApy), 1/365) - 1) * 365;

      console.log("underlyingName : "+ underlyingName);
      console.log("underlying Symbol : "+ underlyingSymbol);

      var solo_market = {
        "address" : address,
        "symbol" : symbol,
        "name": name,
        "underlyingAddress": underlyingAddress,
        "underlyingName": underlyingName,
        "underlyingSymbol": underlyingSymbol,
        "underlyingDecimal": underlyingDecimal,
        "miaSpeeds": miaSpeeds,
        "borrowerDailyMia": borrowerDailyMia,
        "supplierDailyMia": supplierDailyMia,
        "miaBorrowIndex": miaBorrowIndex,
        "miaSupplyIndex": 0, //miaSupplyIndex,
        "borrowRatePerBlock": borrowRatePerBlock,
        "supplyRatePerBlock": supplyRatePerBlock,
        "exchangeRate": exchangeRate,
        "underlyingPrice": underlyingPrice,
        "totalBorrows": totalBorrows,
        "totalBorrows2": totalBorrows2,
        "totalBorrowsUsd": totalBorrowsUsd,
        "totalSupply": totalSupply,
        "totalSupply2": totalSupply2,
        "totalSupplyUsd": totalSupplyUsd,
        "cash": cash,
        "totalReserves": totalReserves,
        "reserveFactor": reserveFactor,
        "collateralFactor": collateralFactor,
        "borrowApy": borrowApy,
        "supplyApy": supplyApy,
        "borrowMiaApy": borrowMiaApy,
        "supplyMiaApy": supplyMiaApy,
        "borrowMiaApr": borrowMiaApr,
        "supplyMiaApr": supplyMiaApr,
        "liquidity":"",
        "tokenPrice": underlyingPrice,
        "totalDistributed":"",
        "totalDistributed2":"",
        "borrowCaps": borrowCaps,
        "lastCalculatedBlockNumber": "",
        "borrowerCount": "",
        "supplierCount":""
      }
      finalArray.push(solo_market);
      //console.log("final Array after pushing is : "+ JSON.stringify(finalArray));
    }
  }

  //console.log("final array is : "+ finalArray);

  const resJson = {
    "data": {
      "miaRate": miaRate,
      "dailyMia": dailyMia,
      "markets": finalArray
    }
  }
  res.json(resJson);

})

// should be ok
app.get('/transactions', (req,res)=> {
  const page = req.query.page;
  const order = req.query.order;
  const sort = req.query.sort;
  const event = req.query.event;

  let results = [];
  let total = 0;

  // RETRIEVE MINT EVENT
 /*const mints = [];
  for (ad of ntokens_array) {
    const ntokContract = new web3.eth.Contract(ntokenAbi, ad);
    console.log("address : "+ ad);
    /*const mintEvents = ntokContract.getPastEvents('Mint', {
      fromBlock: 0,
      toBlock: 'latest'
    })
    const latest = await web3.eth.getBlock("latest");
    //console.log("latest " + JSON.stringify(latest));
    //const ntokContract = new web3.eth.Contract(ntokenAbi, );
    const events = await getPastEvents(ntokContract, 'Mint', latest.number - 300000, latest.number);
    console.log("mint events : "+ JSON.stringify(events));
    for (mintEvent of events) {
      const {minter, mintAmount, mintTokens} = mintEvent.returnValues;
      const timestamp = await web3.eth.getBlock(mintEvent.blockNumber).timestamp;

      var solo_mint = {
        "category": "ntoken",
        "event": "Mint",
        "transactionHash": mintEvent.transactionHash,
        "from": minter,
        "to":"",
        "nTokenAddress": ad,
        "amount": mintAmount,
        "blockNumber": mintEvent.blockNumber,
        "timestamp": timestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      mints.push(solo_mint);
    }
  }
  console.log("mints done ? : " + JSON.stringify(mints));

  
  /*
  // RETRIEVE TRANSFER EVENT
  const transfers = [];
  ntokens_array.forEach( (address) => {
    const ntokContract = new web3.eth.Contract(ntokenAbi, address);
    const transfersEvents = ntokContract.getPastEvents('Transfer', {
      fromBlock: 0,
      toBlock: 'latest'
    });
    transfersEvents.forEach((item)=> {
      const {from, to, amount} = item.returnValues;
      const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

      var solo_transfer = {
        "category": "ntoken",
        "event": "Transfer",
        "transactionHash": item.transactionHash,
        "from": from,
        "to": to,
        "nTokenAddress": address,
        "amount": amount,
        "blockNumber": item.blockNumber,
        "timestamp": timestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      transfers.push(solo_transfer);
    })

  const resJson = {
    "data": {
      "limit": 20,
      "page": page,
      "total": total,
      "result": results
    }
  }


  })

  // RETRIEVE BORROW
  const borrows = [];
  ntokens_array.forEach( (address) => {
    const ntokContract = new web3.eth.Contract(ntokenAbi, address);
    const borrowsEvents = ntokContract.getPastEvents('Borrow', {
      fromBlock: 0,
      toBlock: 'latest'
    });
    borrowsEvents.forEach((item)=> {
      const {borrower, borrowAmount, accountBorrows, totalBorrows} = item.returnValues;
      const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

      var solo_borrow = {
        "category": "ntoken",
        "event": "Borrow",
        "transactionHash": item.transactionHash,
        "from": borrower,
        "to": "",
        "nTokenAddress": address,
        "amount": borrowAmount,
        "blockNumber": item.blockNumber,
        "timestamp": timestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      borrows.push(solo_borrow);
    })
  })

  // RETRIEVE REPAY BORROW
  const repay_borrows = [];
  ntokens_array.forEach( (address) => {
    const ntokContract = new web3.eth.Contract(ntokenAbi, address);
    const repayBorrowEvents = ntokContract.getPastEvents('RepayBorrow', {
      fromBlock: 0,
      toBlock: 'latest'
    });
    repayBorrowEvents.forEach((item)=> {
      const {borrower, borrowAmount, accountBorrows, totalBorrows} = item.returnValues;
      const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

      var solo_repay_borrow = {
        "category": "ntoken",
        "event": "RepayBorrow",
        "transactionHash": item.transactionHash,
        "from": borrower,
        "to": "",
        "nTokenAddress": address,
        "amount": borrowAmount,
        "blockNumber": item.blockNumber,
        "timestamp": timestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      repay_borrows.push(solo_repay_borrow);
    })
  })

  // RETRIEVE REDEEM
  const redeems = [];
  ntokens_array.forEach( (address) => {
    const ntokContract = new web3.eth.Contract(ntokenAbi, address);
    const redeemEvents = ntokContract.getPastEvents('Redeem', {
      fromBlock: 0,
      toBlock: 'latest'
    });
    redeemEvents.forEach((item)=> {
      const {redeemer, redeemAmount, redeemTokens} = item.returnValues;
      const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

      var solo_redeem = {
        "category": "ntoken",
        "event": "Redeem",
        "transactionHash": item.transactionHash,
        "from": redeemer,
        "to": "",
        "nTokenAddress": address,
        "amount": redeemAmount,
        "blockNumber": item.blockNumber,
        "timestamp": timestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      redeems.push(solo_redeem);
    })
  })

  // RETRIEVE APPROVAL
  const approvals = [];
  ntokens_array.forEach( (address) => {
    const ntokContract = new web3.eth.Contract(ntokenAbi, address);
    const approvalsEvents = ntokContract.getPastEvents('Approval', {
      fromBlock: 0,
      toBlock: 'latest'
    });
    approvalsEvents.forEach((item)=> {
      const {owner, spender, amount} = item.returnValues;
      const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

      var solo_approval = {
        "category": "ntoken",
        "event": "Approval",
        "transactionHash": item.transactionHash,
        "from": owner,
        "to": spender,
        "nTokenAddress": address,
        "amount": amount,
        "blockNumber": item.blockNumber,
        "timestamp": timestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      approvals.push(solo_approval);
    })
  })

  // RETRIEVE LIQUIDATE BORROW
  const liquidate_borrows = [];
  ntokens_array.forEach( (address) => {
    const ntokContract = new web3.eth.Contract(ntokenAbi, address);
    const liquidateBorrowEvents = ntokContract.getPastEvents('LiquidateBorrow', {
      fromBlock: 0,
      toBlock: 'latest'
    });
    liquidateBorrowEvents.forEach((item)=> {
      const {liquidator, borrower, repayAmount, nTokenCollateral, seizeTokens} = item.returnValues;
      const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

      var solo_liquidate_borrow = {
        "category": "ntoken",
        "event": "LiquidateBorrow",
        "transactionHash": item.transactionHash,
        "from": liquidator,
        "to": "",
        "nTokenAddress": address,
        "amount": repayAmount,
        "blockNumber": item.blockNumber,
        "timestamp": timestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      liquidate_borrows.push(solo_liquidate_borrow);
    })
  })

  // RETRIEVE RESERVES ADDED
  const reserves_added = [];
  ntokens_array.forEach( (address) => {
    const ntokContract = new web3.eth.Contract(ntokenAbi, address);
    const reservesAddedEvents = ntokContract.getPastEvents('ReservesAdded', {
      fromBlock: 0,
      toBlock: 'latest'
    });
    reservesAddedEvents.forEach((item)=> {
      const {benefactor, addAmount, newTotalReserves} = item.returnValues;
      const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

      var solo_reserve_added = {
        "category": "ntoken",
        "event": "ReservesAdded",
        "transactionHash": item.transactionHash,
        "from": benefactor,
        "to": "",
        "nTokenAddress": address,
        "amount": addAmount,
        "blockNumber": item.blockNumber,
        "timestamp": timestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      reserves_added.push(solo_reserve_added);
    })
  })

  // RETRIEVE RESERVES REDUCED
  const reserves_reduced = [];
  ntokens_array.forEach( (address) => {
    const ntokContract = new web3.eth.Contract(ntokenAbi, address);
    const reservesReducedEvents = ntokContract.getPastEvents('ReservesReduced', {
      fromBlock: 0,
      toBlock: 'latest'
    });
    reservesReducedEvents.forEach((item)=> {
      const {admin, reduceAmount, newTotalReserves} = item.returnValues;
      const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

      var solo_reserve_reduced = {
        "category": "ntoken",
        "event": "ReservesReduced",
        "transactionHash": item.transactionHash,
        "from": admin,
        "to": "",
        "nTokenAddress": address,
        "amount": reduceAmount,
        "blockNumber": item.blockNumber,
        "timestamp": timestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      reserves_reduced.push(solo_reserve_reduced);
    })
  })
 
  // RETRIEVE WITHDRAW SEB
  const withdraws = [];
  const withdrawSebEvents = sebVaultProxyContract.getPastEvents('Withdraw', {
    fromBlock: 0,
    toBlock: 'latest'
  });
  withdrawSebEvents.forEach((item)=> {
    const {user, amount} = item.returnValues;
    const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

    var solo_withdraw = {
      "category": "seb",
      "event": "Withdraw",
      "transactionHash": item.transactionHash,
      "from": user,
      "to": "",
      "nTokenAddress": null,
      "amount": amount,
      "blockNumber": item.blockNumber,
      "timestamp": timestamp,
      "createdAt": "2022-08-20T10:47:42.000Z",
      "updatedAt": "2022-08-20T10:47:42.000Z"
    }
    withdraws.push(solo_withdraw);
  })

  // RETRIEVE DEPOSIT SEB
  const deposits = [];
  const depositSebEvents = sebVaultProxyContract.getPastEvents('Deposit', {
    fromBlock: 0,
    toBlock: 'latest'
  });
  depositSebEvents.forEach((item)=> {
    const {user, amount} = item.returnValues;
    const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

    var solo_deposit = {
      "category": "seb",
      "event": "Deposit",
      "transactionHash": item.transactionHash,
      "from": user,
      "to": "",
      "nTokenAddress": null,
      "amount": amount,
      "blockNumber": item.blockNumber,
      "timestamp": timestamp,
      "createdAt": "2022-08-20T10:47:42.000Z",
      "updatedAt": "2022-08-20T10:47:42.000Z"
    }
    deposits.push(solo_deposit);
  })
  
  // RETRIEVE MINT SEB
  const mintsSEB = []
  const mintSebEvents = sebUnitrollerContract.getPastEvents('MintSEB', {
    fromBlock: 0,
    toBlock: 'latest'
  });
  mintSebEvents.forEach((item)=> {
    const {minter, mintNAIAmount} = item.returnValues;
    const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

    var solo_mintSEB = {
      "category": "seb",
      "event": "MintSEB",
      "transactionHash": item.transactionHash,
      "from": minter,
      "to": "",
      "nTokenAddress": null,
      "amount": mintNAIAmount,
      "blockNumber": item.blockNumber,
      "timestamp": timestamp,
      "createdAt": "2022-08-20T10:47:42.000Z",
      "updatedAt": "2022-08-20T10:47:42.000Z"
    }
    mintsSEB.push(solo_mintSEB);
  })

  // RETRIEVE REPAY SEB
  const repaysSEB = []
  const repaySebEvents = sebUnitrollerContract.getPastEvents('RepaySEB', {
    fromBlock: 0,
    toBlock: 'latest'
  });
  repaySebEvents.forEach((item)=> {
    const {payer, borrower, mintNAIAmount} = item.returnValues;
    const timestamp = web3.eth.getBlock(item.blockNumber).timestamp;

    var solo_repaySEB = {
      "category": "seb",
      "event": "RepaySEB",
      "transactionHash": item.transactionHash,
      "from": payer,
      "to": "",
      "nTokenAddress": null,
      "amount": mintNAIAmount,
      "blockNumber": item.blockNumber,
      "timestamp": timestamp,
      "createdAt": "2022-08-20T10:47:42.000Z",
      "updatedAt": "2022-08-20T10:47:42.000Z"
    }
    repaysSEB.push(solo_repaySEB);
  })

  // RETRIEVE VOTE CASTS
  const voteCasts = [];
  const voteCastEvents = governorContract.getPastEvents('VoteCast', {
    fromBlock: 0,
    toBlock: 'latest'
  });
  voteCastEvents.forEach((item)=> {
    const { voter, proposalId, support, votes, reason } = item.returnValues;
      const blockTimestamp = web3.eth.getBlock(item.blockNumber).timestamp;
      var item = {
        "category": "vote",
        "event": "VoteCast",
        "transactionHash": item.transactionHash,
        "from": "",
        "to": "",
        "nTokenAddress": null,
        "amount": 0,
        "blockNumber": item.blockNumber,
        "timestamp": blockTimestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      voteCasts.push(item);
  });

  // RETRIEVE PROPOSAL CREATED
  const proposalsCreated = [];
  const proposalsCreatedEvents = governorContract.getPastEvents('ProposalCreated', {
    fromBlock: 0,
    toBlock: 'latest'
  });
  proposalsCreatedEvents.forEach((item)=> {
    const { id, proposer, targets, values, signatures, calldatas,startBlock, endBlock, description  } = item.returnValues;
      const blockTimestamp = web3.eth.getBlock(item.blockNumber).timestamp;
      var item = {
        "category": "vote",
        "event": "ProposalCreated",
        "transactionHash": item.transactionHash,
        "from": "",
        "to": "",
        "nTokenAddress": null,
        "amount": 0,
        "blockNumber": item.blockNumber,
        "timestamp": blockTimestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      proposalsCreated.push(item);
  });

  // RETRIEVE PROPOSAL CANCELED
  const proposalsCanceled = [];
  const proposalsCanceledEvents = governorContract.getPastEvents('ProposalCanceled', {
    fromBlock: 0,
    toBlock: 'latest'
  });
  proposalsCanceledEvents.forEach((item)=> {
    const { id } = item.returnValues;
      const blockTimestamp = web3.eth.getBlock(item.blockNumber).timestamp;
      var item = {
        "category": "vote",
        "event": "ProposalCanceled",
        "transactionHash": item.transactionHash,
        "from": "",
        "to": "",
        "nTokenAddress": null,
        "amount": 0,
        "blockNumber": item.blockNumber,
        "timestamp": blockTimestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      proposalsCanceled.push(item);
  });

  // RETRIEVE PROPOSAL QUEUED
  const proposalsQueued = [];
  const proposalsQueuedEvents = governorContract.getPastEvents('ProposalQueued', {
    fromBlock: 0,
    toBlock: 'latest'
  });
  proposalsQueuedEvents.forEach((item)=> {
    const { id } = item.returnValues;
      const blockTimestamp = web3.eth.getBlock(item.blockNumber).timestamp;
      var item = {
        "category": "vote",
        "event": "ProposalQueued",
        "transactionHash": item.transactionHash,
        "from": "",
        "to": "",
        "nTokenAddress": null,
        "amount": 0,
        "blockNumber": item.blockNumber,
        "timestamp": blockTimestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      proposalsQueued.push(item);
  });

  // RETRIEVE PROPOSAL EXECUTED
  const proposalsExecuted = [];
  const proposalsExecutedEvents = governorContract.getPastEvents('ProposalExecuted', {
    fromBlock: 0,
    toBlock: 'latest'
  });
  proposalsExecutedEvents.forEach((item)=> {
    const { id } = item.returnValues;
      const blockTimestamp = web3.eth.getBlock(item.blockNumber).timestamp;
      var item = {
        "category": "vote",
        "event": "ProposalQueued",
        "transactionHash": item.transactionHash,
        "from": "",
        "to": "",
        "nTokenAddress": null,
        "amount": 0,
        "blockNumber": item.blockNumber,
        "timestamp": blockTimestamp,
        "createdAt": "2022-08-20T10:47:42.000Z",
        "updatedAt": "2022-08-20T10:47:42.000Z"
      }
      proposalsExecuted.push(item);
  });
  */

  //total = total + 
    //transfers.length + 
    //borrows.length + 
    //repay_borrows.length + 
    //approvals.length + 
    //redeems.length + 
    //liquidate_borrows.length + 
    //reserves_reduced.length + 
    //reserves_added.length + 
    //withdraws.length + 
    //deposits.length + 
    //mintsSEB.length + 
    //repaysSEB.length + 
//mints.length 
    //voteCasts.length + 
    //proposalsCreated.length + 
    //proposalsCanceled.length + 
    //proposalsExecuted.length + 
    //proposalsQueued.length
  //;

  /*switch (event) {
    case "ProposalQueued":
      results = proposalsQueued;
      break;
    case "ProposalCanceled":
      results = proposalsCanceled;
      break;
    case "ProposalExecuted":
      results = proposalsExecuted;
      break;
    case "ProposalCreated":
      results = proposalsCreated;
      break;
    case "Mint":
      results = mints;
      break;
    case "Transfer":
      results = transfers;
      break;
    case "Borrow":
      results = borrows;
      break;
    case "RepayBorrow":
      results = repay_borrows;
      break;
    case "Redeem":
      results = redeems;
      break;
    case "Approval":
      results = approvals;
      break;
    case "LiquidateBorrow":
      results = liquidate_borrows;
      break;
    case "ReservesAdded":
      results = reserves_added;
      break;
    case "ReservesReduced":
      results = reserves_reduced;
      break;
    case "MintSEB":
      results = mintsSEB;
      break;
    case "Withdraw":
      results = withdraws;
      break;
    case "RepaySEB":
      results = repaysSEB;
      break;
    case "Deposit":
      results = deposits;
      break;
    case "VoteCast":
      results = voteCasts;
      break;
    default:
      results.push(...proposalsQueued)
      results.push(...proposalsCanceled)
      results.push(...proposalsExecuted)
      results.push(...proposalsCreated)
      results.push(...mints)
      results.push(...transfers)
      results.push(...borrows)
      results.push(...redeems)
      results.push(...approvals)
      results.push(...liquidate_borrows)
      results.push(...reserves_added)
      results.push(...reserves_reduced)
      results.push(...mintsSEB)
      results.push(...withdraws)
      results.push(...repaysSEB)
      results.push(...deposits)
      results.push(...voteCasts)
      break;
  }*/

  /*results.push(...mints);

  switch (order) {
    case "blockNumber":
      results.sort((a,b) => (a.blockNumber > b.blockNumber) ? 1 : ((b.blockNumber > a.blockNumber) ? -1 : 0))
      break;
    case "amount":
      results.sort((a,b) => (a.amount > b.amount) ? 1 : ((b.amount > a.amount) ? -1 : 0))
      break;
    case "timestamp":
      results.sort((a,b) => (a.timestamp > b.timestamp) ? 1 : ((b.timestamp > a.timestamp) ? -1 : 0))
      break;
    default:
      results.sort((a,b) => (a.blockNumber > b.blockNumber) ? 1 : ((b.blockNumber > a.blockNumber) ? -1 : 0))
      break;
  }*/
  
  //results = results.slice( page * 20, (page+1) * 20 );
  results = [{"category":"ntoken","event":"Mint","transactionHash":"0x4227a0c51e96864791b8fbfa60ac81f6507913f7670e5999ae383b06b2bf1520","from":"0xE3678E00F1a669EBDCb146c66DbD43dBb2f4A1d9","to":"0xdffjkdjkefff","nTokenAddress":"0xd9edE9aDe6090987fB3eBE4750877C66b32c002E","amount":"100000000000000000000000","blockNumber":5628802,"createdAt":"2022-08-20T10:47:42.000Z","updatedAt":"2022-08-20T10:47:42.000Z"},{"category":"ntoken","event":"Mint","transactionHash":"0x03ffe8c00b1fd9d069a59fa5d0926a2626d817cc5fe083b71212bffb8af35824","from":"0xE3678E00F1a669EBDCb146c66DbD43dBb2f4A1d9","to":"","nTokenAddress":"0xd9edE9aDe6090987fB3eBE4750877C66b32c002E","amount":"100000000000000000000000","blockNumber":5628986,"createdAt":"2022-08-20T10:47:42.000Z","updatedAt":"2022-08-20T10:47:42.000Z"},{"category":"ntoken","event":"Mint","transactionHash":"0x60cf1fb5b79230bbbdb014af96af78d4d98a7e9afa09c3370855ab6b2db61389","from":"0xE3678E00F1a669EBDCb146c66DbD43dBb2f4A1d9","to":"","nTokenAddress":"0xfaa9Bb1E7602AB9A9aAea86cCcbB6B3ddeAbbc54","amount":"20000000000000000000","blockNumber":5629113,"createdAt":"2022-08-20T10:47:42.000Z","updatedAt":"2022-08-20T10:47:42.000Z"},{"category":"ntoken","event":"Mint","transactionHash":"0xa0c2ca1f7acaa150cbabf6f205c881e0e9f1f968ec2a0e489e833ddc2decfb06","from":"0xE3678E00F1a669EBDCb146c66DbD43dBb2f4A1d9","to":"","nTokenAddress":"0xd9edE9aDe6090987fB3eBE4750877C66b32c002E","amount":"100000000000000000000000","blockNumber":5664397,"createdAt":"2022-08-20T10:47:42.000Z","updatedAt":"2022-08-20T10:47:42.000Z"}]
  //console.log('results : '+ JSON.stringify(results));
  const resJson = {
    "data": {
      "limit": 20,
      "page": page,
      "total": total,
      "result": results
    }
  }
  res.json(resJson);
  
})

// should be ok
app.get('/proposals', (req,res) => {
  const offset = req.query.offset;
  const limit = req.query.limit;
  if(offset === undefined) offset = 0;
  if(limit === undefined) limit = 100;


  var total;
  var proposals = [];
  var finalArray = [];

  governorContract.methods.proposalCount().call()
    .then((result) => {
      total = web3.utils.fromWei(result);
    }).catch((error) => {
      console.error('proposalCOUNT error:', error);
      return res.sendStatus(400);
  });

  var proposalsIds = [];
  for(var i=1;i<=total;i++){
    proposalsIds.push(i);
  }
  var proposalsIdsWithParams = [];
  for(var i = total - limit + 1 - offset; i<= total - offset ;i++) {
    proposalsIdsWithParams.push(i);
  }

  miaLensContract.methods.getGovProposals(governorAddress,proposalsIdsWithParams).call()
    .then((result)=> {
      proposals = result
    }).catch((error) => {
      console.error('get getGovProposals error:', error);
      return res.sendStatus(400);
  });

  proposals.map((item)=> {
    var state ;
    governorContract.methods.state(item.proposalId).call()
      .then((result) => {
        state = result;
      }).catch((error) => {
        console.error('state error:', error);
        return res.sendStatus(400);
    });

    // GET THE EVENT WHEN THE PROPOSAL HAS BEEN CREATED TO RETRIEVE ADDDINTITONAL INFOS

    const proposalCreatedEvents = governorContract.getPastEvents('ProposalCreated', {
      filter : {id : item.proposalId},
      fromBlock: 0,
      toBlock: 'latest'
    });
    var proposalEvent = proposalCreatedEvents[0];
    const {id,proposer, targets, values, signatures, calldatas, startBlock, endBlock, description} = proposalEvent.returnValues;
    const blockTimestamp = web3.eth.getBlock(proposalEvent.blockNumber).timestamp;

    // CHECK IF THE STATE IS WHETHER CANCELED, EXECUTED OR DEFEATED, OR QUEUED
    var cancelBlock = null;
    var cancelTxHash = null;
    var cancelTimestamp = null;
    var queuedBlock = null;
    var queuedTxHash = null;
    var queuedTimestamp = null;
    var executedBlock = null;
    var executedTxHash = null;
    var executedTimestamp = null;

    if(state === "Canceled") {
      // retrieve infos about the event to get cancel infos
      const proposalCanceledEvents = governorContract.getPastEvents('ProposalCanceled', {
        filter : {id : item.proposalId},
        fromBlock: 0,
        toBlock: 'latest'
      });
      var canceledEvent = proposalCanceledEvents[0];
      cancelBlock = canceledEvent.blockNumber;
      cancelTxHash = canceledEvent.transactionHash;
      cancelTimestamp = web3.eth.getBlock(canceledEvent.blockNumber).timestamp;

    }
    if(state === "Executed") {

      const proposalQueuedEvents = governorContract.getPastEvents('ProposalQueued', {
        filter : {id : item.proposalId},
        fromBlock: 0,
        toBlock: 'latest'
      });
      var queuedEvent = proposalQueuedEvents[0];
      queuedBlock = queuedEvent.blockNumber;
      queuedTxHash = queuedEvent.transactionHash;
      queuedTimestamp = web3.eth.getBlock(queuedEvent.blockNumber).timestamp;

      const proposalExecutedEvents = governorContract.getPastEvents('ProposalExecuted', {
        filter : {id : item.proposalId},
        fromBlock: 0,
        toBlock: 'latest'
      });
      var executedEvent = proposalExecutedEvents[0];
      executedBlock = executedEvent.blockNumber;
      executedTxHash = executedEvent.transactionHash;
      executedTimestamp = web3.eth.getBlock(executedEvent.blockNumber).timestamp;
    }

    var startTimestamp = web3.eth.getBlock(item.startBlock).timestamp;
    var endTimestamp = web3.eth.getBlock(item.endBlock).timestamp;
    var startTx = web3.eth.getBlock(item.startBlock).hash;
    var endTx = web3.eth.getBlock(item.endBlock).hash;

    var actions = [];
    for(var i=0;i<item.targets.length;i++){
      var solo_action = {
        "signature": item.signatures[i],
        "target": item.targets[i],
        "value": item.values[i],
        "title":"",
        "data": item.calldatas[i]
      }
      actions.push(solo_action);
    }
    var solo_item = {
      "id": item.proposalId,
      "description": description,
      "targets": item.targets,
      "values": item.values,
      "signatures": item.signatures,
      "calldatas": item.calldatas,
    
      "createdBlock":proposalEvent.blockNumber,
      "createdTxHash": proposalEvent.transactionHash, 
      "createdTimestamp": blockTimestamp, 

      "startBlock": item.startBlock,

      "startTxHash": startTx,
      "startTimestamp": startTimestamp,

      "cancelBlock": cancelBlock,
      "cancelTxHash": cancelTxHash,
      "cancelTimestamp": cancelTimestamp,

      "endBlock": item.endBlock,

      "endTxHash": endTx,
      "endTimestamp":endTimestamp,

      "queuedBlock": queuedBlock,
      "queuedTxHash": queuedTxHash,
      "queuedTimestamp": queuedTimestamp,

      "executedBlock": executedBlock,
      "executedTxHash": executedTxHash,
      "executedTimestamp": executedTimestamp,

      "proposer": item.proposer,
      "eta": item.eta,
      "forVotes": item.forVotes,
      "againstVotes": item.againstVotes,
      "canceled": item.canceled,
      "executed": item.executed,
      "state": state,
      "voterCount":null,
      "abstainedVotes":item.abstainVotes,
      "governorName":"GovernorBravoDelegate",
      "createdAt":"2022-07-19T11:22:11.000Z",
      "updatedAt":"2022-08-19T12:51:04.000Z",
      "actions": actions,
      "blockNumber":22087593
    }

    finalArray.push(solo_item);
  })

  finalArray.reverse();
  const resJson = {
    "data": {
      "offset": offset,
      "limit": limit,
      "total": total,
      "result": finalArray
    }
  }
  res.json(resJson);

})

// should be ok
app.get('/proposals/:id', (req,res) => {
  var proposal = [];
  miaLensContract.methods.getGovProposals(governorAddress,[req.params.id]).call()
    .then((result)=> {
      proposal = result
    }).catch((error) => {
      console.error('get getGovProposals error:', error);
      return res.sendStatus(400);
  });
  const item = proposal[0];


  // GET THE EVENT WHEN THE PROPOSAL HAS BEEN CREATED TO RETRIEVE ADDDINTITONAL INFOS

  const proposalCreatedEvents = governorContract.getPastEvents('ProposalCreated', {
    filter : {id : item.proposalId},
    fromBlock: 0,
    toBlock: 'latest'
  });
  var proposalEvent = proposalCreatedEvents[0];
  const {id,proposer, targets, values, signatures, calldatas, startBlock, endBlock, description} = proposalEvent.returnValues;
  const blockTimestamp = web3.eth.getBlock(proposalEvent.blockNumber).timestamp;

  // CHECK IF THE STATE IS WHETHER CANCELED, EXECUTED OR DEFEATED, OR QUEUED
  var cancelBlock = null;
  var cancelTxHash = null;
  var cancelTimestamp = null;
  var queuedBlock = null;
  var queuedTxHash = null;
  var queuedTimestamp = null;
  var executedBlock = null;
  var executedTxHash = null;
  var executedTimestamp = null;

  if(state === "Canceled") {
    // retrieve infos about the event to get cancel infos
    const proposalCanceledEvents = governorContract.getPastEvents('ProposalCanceled', {
      filter : {id : item.proposalId},
      fromBlock: 0,
      toBlock: 'latest'
    });
    var canceledEvent = proposalCanceledEvents[0];
    cancelBlock = canceledEvent.blockNumber;
    cancelTxHash = canceledEvent.transactionHash;
    cancelTimestamp = web3.eth.getBlock(canceledEvent.blockNumber).timestamp;

  }
  if(state === "Executed") {

    const proposalQueuedEvents = governorContract.getPastEvents('ProposalQueued', {
      filter : {id : item.proposalId},
      fromBlock: 0,
      toBlock: 'latest'
    });
    var queuedEvent = proposalQueuedEvents[0];
    queuedBlock = queuedEvent.blockNumber;
    queuedTxHash = queuedEvent.transactionHash;
    queuedTimestamp = web3.eth.getBlock(queuedEvent.blockNumber).timestamp;

    const proposalExecutedEvents = governorContract.getPastEvents('ProposalExecuted', {
      filter : {id : item.proposalId},
      fromBlock: 0,
      toBlock: 'latest'
    });
    var executedEvent = proposalExecutedEvents[0];
    executedBlock = executedEvent.blockNumber;
    executedTxHash = executedEvent.transactionHash;
    executedTimestamp = web3.eth.getBlock(executedEvent.blockNumber).timestamp;
  }

  var startTimestamp = web3.eth.getBlock(item.startBlock).timestamp;
  var endTimestamp = web3.eth.getBlock(item.endBlock).timestamp;
  var startTx = web3.eth.getBlock(item.startBlock).hash;
  var endTx = web3.eth.getBlock(item.endBlock).hash;

  var actions = [];
  for(var i=0;i<item.targets.length;i++){
    var solo_action = {
      "signature": item.signatures[i],
      "target": item.targets[i],
      "value": item.values[i],
      "title":"",
      "data": item.calldatas[i]
    }
    actions.push(solo_action);
  }

  const finalProposal =  {
    "id": item.proposalId,
    "description": description,
    "targets": item.targets,
    "values": item.values,
    "signatures": item.signatures,
    "calldatas": item.calldatas,

    "createdBlock": proposalEvent.blockNumber,
    "createdTxHash": proposalEvent.transactionHash,
    "createdTimestamp":blockTimestamp,
    "startBlock": item.startBlock,
    "startTxHash": startTx,
    "startTimestamp": startTimestamp,
    "cancelBlock": cancelBlock,
    "cancelTxHash": cancelTxHash,
    "cancelTimestamp": cancelTimestamp,
    "endBlock": item.endBlock,
    "endTxHash": endTx,
    "endTimestamp": endTimestamp,
    "queuedBlock": queuedBlock,
    "queuedTxHash": queuedTxHash,
    "queuedTimestamp": queuedTimestamp,
    "executedBlock": executedBlock,
    "executedTxHash": executedTxHash,
    "executedTimestamp": executedTimestamp,

    "proposer": item.proposer,
    "eta": item.eta,
    "forVotes": item.forVotes,
    "againstVotes": item.againstVotes,
    "canceled": item.canceled,
    "executed": item.executed,
    "state": state,
    "voterCount":null,
    "abstainedVotes":item.abstainVotes,
    "governorName":"GovernorBravoDelegate",
    "createdAt":"2022-07-19T11:22:11.000Z",
    "updatedAt":"2022-08-19T12:51:04.000Z",
    "actions": actions,
    "blockNumber":22087593
  }
  const resJson = {
    "data": {
      "result": finalProposal
    }
  }
  res.json(resJson);
})

// should be ok
app.get('/voters/:id', (req,res) => {
  const filter = req.query.filter;
  //TODO if !filter => all cases for, abstain, against
  const limit = req.query.limit;
  const proposalIdParam = req.params.id;
  var arg;

  var sumVotes;
  var total;
  var resultsArray = [];
  var proposal;


  const voteCastEvents = governorContract.getPastEvents('VoteCast', {
    fromBlock: 0,
    toBlock: 'latest'
  });

  voteCastEvents.forEach((ballot)=> {
    const { voter, proposalId, support, votes, reason } = ballot.returnValues;
    if(proposalId == proposalIdParam && support == filter) {
      const blockTimestamp = web3.eth.getBlock(ballot.blockNumber).timestamp;
      var item = {
        "address" : voter,
        "hasVoted" : true,
        "support" : support,
        "blockNumber": ballot.blockNumber,
        "blockTimestamp": blockTimestamp,
        "votes": (parseFloat(votes) / 1e18).toFixed(2),
        "reason": reason,
        "createdAt":"2022-05-05T01:36:00.000Z",
        "updatedAt":"2022-05-05T01:36:00.000Z",
        "proposalId":proposalId,
        "votes2":"000000000000000000000000000".concat(String(votes))
      }
      resultsArray.push(item);
    } 
  })

  governorContract.methods.proposals(proposalIdParam).call()
    .then((result) => {
      proposal = result;
    }).catch((error) => {
      console.error('get proposals error:', error);
      return res.sendStatus(400);
  });

  if(filter == 0) {
    arg = "against"
    total = proposal.againstVotes;
  }else if (filter == 1) {
    arg = "for";
    total = proposal.forVotes;
  }else if (filter==2){
    arg = "abstain";
    total = proposal.abstainVotes;
  }

  if(limit < resultsArray.length) {
    resultsArray = resultsArray.splice(0,limit);
  }
  resultsArray.reverse();
  const resJson = {
    "data": {
      "limit": limit,
      "total": resultsArray.length,
      "result": resultsArray,
      "sumVotes": {
        arg : total,
      }
    }
  }
  res.json(resJson);
});
 
// should be ok
app.get('/voters/accounts/:id', (req,res) => {
  var transactions = [];
  const account = req.params.id;
  var balance;
  var votes;
  var delegate; 
  miaLensContract.methods.getMIABalanceMetadata(miaAddress, account).call()
    .then((result)=> {
      balance = result.balance;
      votes = result.votes;
      delegate = result.delegate; 
    }).catch((error) => {
      console.error('get getMIABalanceMetadata error:', error);
      return res.sendStatus(400);
  });

  const txsEventsFrom = miaContract.getPastEvents('Transfer', {
    filter: {from: account},
    fromBlock: 0,
    toBlock: 'latest'
  });
  txsEventsFrom.forEach((tx)=> {
    const { from, to, amount } = tx.returnValues;
    const blockNumber = tx.blockNumber;
    const blockTimestamp = web3.eth.getBlock(blockNumber).timestamp;
    var item = {
      "from": from,
      "to": to,
      "amount": amount,
      "blockNumber": blockNumber,
      "blockTimestamp": blockTimestamp,
      "transactionHash":tx.transactionHash,
      "transactionIndex":tx.transactionIndex,
      "createdAt":"2022-07-26T16:10:50.000Z",
      "updatedAt":"2022-07-26T16:10:50.000Z",
      "type":"transfer"
    }
    transactions.push(item);
  })

  const txsEventsTo = miaContract.getPastEvents('Transfer', {
    filter: {to: account},
    fromBlock: 0,
    toBlock: 'latest'
  });
  txsEventsTo.forEach((tx)=> {
    const { from, to, amount } = tx.returnValues;
    const blockNumber = tx.blockNumber;
    const blockTimestamp = web3.eth.getBlock(blockNumber);
    var item = {
      "from": from,
      "to": to,
      "amount": amount,
      "blockNumber": blockNumber,
      "blockTimestamp": blockTimestamp,
      "transactionHash":tx.transactionHash,
      "transactionIndex":tx.transactionIndex,
      "createdAt":"2022-07-26T16:10:50.000Z",
      "updatedAt":"2022-07-26T16:10:50.000Z",
      "type":"transfer"
    }
    transactions.push(item);
  })
  const resJson = {
    "data": {
      "delegateCount": 1,
      "votes": votes,
      "balance": balance,
      "delegates": delegate,
      "txs": transactions
    }
  }
  res.json(resJson);
})

// should be ok
app.get('/voters/accounts', (req,res) => {
  const offset = req.query.offset;
  const limit = req.query.limit;
  var total;
  var finalArray = [];

  const voteCastEvents = governorContract.getPastEvents('VoteCast', {
    fromBlock: 0,
    toBlock: 'latest'
  });

  voteCastEvents.forEach((ballot)=> {
    const { voter, proposalId, support, votes, reason } = ballot.returnValues;
    const voteCastEventsInternal = governorContract.getPastEvents('VoteCast', {
      filter : {voter: voter},
      fromBlock: 0,
      toBlock: 'latest'
    });
  
    var item = {
      "address":voter,
      "voteWeight":0,
      "proposalsVoted": voteCastEventsInternal.length,
      "votes":"0",
      "createdAt":"2021-12-29T03:05:38.000Z",
      "updatedAt":"2021-12-29T03:05:38.000Z",
      "votes2":"000000000000000000000000000".concat(String(votes))
    }
    finalArray.push(item);
  }) 
  const resJson = {
    "data": {
      "offset": offset,
      "limit": limit,
      "total": total,
      "result": finalArray
    }
  }
  res.json(resJson);
})

// should be ok
app.get('/voters/history/:id', (req,res) => {
  const offset = req.query.offset;
  const limit = req.query.limit;

  const account = req.params.id;
  var results = [];

  const voteCastEvents = governorContract.getPastEvents('VoteCast', {
    filter: {voter : account},
    fromBlock: 0,
    toBlock: 'latest'
  });

  voteCastEvents.forEach((ballot)=> {
      const { voter, proposalId, support, votes, reason } = ballot.returnValues;
      const blockTimestamp = web3.eth.getBlock(ballot.blockNumber).timestamp;

      // GET PROPOSAL OBJECT FROM CONTRACT 
      var proposal = [];
      miaLensContract.methods.getGovProposals(governorAddress,[proposalId]).call()
        .then((result)=> {
          proposal = result
        }).catch((error) => {
          console.error('get getGovProposals error:', error);
          return res.sendStatus(400);
      });
      const firstProposal = proposal[0];

      // GET STATE OF THE PROPOSAL 
      var state;
      governorContract.methods.state(proposalId).call()
        .then((result) => {
          state = result;
        }).catch((error) => {
          console.error('state error:', error);
          return res.sendStatus(400);
      });

      // GET ADDITIONAL INFOS ABOUT THE PROPOSAL FROM EVENT EMITTED AT CREATION

      const proposalsCreatedEvents = governorContract.getPastEvents('ProposalCreated', {
        filter: {id : proposalId},
        fromBlock: 0,
        toBlock: 'latest'
      });
      var proposalEvent = proposalsCreatedEvents[0];
      const { id, proposer, targets, values, signatures, calldatas, startBlock, endBlock, description   } = proposalEvent.returnValues;
      const blockTimestamp1 = web3.eth.getBlock(proposalEvent.blockNumber).timestamp;

        // CHECK IF THE STATE IS WHETHER CANCELED, EXECUTED OR DEFEATED, OR QUEUED
      var cancelBlock = null;
      var cancelTxHash = null;
      var cancelTimestamp = null;
      var queuedBlock = null;
      var queuedTxHash = null;
      var queuedTimestamp = null;
      var executedBlock = null;
      var executedTxHash = null;
      var executedTimestamp = null;

      if(state === "Canceled") {
        // retrieve infos about the event to get cancel infos
        const proposalCanceledEvents = governorContract.getPastEvents('ProposalCanceled', {
          filter : {id : proposalId},
          fromBlock: 0,
          toBlock: 'latest'
        });
        var canceledEvent = proposalCanceledEvents[0];
        cancelBlock = canceledEvent.blockNumber;
        cancelTxHash = canceledEvent.transactionHash;
        cancelTimestamp = web3.eth.getBlock(canceledEvent.blockNumber).timestamp;

      }
      if(state === "Executed") {

        const proposalQueuedEvents = governorContract.getPastEvents('ProposalQueued', {
          filter : {id : proposalId},
          fromBlock: 0,
          toBlock: 'latest'
        });
        var queuedEvent = proposalQueuedEvents[0];
        queuedBlock = queuedEvent.blockNumber;
        queuedTxHash = queuedEvent.transactionHash;
        queuedTimestamp = web3.eth.getBlock(queuedEvent.blockNumber).timestamp;

        const proposalExecutedEvents = governorContract.getPastEvents('ProposalExecuted', {
          filter : {id : proposalId},
          fromBlock: 0,
          toBlock: 'latest'
        });
        var executedEvent = proposalExecutedEvents[0];
        executedBlock = executedEvent.blockNumber;
        executedTxHash = executedEvent.transactionHash;
        executedTimestamp = web3.eth.getBlock(executedEvent.blockNumber).timestamp;
      }

      var startTimestamp = web3.eth.getBlock(firstProposal.startBlock).timestamp;
      var endTimestamp = web3.eth.getBlock(firstProposal.endBlock).timestamp;
      var startTx = web3.eth.getBlock(firstProposal.startBlock).hash;
      var endTx = web3.eth.getBlock(firstProposal.endBlock).hash;



      const finalProposal =  {
        "id": firstProposal.proposalId,
        "description": description,
        "targets": firstProposal.targets,
        "values": firstProposal.values,
        "signatures": firstProposal.signatures,
        "calldatas": firstProposal.calldatas,

        "createdBlock": proposalEvent.blockNumber,
        "createdTxHash": proposalEvent.transactionHash,
        "createdTimestamp": blockTimestamp1,
        "startBlock": firstProposal.startBlock,
        "startTxHash": startTx,
        "startTimestamp": startTimestamp,
        "cancelBlock": cancelBlock,
        "cancelTxHash": cancelTxHash,
        "cancelTimestamp": cancelTimestamp,
        "endBlock": firstProposal.endBlock,
        "endTxHash": endTx,
        "endTimestamp": endTimestamp,
        "queuedBlock": queuedBlock,
        "queuedTxHash": queuedTxHash,
        "queuedTimestamp": queuedTimestamp,
        "executedBlock": executedBlock,
        "executedTxHash": executedTxHash,
        "executedTimestamp": executedTimestamp,

        "proposer": firstProposal.proposer,
        "eta": firstProposal.eta,
        "forVotes": firstProposal.forVotes,
        "againstVotes": firstProposal.againstVotes,
        "canceled": firstProposal.canceled,
        "executed": firstProposal.executed,
        "state": state,
        "voterCount": null,
        "abstainedVotes":firstProposal.abstainVotes,
        "governorName":"GovernorBravoDelegate",
        "createdAt":"2022-07-19T11:22:11.000Z",
        "updatedAt":"2022-08-19T12:51:04.000Z",
      }

      var item = {
        "address": voter,
        "hasVoted":true,
        "support": support,
        "blockNumber": ballot.blockNumber,
        "blockTimestamp": blockTimestamp,
        "votes": (parseFloat(votes) / 1e18).toFixed(2),
        "reason": reason,
        "createdAt":"2021-03-09T03:15:09.000Z",
        "updatedAt":"2021-03-09T03:15:09.000Z",
        "proposalId":proposalId,
        "proposal": finalProposal
      }
      results.push(item);
  })

  if(limit<voteCastEvents.length) {
    results.slice(0,limit);
  }
  results.reverse();
  const resJson = {
    "data": {
      "offset": offset,
      "limit": limit,
      "total": voteCastEvents.length,
      "result": results
    }
  }

  res.json(resJson);

})

// todo 
app.get('/market_history/graph', (req,res) => {
  const asset = req.query.asset;
  const type = req.query.type;
  const limit = req.query.limit;

  const results = [];
  const total = 0;
  // GET PAST EVENT FOR DISTRIBUTESUPPLIERMIA AND DISTRIBUTEBORROWERMIA FOR BLOCKS
  // WITH THE NTOKEN ADDRESS => GET NTOKENMETADATA
  const market_graph = {
    "asset":asset,
    "blockNumber":20606232,
    "blockTimestamp":1660997578,
    "borrowApy":"5.287578858801925254",
    "supplyApy":"0.874159041791359154",
    "borrowVenusApy":"4.401769243871242171",
    "supplyVenusApy":"0.913693361607198697",
    "exchangeRate":"0.0202131888891651556",
    "priceUSD":"0.3406",
    "totalBorrow":"1156266.64680214964553745108",
    "totalSupply":"5476386.07860130411782553493",
    "createdAt":"2022-08-20T12:13:28.000Z",
    "updatedAt":"2022-08-20T13:00:02.000Z"
  };


  const resJson = {
    "data": {
      "limit": limit,
      "total": total,
      "result": results
    }
  }
  res.json(resJson);
})

app.listen(port, () => console.log(`API server running on port ${port}`));
