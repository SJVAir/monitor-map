export async function fetchTempByCoords(coords: [number, number] | Array<number>): Promise<number> {
	if (coords.length !== 2) {
		throw new Error("Invalid coordinates provided for fetching temperature");
	}
	const url = `https://api.weather.gov/points/${coords.toReversed().join(",")}`;
	return fetch(url)
		.then((res) => res.json())
		.then(async (data) => {
			const forecast = await fetch(data.properties.forecastHourly).then((res) => res.json());
			return forecast.properties.periods[0].temperature;
		});
}
