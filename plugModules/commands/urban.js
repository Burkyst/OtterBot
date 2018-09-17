const request = require("request");

module.exports = function Command(bot) {
  bot.plugCommands.register({
    names: ["urban"],
    minimumPermission: 0,
    cooldownType: "perUser",
    cooldownDuration: 120,
    parameters: "Text",
    description: "Urban Dictionary.",
    async execute(rawData, command, lang) { // eslint-disable-line no-unused-vars
      if (!rawData.args.length) return;
      return;
      const text = rawData.args.join(" ");

      let definition;
      request(`https://api.urbandictionary.com/v0/define?term=${text}`, function(error, response, body) { // eslint-disable-line no-unused-vars
        if (error) return false;
      console.log(JSON.parse(body).list[0]);
        definition = JSON.parse(body).list[0].definition;

        bot.reply(bot.lang.urban, { text: definition });
      });

      this.reply(lang.urban, { text: definition });
      return true;
    },
  });
};