export default async function handler(req, res) {

    if (req.method !== 'POST') {
        return res.status(200).send('OK');
    }

    try {

        const TELEGRAM_BOT_TOKEN =
            process.env.TELEGRAM_BOT_TOKEN;

        const body = req.body;

        if (
            body.message &&
            body.message.text
        ) {

            const text = body.message.text;
            const chatId = body.message.chat.id;

            if (text.startsWith('/weather')) {

                const LAT = '22.892016';
                const LON = '87.052826';

                const url =
`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_gusts_10m,cloud_cover&hourly=precipitation_probability&timezone=Asia%2FKolkata&forecast_days=1`;

                const response =
                    await fetch(url);

                const data =
                    await response.json();

                if (!data.current) {
                    throw new Error(
                        "Invalid weather response"
                    );
                }

                const current = data.current;

                const temp =
                    current.temperature_2m;

                const feels =
                    current.apparent_temperature;

                const humidity =
                    current.relative_humidity_2m;

                const pressure =
                    Math.round(
                        current.surface_pressure
                    );

                const wind =
                    Math.round(
                        current.wind_speed_10m
                    );

                const gust =
                    Math.round(
                        current.wind_gusts_10m
                    );

                const cloud =
                    current.cloud_cover;

                const rainChance =
                    Math.max(
                        ...data.hourly
                        .precipitation_probability
                        .slice(0, 6)
                    );

                let stormRisk = 0;

                if (rainChance >= 30)
                    stormRisk += 20;

                if (rainChance >= 50)
                    stormRisk += 30;

                if (gust >= 40)
                    stormRisk += 20;

                if (humidity >= 80)
                    stormRisk += 15;

                if (cloud >= 80)
                    stormRisk += 15;

                let risk = "🟢 LOW";

                if (stormRisk >= 80)
                    risk = "🔴 EXTREME";

                else if (stormRisk >= 60)
                    risk = "🟠 SEVERE";

                else if (stormRisk >= 40)
                    risk = "🟡 MODERATE";

                let sky = "Clear";

                if (cloud >= 20 && cloud <= 50)
                    sky = "Partly Cloudy";

                else if (cloud > 50 && cloud <= 80)
                    sky = "Cloudy";

                else if (cloud > 80)
                    sky = "Overcast";

                let msg = '';

                msg += `📍 *Advanced Weather Dashboard*\n`;
                msg += `━━━━━━━━━━\n`;
                msg += `🌡️ Temp: ${temp}°C\n`;
                msg += `🥵 Feels Like: ${feels}°C\n`;
                msg += `☁️ Sky: ${sky} (${cloud}%)\n`;
                msg += `🌧️ Rain Chance: ${rainChance}%\n`;
                msg += `⚠️ Storm Risk: ${risk}\n`;
                msg += `💨 Wind: ${wind} km/h\n`;
                msg += `🌪️ Gusts: ${gust} km/h\n`;
                msg += `💧 Humidity: ${humidity}%\n`;
                msg += `📉 Pressure: ${pressure} mb\n`;
                msg += `━━━━━━━━━━\n`;
                msg += `🧠 ECMWF Forecast AI`;

                await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: msg,
                            parse_mode: 'Markdown'
                        })
                    }
                );
            }
        }

        return res.status(200).send('OK');

    } catch (err) {

        console.error(err);

        return res.status(500).send('Error');
    }
}
