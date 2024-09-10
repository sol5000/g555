try {
	process.env.LESSONS = process.env.LESSONS ?? 1;

	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${process.env.DUOLINGO_JWT}`,
		"user-agent":
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
	};

	const { sub } = JSON.parse(
		Buffer.from(process.env.DUOLINGO_JWT.split(".")[1], "base64").toString(),
	);

	fetch(
		`https://www.duolingo.com/2017-06-30/users/${sub}?fields=fromLanguage,learningLanguage`,
		{
			headers,
		},
	)
		.then((response) => response.json())
		.then(({ fromLanguage, learningLanguage }) => {
			let xp = 0;
			let promises = [];

			for (let i = 0; i < process.env.LESSONS; i++) {
				promises.push(
					fetch("https://www.duolingo.com/2017-06-30/sessions", {
						body: JSON.stringify({
							challengeTypes: [
								"assist",
								"characterIntro",
								// ... rest of the challenge types
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
						.then((response) => response.json())
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
								},
							);
						})
						.then((response) => response.json())
						.then((response) => {
							xp += response.xpGain;
						}),
				);
			}

			Promise.all(promises).then(() => {
				console.log(`🎉 You won ${xp} XP`);
			});
		});
} catch (error) {
	console.log("❌ Something went wrong");
	if (error instanceof Error) {
		console.log(error.message);
	}
}
