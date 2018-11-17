const { isNil, isObject, get, merge } = require("lodash");
const request = require("request-promise");

module.exports = (client) => {
  class TriviaUtil {
    constructor() {
      this.token = undefined;
      this.baseURL = `https://opentdb.com/api.php?amount=1&type=boolean&encode=url3986&token=${this.token}`;
      this.resetURL = `https://opentdb.com/api_token.php?command=reset&token=${this.token}`;
      this.newURL = "https://opentdb.com/api_token.php?command=request";

      this.players = [];
      this.timer = undefined;
      this.running = false;
    }
    
    start() {
      this.running = true;
      this.players = [];
    }

    end() {
      this.running = false;
      this.timer = undefined;
      this.players = [];

      return true;
    }

    check() {
      return this.running;
    }

    add(id) {
      if (!this.players.includes(id)) {
        this.players.push(id);
        return true;
      }

      return false;
    }

    req(method, body = {}, opts = {}) {
      const options = merge(opts, {
        headers: {
          "User-Agent": "Request-Promise"
        },
        json: true
      });

      if (["POST", "PUT"].includes(method.toUpperCase()) && isObject(body)) {
        options.body = body;
      }

      return request[method.toLowerCase()](this.baseURL, options).catch(async (err) => {     
        console.warn("[!] Trivia Util Error");
        console.warn(err);
      });
    }

    async getQuestion() {
      return this.req("GET", null, { }).then(async (res) => {
        if (isObject(get(res, "results[0]"))) {
          return get(res, "results[0]", {});
        }

        if (get(res, "response_code") === 3) {
          try {
            console.log("Getting new trivia token");
            this.token = await this.getToken();
          } catch (error) {
            console.warn(`Failed to get new token - ${error.message}`);
            return false;
          }

          return this.getQuestion();
        }

        if (get(res, "response_code") === 4) {
          try {
            console.log("Reseting trivia token");
            await this.resetToken();
          } catch (error) {
            console.warn(`Failed to reset token - ${error.message}`);
            return false;
          }

          return this.getQuestion();
        }

        throw Error(`[!] Unexpected Opentdb Response\n${JSON.stringify(res, null, 4)}`);
      });
    }

    async resetToken() {
      return request(this.resetURL).catch(async (err) => {
        console.warn("[!] Trivia Token Reset Error");
        console.warn(err);
      });
    }

    async getToken() {
      return request(this.newURL).then(async (res) => {
        console.log("New Token " + res);
        if (!isNil(get(res, "token"))) {
          console.log("New Token " + get(res, "token"));
          return get(res, "token", {});
        }
      }).catch(async (err) => {
        console.warn("[!] Trivia New Token Error");
        console.warn(err);
      });
    }

    async getUsername(discord) {
      const userDB = await client.db.models.users.findOne({
        where: {
          discord: discord,
        },
      });
  
      if (isNil(userDB)) {
        return null;
      }
  
      const userID = userDB.get("id");
  
      const plugUser = client.plug.getUser(userID);
  
      if (!plugUser || typeof plugUser.username !== "string" || !plugUser.username.length) {
        return null;
      }
  
      return plugUser.username;
    }

    async moveWinner(discord) {
      const userDB = await client.db.models.users.findOne({
        where: {
          discord: discord,
        },
      });
  
      if (isNil(userDB)) {
        return null;
      }
  
      const userID = userDB.get("id");
  
      const plugUser = client.plug.getUser(userID);
  
      if (!plugUser || typeof plugUser.username !== "string" || !plugUser.username.length) {
        return null;
      }

      await client.plug.sendChat("@" + plugUser.username + " Won the Discord Trivia! Moving to 1...");
  
      return client.queue.add(plugUser, 1);
    }
  }

  client.triviaUtil = new TriviaUtil();
};