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
            
            // Added 'cloud_cover' to the API URL to get the exact cloud percentage
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_gusts_10m,cloud_cover&hourly=precipitation_probability&timezone=Asia%2FKolkata&forecast_days=1`;

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
                const cloudCover = current.cloud_cover; // Get real cloud data

                const futureChances = data.hourly.precipitation_probability.slice(0, 3);
                const maxRainChance = Math.max(...futureChances);

                // 1. Calculate actual sky visibility using Cloud Cover % first
                let skyCondition = "Clear / Sunny";
                if (cloudCover > 20 && cloudCover <= 50) skyCondition = "Mostly Sunny (Some Clouds)";
                else if (cloudCover > 50 && cloudCover <= 80) skyCondition = "Partly Cloudy";
                else if (cloudCover > 80) skyCondition = "Mostly Cloudy / Overcast";

                // 2. Apply severe weather over the actual sky condition
                let condition = skyCondition;
                
                if (code >= 45 && code <= 48) condition = "Hazy / Foggy";
                else if (code >= 51 && code <= 65) condition = "Raining";
                else if (code >= 80 && code <= 82) condition = "Rain Showers";
                else if (code === 95 || code === 96 || code === 99) {
                    if (maxRainChance >= 50) {
                        condition = "⚠️ Thunderstorm Expected";
                    } else {
                        // Instead of forcing "Sunny", append the heat warning to the ACTUAL cloud condition
                        condition = `${skyCondition} (Extreme Heat)`;
                    }
                }

                let replyText = `📍 *Hometown Dashboard (Pinpoint)*\n`;
                replyText += `──────────────────\n`;
                replyText += `🌡️ *Temp:* ${temp}°C (Feels like ${feelsLike}°C)\n`;
                // Now displaying exactly what the clouds are doing
                replyText += `☁️ *Condition:* ${condition.toUpperCase()} (${cloudCover}% Clouds)\n`;
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

