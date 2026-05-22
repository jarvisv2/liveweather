const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const LAT = '22.892016';
const LON = '87.052826';

const URL =
`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,surface_pressure&timezone=Asia%2FKolkata&forecast_days=2`;

function getRisk(rain, gust, humidity, cloud) {

    let score = 0;

    if (rain >= 30) score += 20;
    if (rain >= 50) score += 25;
    if (rain >= 70) score += 30;

    if (gust >= 30) score += 15;
    if (gust >= 50) score += 25;

    if (humidity >= 80) score += 15;

    if (cloud >= 80) score += 15;

    if (score >= 80)
        return { level: "🔴 EXTREME", score };

    if (score >= 60)
        return { level: "🟠 SEVERE", score };

    if (score >= 40)
        return { level: "🟡 MODERATE", score };

    return { level: "🟢 LOW", score };
}

async function sendTelegramMessage(text) {

    await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'Markdown'
            })
        }
    );
}

async function checkWeather() {

    try {

        const response = await fetch(URL);
        const data = await response.json();

        if (!data.hourly) {
            throw new Error("Weather API failed");
        }

        let message = `🚨 *Advanced Weather Monitor*\n\n`;

        const now = new Date();

        let found = false;

        for (let i = 0; i < 12; i++) {

            const time = new Date(data.hourly.time[i]);

            if (time <= now)
                continue;

            const rain =
                data.hourly.precipitation_probability[i];

            const gust =
                Math.round(data.hourly.wind_gusts_10m[i]);

            const humidity =
                data.hourly.relative_humidity_2m[i];

            const cloud =
                data.hourly.cloud_cover[i];

            const temp =
                data.hourly.temperature_2m[i];

            const risk =
                getRisk(rain, gust, humidity, cloud);

            if (risk.score < 40)
                continue;

            found = true;

            const formatted =
                time.toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });

            message += `━━━━━━━━━━\n`;
            message += `⏰ *${formatted}*\n`;
            message += `⚠️ *Risk:* ${risk.level} (${risk.score}%)\n`;
            message += `🌧️ Rain: ${rain}%\n`;
            message += `💨 Gusts: ${gust} km/h\n`;
            message += `☁️ Clouds: ${cloud}%\n`;
            message += `💧 Humidity: ${humidity}%\n`;
            message += `🌡️ Temp: ${temp}°C\n\n`;
        }

        if (found) {
            await sendTelegramMessage(message);
        } else {
            console.log("No severe weather.");
        }

    } catch (err) {

        console.error(err);

        await sendTelegramMessage(
            "❌ Weather monitor failed."
        );
    }
}

checkWeather();
