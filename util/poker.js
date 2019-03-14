// Original Version https://github.com/1Computer1/kaado/blob/master/src/games/PokerGame.js
const Discord = require("discord.js");
const Deck = require("./poker/deck.js");
const { Hand } = require("pokersolver");

module.exports = (client) => {
  class PokerUtil {
    constructor() {
      this.guild = client.guilds.get("485173051432894489");

      this.deck = new Deck().fill().shuffle();

      this.players = new Set();
      this.startingPlayers = new Set();
      this.running = false;
      this.started = false;
      this.minPlayers = 2;
      this.maxPlayers = 8;
      this.entryFee = 10;

      this.currentRound = 0;
      this.tableCards = [];
      this.tableMoney = 0;

      this.currentTurn = 0;
      this.turnTimer = null;
      this.playerCards = new Map();
      this.playerBalances = new Map();
      this.allInPlayers = new Set();

      this.totalBets = new Map();
      this.roundBets = new Map();
      this.previousBets = [];

      this.channel = "485927387079639051";
    }

    end() {
      this.players = new Set();
      this.startingPlayers = new Set();
      this.running = false;
      this.started = false;

      this.currentRound = 0;
      this.tableCards = [];
      this.tableMoney = 0;

      this.currentTurn = 0;
      this.turnTimer = null;
      this.playerCards = new Map();
      this.playerBalances = new Map();
      this.allInPlayers = new Set();

      this.totalBets = new Map();
      this.roundBets = new Map();
      this.previousBets = [];

      return true;
    }
    
    get currentPlayer() {
      return this.getPlayer(this.currentTurn);
    }

    getPlayer(index) {
      const playerIDs = this.players.values();

      for (let i = 0; i < index; i++) {
        playerIDs.next();
      }

      return this.guild.member(playerIDs.next().value);
    }

    get previousBet() {
      return this.previousBets[0];
    }

    async send(text, withCards = true) {
      const prefix = "-";

      const embed = new Discord.RichEmbed()
        .addField(`Round ${this.currentRound + 1}`, [
          text,
          `**${this.currentPlayer.user.tag}** has a balance of **${this.playerBalances.get(this.currentPlayer.id)}** Props`,
          "",
          `Type \`${prefix}p bet <amount>\` to bet.`,
          `Type \`${prefix}p check\` to check.`,
          `Type \`${prefix}p fold\` to fold.`,
          `Type \`${prefix}p allIn\` to go all-in.`,
          `Type \`${prefix}p skip\` to skip after an all-in.`
        ]);

      const options = { embed };

      if (this.tableCards.length && withCards) {
        const image = await Deck.drawCards(this.tableCards);
        options.files = [
          {
            attachment: image,
            name: "cards.png"
          }
        ];

        embed
          .setImage("attachment://cards.png")
          .addField("Cards on Table", this.tableCards.map(card => `${card.toEmojiForm()}\u2000(${card})`));
      }

      return client.channels.get(this.channel).send(`${this.currentPlayer}, it is your turn!`, options);
    }

    checkGame() {
      return this.running;
    }

    async startGame() {
      const promises = [];

      for (const playerID of this.players) {
        this.playerBalances.set(playerID, this.entryFee);

        const cards = this.deck.draw(2);
        this.playerCards.set(playerID, cards);
        this.totalBets.set(playerID, 0);

        const imagePromise = Deck.drawCards(cards);
        const embed = new Discord.RichEmbed()
          .addField("Game Started", `A poker game has started in ${client.channels.get(this.channel).name}.`)
          .addField("Your Cards", cards.map(card => `${card.toEmojiForm()}\u2000(${card})`))
          .setImage("attachment://cards.png");

        const promise = imagePromise.then(image => client.users.get(playerID).send({
          files: [
            {
              attachment: image,
              name: "cards.png"
            }
          ],
          embed
        }));

        promises.push(promise);
      }

      await Promise.all(promises);

      this.turnTimer = setTimeout(() => {
        const player = this.currentPlayer;
        if (this.allInPlayers.has(player.id)) {
          this.skip();
        } else {
          this.fold(true);
        }
      }, 60000);

      return this.send("The poker game has started!", false);
    }

    async endGame() {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
      //this.handler.removeGame(this);

      if (this.players.size === 1) {
        const embed = new Discord.RichEmbed()
          .addField("Game Results", [
            "Everyone decided to fold!",
            `**${this.getPlayer(0).user.tag}** wins **${this.tableMoney}** Props`
          ]);

        console.log("WINNER?");
        console.log(this.getPlayer(0).user.tag);

        //const bal = this.client.profiles.get(this.getPlayer(0).user.id, "balance", 0);
        //await this.client.profiles.set(this.getPlayer(0).user.id, "balance", bal + payout);

        const options = {};

        if (this.tableCards.length) {
          const image = await Deck.drawCards(this.tableCards);
          options.file = {
            attachment: image,
            name: "cards.png"
          };

          embed
            .setImage("attachment://cards.png")
            .addField("Cards on Table", this.tableCards.map(card => `${card.toEmojiForm()}\u2000(${card})`));
        }

        options.embed = embed;
        return client.channels.get(this.channel).send(options);
      }

      const hands = [];

      for (const playerID of this.players) {
        const cards = this.playerCards.get(playerID);
        const mergedCards = this.tableCards.concat(cards).map(card => card.toShortForm());
        const hand = Hand.solve(mergedCards);
        hand.player = playerID;
        hand.original = cards;
        hands.push(hand);
      }

      const winners = Hand.winners(hands).map(hand => {
        return client.users.get(hand.player);
      });

      const payout = Math.floor(this.tableMoney / winners.length);
      const embed = new Discord.RichEmbed()
        .addField("Game Results", [
          winners.length.plural("The winner is...", "The winners are..."),
          `**${winners.map(w => w.tag).join("**, **")}**`,
          "",
          `${winners.length.plural("They have", "Each winner has")} won **${payout}** Props`
        ]);

      for (const winner of winners) {
        console.log("WINNERS");
        console.log(winner.tag);
        //const bal = this.client.profiles.get(winner.id, "balance", 0);
        //await this.client.profiles.set(winner.id, "balance", bal + payout); // eslint-disable-line no-await-in-loop
      }

      console.log("Finishing Poker");
      //this.running = false;
      //this.started = false;

      embed.addField("Hands", hands.map(hand => {
        const name = client.users.get(hand.player).tag;
        const desc = hand.descr.replace(",", ":").replace(/'/g, "").replace(/&/g, "and");
        const cards = hand.original.map(card => `${card.toEmojiForm()}\u2000(${card})`).join("\n");
        return `**${name}**: ${desc}\n${cards}`;
      }).join("\n\n"));

      const image = await Deck.drawCards(this.tableCards);

      embed
        .setImage("attachment://cards.png")
        .addField("Cards on Table", this.tableCards.map(card => `${card.toEmojiForm()}\u2000(${card})`));

      this.end();

      return client.channels.get(this.channel).send({
        embed,
        files: [
          {
            attachment: image,
            name: "cards.png"
          }
        ]
      });
    }

    async bet(amount) {
      const player = this.currentPlayer;

      if (this.playerBalances.get(player.id) + (this.roundBets.get(player.id) || 0) - amount === 0) return this.allIn();

      const prevBal = this.playerBalances.get(player.id);
      const prevBet = this.roundBets.get(player.id) || 0;

      this.playerBalances.set(player.id, prevBal + prevBet - amount);
      this.roundBets.set(player.id, amount);
      this.totalBets.set(player.id, this.totalBets.get(player.id) - prevBet + amount);

      this.tableMoney -= prevBet;
      this.tableMoney += amount;

      this.previousBets.unshift(amount);
      if (this.previousBets.length > this.players.size) this.previousBets.pop();

      await client.channels.get(this.channel).send([
        `**${player.user.tag}** has bet **${amount}** Props`,
        `The total pool is now **${this.tableMoney}** Props`
      ]);

      return this.processNextTurn();
    }

    async check() {
      const player = this.currentPlayer;
      this.roundBets.set(player.id, 0);

      this.previousBets.unshift(0);
      if (this.previousBets.length > this.players.size) this.previousBets.pop();

      await client.channels.get(this.channel).send([
        `**${player.user.tag}** has decided to check.`,
        `The total pool is currently **${this.tableMoney}** Props`
      ]);

      return this.processNextTurn();
    }

    async fold(timeout = false) {
      const player = this.currentPlayer;
      this.players.delete(player.id);

      await this.guild.members.get(player.id).removeRole("512635547320188928").catch(console.warn);

      this.currentTurn -= 1;

      if (this.roundBets.has(player.id)) {
        const betIndex = this.previousBets.indexOf(this.roundBets.get(player.id));
        this.previousBets.splice(betIndex, 1);
      }

      await client.channels.get(this.channel).send([
        `**${player.user.tag}** has ${timeout ? "been forced" : "decided"} to fold.`,
        `The total pool is currently **${this.tableMoney}** Props`
      ]);

      if (this.players.size === 1) {
        return this.endGame();
      }

      return this.processNextTurn();
    }

    async allIn() {
      const player = this.currentPlayer;
      const prevBet = this.totalBets.get(player.id);

      this.allInPlayers.add(player.id);
      this.playerBalances.set(player.id, 0);
      this.roundBets.set(player.id, this.entryFee);
      this.totalBets.set(player.id, this.entryFee);

      this.tableMoney -= prevBet;
      this.tableMoney += this.entryFee;

      this.previousBets.unshift(this.entryFee);
      if (this.previousBets.length > this.players.size) this.previousBets.pop();

      await client.channels.get(this.channel).send([
        `**${player.user.tag}** has gone all-in!`,
        `The total pool is now **${this.tableMoney}** Props`
      ]);

      return this.processNextTurn();
    }

    async skip() {
      const player = this.currentPlayer;

      await client.channels.get(this.channel).send([
        `**${player.user.tag}** had gone all-in and is skipping their turn.`,
        `The total pool is currently **${this.tableMoney}** Props`
      ]);

      this.previousBets.unshift(this.entryFee);
      if (this.previousBets.length > this.players.size) this.previousBets.pop();

      return this.processNextTurn();
    }

    incrementTurn() {
      this.currentTurn += 1;
      if (this.currentTurn >= this.players.size) {
        this.currentTurn = 0;
      }
    }

    processNextTurn() {
      clearTimeout(this.turnTimer);
      this.turnTimer = setTimeout(() => {
        const player = this.currentPlayer;
        if (this.allInPlayers.has(player.id)) {
          this.skip();
        } else {
          this.fold(true);
        }
      }, 60000);

      if (this.previousBets.length === this.players.size && new Set(this.previousBets).size === 1) {
        return this.processNextRound();
      }

      this.incrementTurn();
      return this.send("The round continues...", false);
    }

    processNextRound() {
      if (this.allInPlayers.size === this.players.size) {
        for (let i = this.currentRound; i < 3; i++) {
          const cards = this.deck.draw(i === 0 ? 4 : 2);
          cards.shift();
          this.tableCards.push(...cards);
        }

        return this.endGame();
      }

      if (this.currentRound === 0) {
        const cards = this.deck.draw(4);
        cards.shift();
        this.tableCards.push(...cards);
      } else if (this.currentRound >= 3) {
        return this.endGame();
      } else {
        const cards = this.deck.draw(2);
        cards.shift();
        this.tableCards.push(...cards);
      }

      this.currentTurn = 0;
      this.previousBets = [];
      this.roundBets = new Map();

      this.currentRound += 1;
      return this.send(this.currentRound === 1 ? "Three cards have been drawn." : "A card has been drawn.");
    }
  }

  client.pokerUtil = new PokerUtil();
};