// api/bot.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('OK');
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const body = req.body;

    if (body.message && body.message.text) {
        const text = body.message.text;
        const chatId = body.message.chat.id;

        if (text.startsWith('/weather')) {
            const LAT = '22.892016';
            const LON = '87.052826';
            
            // Open-Meteo Current + Hourly query
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_gusts_10m&hourly=precipitation_probability&timezone=Asia%2FKolkata&forecast_days=1`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (!data.current) {
                    throw new Error("Invalid Open-Meteo response");
                }

                const current = data.current;
                const temp = current.temperature_2m;
                const feelsLike = current.apparent_temperature;
                const humidity = current.relative_humidity_2m;
                const pressure = Math.round(current.surface_pressure);
                const wind = Math.round(current.wind_speed_10m);
                const gust = Math.round(current.wind_gusts_10m);
                const code = current.weather_code;

                // Grab the maximum rain probability over the next 3 hours FIRST
                const futureChances = data.hourly.precipitation_probability.slice(0, 3);
                const maxRainChance = Math.max(...futureChances);

                // STRICT LOGIC: Interpret conditions based on actual rain chances
                let condition = "Clear / Sunny";
                if (code >= 1 && code <= 3) condition = "Partly Cloudy";
                else if (code >= 45 && code <= 48) condition = "Hazy / Foggy";
                else if (code >= 51 && code <= 65) condition = "Raining";
                else if (code >= 80 && code <= 82) condition = "Rain Showers";
                
                // If the model claims a thunderstorm (95, 96, 99)
                else if (code === 95 || code === 96 || code === 99) {
                    // Only display thunderstorm if there is a 50% or higher chance of actual rain
                    if (maxRainChance >= 50) {
                        condition = code === 95 ? "Thunderstorm Possible" : "⚠️ Severe Thunderstorm";
                    } else {
                        // If there is no rain expected, it is just a false alarm caused by extreme heat
                        condition = "Clear / Sunny (Extreme Heat)";
                    }
                }

                let replyText = `📍 *Hometown Dashboard (Pinpoint)*\n`;
                replyText += `──────────────────\n`;
                replyText += `🌡️ *Temp:* ${temp}°C (Feels like ${feelsLike}°C)\n`;
                replyText += `☁️ *Condition:* ${condition.toUpperCase()}\n`;
                replyText += `🌧️ *Next 3-Hr Rain Max:* ${maxRainChance}%\n`;
                replyText += `💨 *Wind:* ${wind} km/h | *Gusts:* ${gust} km/h\n`;
                replyText += `💧 *Humidity:* ${humidity}%\n`;
                replyText += `⏱️ *Pressure:* ${pressure} mb\n`;
                replyText += `──────────────────\n`;
                replyText += `📊 _Data Source: ECMWF Scientific Model_`;

                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: replyText,
                        parse_mode: 'Markdown'
                    })
                });

            } catch (error) {
                console.error("Error executing live command:", error);
            }
        }
    }

    return res.status(200).send('OK');
}

