const moment = require("moment");
require("moment-timer");

module.exports = function Event(bot, filename, platform) {
  const event = {
    name: "connected",
    platform,
    _filename: filename,
    run: async () => {
      // Following the same reason to wait here as discord ready 
      await bot.wait(2000);

      await bot.plug.sendChat(bot.lang.startup);

      await bot.lottery.start();

      const user = bot.plug.getUsers();
      for (var i = 0; i < user.lenght; i++) {
        await bot.db.models.users.findOrCreate({
          where: { id: user[i].id }, defaults: { id: user[i].id, username: user[i].username }
        });
      }
      
      console.info("[!] Plug Connected!");

      var randomTimedText = [
        "Join our Discord https://discord.gg/GETaTWm",
        "Don't forget to read our Rules https://edmspot.tk/rules",
        "Want a custom Badge? See how here: https://edmspot.tk/faq",
        "Link your account with discord to be able to play discord games and more! See how here: https://edmspot.tk/faq",
        "Think you can be a good addition to the staff? Apply here: https://tinyurl.com/edmspotstaffapp",
        "Start a Trivia Game with -triviapay 1-3 in Discord! https://discord.gg/GETaTWm",
        "Play Slot Machine with -slots 1-3 in Discord! https://discord.gg/GETaTWm"
      ];

      new moment.duration(120, "minutes").timer({loop: true, start: true}, async () => {
        var randomNumber = Math.floor(Math.random() * randomTimedText.length);
        bot.plug.sendChat(randomTimedText[randomNumber]);
      });

      new moment.duration(60, "minutes").timer({loop: true, start: true, executeAfterWait: true}, async () => {
        await bot.utils.timeCover();
      });
    },
    init() {
      bot.plug.on(this.name, this.run);
    },
    kill() {
      bot.plug.removeListener(this.name, this.run);
    },
  };

  bot.events.register(event);
};