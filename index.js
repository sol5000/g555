// Import fetch only if using Node.js < 18
const fetch = require("node-fetch");

// Ensure LESSONS is an integer
process.env.LESSONS = parseInt(process.env.LESSONS ?? "1", 10);

if (!process.env.DUOLINGO_JWT) {
  throw new Error("DUOLINGO_JWT environment variable is required.");
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.DUOLINGO_JWT}`,
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
};

const { sub } = JSON.parse(
  Buffer.from(process.env.DUOLINGO_JWT.split(".")[1], "base64").toString()
);

(async function runHack() {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(
        `https://www.duolingo.com/2017-06-30/users/${sub}?fields=fromLanguage,learningLanguage`,
        { headers }
      );
      const { fromLanguage, learningLanguage } = await response.json();

      let xp = 0;
      const promises = Array.from({ length: process.env.LESSONS }).map(() =>
        fetch("https://www.duolingo.com/2017-06-30/sessions", {
          body: JSON.stringify({
            challengeTypes: [
              "assist",
              "characterIntro",
              "dialogue",
              "form",
              "match",
              "select",
              "translate",
            ],
            fromLanguage,
            isFinalLevel: false,
            isV2: true,
            juicy: true,
            learningLanguage,
            smartTipsVersion: 2,
            type: "GLOBAL_PRACTICE",
          }),
          headers,
          method: "POST",
        })
          .then((res) => res.json())
          .then((session) => {
            return fetch(
              `https://www.duolingo.com/2017-06-30/sessions/${session.id}`,
              {
                body: JSON.stringify({
                  ...session,
                  heartsLeft: 0,
                  startTime: (+new Date() - 60000) / 1000,
                  enableBonusPoints: false,
                  endTime: +new Date() / 1000,
                  failed: false,
                  maxInLessonStreak: 9,
                  shouldLearnThings: true,
                }),
                headers,
                method: "PUT",
              }
            );
          })
          .then((res) => res.json())
          .then((res) => {
            xp += res.xpGain || 0;
          })
      );

      await Promise.all(promises);
      console.log(`🎉 Iteration ${i + 1}: You won ${xp} XP`);
    } catch (error) {
      console.error(`❌ Iteration ${i + 1}: Something went wrong`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Delay 10 seconds
  }
})();