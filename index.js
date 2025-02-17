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

// Decode JWT to extract user details
const { sub } = JSON.parse(
  Buffer.from(process.env.DUOLINGO_JWT.split(".")[1], "base64").toString()
);

(async function runHack() {
  for (let i = 0; i < 100; i++) {
    try {
      // Fetch user languages
      const response = await fetch(
        `https://www.duolingo.com/2017-06-30/users/${sub}?fields=fromLanguage,learningLanguage`,
        { headers }
      );

      const { fromLanguage, learningLanguage } = await response.json();

      let xp = 0;

      // Generate practice sessions
      const promises = Array.from({ length: process.env.LESSONS }).map(() =>
        fetch("https://www.duolingo.com/2017-06-30/sessions", {
          method: "POST",
          headers,
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
        })
          .then((res) => res.json())
          .then((session) =>
            fetch(
              `https://www.duolingo.com/2017-06-30/sessions/${session.id}`,
              {
                method: "PUT",
                headers,
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
              }
            )
          )
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

    // Wait 10 seconds before next iteration
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
})();