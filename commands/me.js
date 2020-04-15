const Command = require("../base/Command.js");
const { ROLE } = require("miniplug");
const { isNil } = require("lodash");

class Me extends Command {
  constructor(client) {
    super(client, {
      name: "me",
      description: "Check your plug profile.",
      usage: "me",
      aliases: ["me"]
    });
  }

  async run(message, args, level) { // eslint-disable-line no-unused-vars
    const cooldown = await this.client.redis.getCommandOnCoolDown("discord", "me@info", "perUser", message.author.id);

    if (cooldown != -2) {
      return;
    }

    try {
      const userDB = await this.client.db.models.users.findOne({
        where: {
          discord: message.author.id,
        },
      });

      if (!isNil(userDB)) {

        await this.client.redis.placeCommandOnCooldown("discord", "me@info", "perUser", message.author.id, 3600);

        const plugUser = this.client.plug.getUser(userDB.id);

        const propsGiven = await this.client.db.models.props.count({ where: { id: userDB.id } });

        const playsCount = await bot.db.models.plays.count({
          where: { dj: userDB.id, skipped: false }
        });

        const songVotes = await bot.db.models.plays.findAll({
          attributes: [
            [fn("SUM", col("plays.woots")
            ), "totalwoots"],
            [fn("SUM", col("plays.grabs")
            ), "totalgrabs"]],
          where: {
            dj: userDB.id,
            skipped: false
          },
          group: ["dj"]
        });

        const songVotesMehs = await bot.db.models.plays.findAll({
          attributes: [
            [fn("SUM", col("plays.mehs")
            ), "totalmehs"]],
          where: {
            dj: userDB.id
          },
          group: ["dj"]
        });

        let color;

        if (plugUser.role === ROLE.HOST) {
          color = "#d1aa0d";
        } else if (plugUser.role === ROLE.COHOST) {
          color = "#d1aa0d";
        } else if (plugUser.role === ROLE.MANAGER) {
          color = "#cc3333";
        } else if (plugUser.role === ROLE.BOUNCER) {
          color = "#9b40e7";
        } else if (plugUser.role === ROLE.DJ) {
          color = "#33ccff";
        } else {
          color = "#b8b8b8";
        }

        let userImage = `https://edmspot.tk/public/images/badges/${userDB.badge}`;

        if (!isNil(userDB.badge)) {
          userImage = `https://edmspot.tk/public/images/badges/${userDB.badge}`;
        } else {
          userImage = message.author.displayAvatarURL();
        }

        return await message.channel.send(new Discord.MessageEmbed()
          .setColor(color)
          .setAuthor(plugUser.username, message.author.displayAvatarURL(), `https://plug.dj/@/${plugUser.username}`)
          .setTitle(`Discord: ${message.author}`)
          .setThumbnail(userImage)
          .addField('ID', userDB.id, true)
          .addField('Joined Room', userDB.createdAt, true)
          .addField('Props', userDB.props, true)
          .addField('Props Given', propsGiven, true)
          .addField('Songs Played', playsCount, true)
          .addField('<:plugGrab:486538625270677505>', songVotes[0].dataValues.totalgrabs, true)
          .addField('<:plugWoot:486538570715103252>', songVotes[0].dataValues.totalwoots, true)
          .addField('<:plugMeh:486538601044115478>', songVotesMehs[0].dataValues.totalmehs, true)
          .setFooter("EDM Spot")
          .setTimestamp());
      } else {
        return message.reply("Your Account isn't linked! Use -link <Plug ID>");
      }
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = Me;
