module.exports = function Command(bot) {
  bot.plugCommands.register({
    names: ["pp"],
    minimumPermission: 1000,
    cooldownType: "perUse",
    cooldownDuration: 21600,
    parameters: "",
    description: "Check Bot PP",
    async execute(rawData) { // eslint-disable-line no-unused-vars
      const me = bot.plug.me();

      await bot.plug.chat(`I have ${me.pp} PP.`);
      return true;
    },
  });
};