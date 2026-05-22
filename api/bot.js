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

            const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=
temperature_2m,
relative_humidity_2m,
dew_point_2m,
apparent_temperature,
weather_code,
surface_pressure,
wind_speed_10m,
wind_gusts_10m,
cloud_cover,
visibility
&hourly=
precipitation_probability,
cape,
lifted_index,
convective_precipitation
&models=ecmwf_seamless,gfs_seamless,icon_seamless
&timezone=Asia%2FKolkata
&forecast_days=1`;

            try {

                const response = await fetch(url);
                const data = await response.json();

                if (!data.current) {
                    throw new Error("Invalid weather response");
                }

                const current = data.current;

                const temp = current.temperature_2m;
                const feelsLike = current.apparent_temperature;
                const humidity = current.relative_humidity_2m;
                const dew = current.dew_point_2m;
                const pressure = Math.round(current.surface_pressure);
                const wind = Math.round(current.wind_speed_10m);
                const gust = Math.round(current.wind_gusts_10m);
                const cloud = current.cloud_cover;
                const visibility = current.visibility;

                const rainChance =
                    Math.max(...data.hourly.precipitation_probability.slice(0, 6));

                const cape =
                    Math.max(...data.hourly.cape.slice(0, 6));

                const lifted =
                    Math.min(...data.hourly.lifted_index.slice(0, 6));

                const convective =
                    Math.max(...data.hourly.convective_precipitation.slice(0, 6));

                let stormScore = 0;

                if (rainChance >= 50) stormScore += 20;
                if (rainChance >= 75) stormScore += 20;

                if (cape >= 1000) stormScore += 20;
                if (cape >= 2000) stormScore += 25;

                if (lifted <= -4) stormScore += 20;
                if (lifted <= -6) stormScore += 25;

                if (gust >= 40) stormScore += 15;
                if (gust >= 60) stormScore += 20;

                if (humidity >= 80) stormScore += 10;

                if (convective >= 1) stormScore += 15;

                if (stormScore > 100) stormScore = 100;

                let risk = "⚪ Minimal";

                if (stormScore >= 85) risk = "🔴 Extreme";
                else if (stormScore >= 70) risk = "🟠 Severe";
                else if (stormScore >= 50) risk = "🟡 Moderate";
                else if (stormScore >= 30) risk = "🟢 Low";

                let sky = "Clear";

                if (cloud >= 20 && cloud <= 50)
                    sky = "Partly Cloudy";

                else if (cloud > 50 && cloud <= 80)
                    sky = "Cloudy";

                else if (cloud > 80)
                    sky = "Overcast";

                let replyText = `📍 *Advanced Weather AI Dashboard*\n`;
                replyText += `━━━━━━━━━━━━━━\n`;
                replyText += `🌡️ *Temp:* ${temp}°C\n`;
                replyText += `🥵 *Feels Like:* ${feelsLike}°C\n`;
                replyText += `☁️ *Sky:* ${sky} (${cloud}% Clouds)\n`;
                replyText += `🌧️ *Rain Chance:* ${rainChance}%\n`;
                replyText += `⚡ *Storm Risk:* ${risk} (${stormScore}%)\n`;
                replyText += `💨 *Wind:* ${wind} km/h\n`;
                replyText += `🌪️ *Gust:* ${gust} km/h\n`;
                replyText += `💧 *Humidity:* ${humidity}%\n`;
                replyText += `🌫️ *Visibility:* ${visibility} m\n`;
                replyText += `🌡️ *Dew Point:* ${dew}°C\n`;
                replyText += `📉 *Pressure:* ${pressure} mb\n`;
                replyText += `⚡ *CAPE:* ${Math.round(cape)}\n`;
                replyText += `📉 *Lifted Index:* ${lifted}\n`;
                replyText += `🌩️ *Convective Rain:* ${convective}\n`;
                replyText += `━━━━━━━━━━━━━━\n`;
                replyText += `🧠 _AI Ensemble Forecast Engine_`;

                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: replyText,
                        parse_mode: 'Markdown'
                    })
                });

            } catch (error) {

                console.error(error);

                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: '❌ Failed to fetch advanced weather data.'
                    })
                });
            }
        }
    }

    return res.status(200).send('OK');
}
