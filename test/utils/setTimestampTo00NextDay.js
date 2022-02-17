// set exact time for this block at 00 of next day
const setTimestampTo00NextDay = async () => {
  // get current timestamp
  const timestamp = (await hre.ethers.provider.getBlock('latest')).timestamp;

  const nextDay = new Date(timestamp * 1000);
  // set next day
  nextDay.setDate(nextDay.getDate() + 1);
  // set UTC 00:00
  nextDay.setUTCHours(0, 0, 0, 0);
  // to unix timestamp
  const nextDayAt00 = +nextDay / 1000;

  // set timestamp for next block
  await hre.network.provider.send("evm_setNextBlockTimestamp", [nextDayAt00]);
  // mine block to set time
  await hre.network.provider.send("evm_mine");

  // next block will be startingTimestamp
  return { timestamp: nextDayAt00, startingTimestamp: nextDayAt00 + 1 };
};

module.exports = setTimestampTo00NextDay;
