export default async function handler(req, res) {

    if (req.method !== 'POST') {
        return res.status(200).send('OK');
    }

    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const body = req.body;

        if (body.message && body.message.text) {
            const text = body.message.text.trim();
            const chatId = body.message.chat.id;

            // Handle both /weather and /forecast commands
            if (text.startsWith('/weather') || text.startsWith('/forecast')) {
                
                const LAT = '22.892016';
                const LON = '87.052826';

                // Fetching both current conditions and 2 days of detailed hourly arrays
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_gusts_10m,cloud_cover&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,surface_pressure&timezone=Asia%2FKolkata&forecast_days=2`;

                const response = await fetch(url);
                const data = await response.json();
                
                let msg = '';

                // --- OPTION 1: CURRENT WEATHER CONDITIONS ---
                if (text.startsWith('/weather')) {
                    if (!data.current) {
                        throw new Error("Invalid weather response");
                    }

                    const current = data.current;
                    const temp = current.temperature_2m;
                    const feels = current.apparent_temperature;
                    const humidity = current.relative_humidity_2m;
                    const pressure = Math.round(current.surface_pressure);
                    const wind = Math.round(current.wind_speed_10m);
                    const gust = Math.round(current.wind_gusts_10m);
                    const cloud = current.cloud_cover;

                    const rainChance = Math.max(
                        ...data.hourly.precipitation_probability.slice(0, 6)
                    );

                    let stormRisk = 0;
                    if (rainChance >= 30) stormRisk += 20;
                    if (rainChance >= 50) stormRisk += 30;
                    if (gust >= 40) stormRisk += 20;
                    if (humidity >= 80) stormRisk += 15;
                    if (cloud >= 80) stormRisk += 15;

                    let risk = "🟢 LOW";
                    if (stormRisk >= 80) risk = "🔴 EXTREME";
                    else if (stormRisk >= 60) risk = "🟠 SEVERE";
                    else if (stormRisk >= 40) risk = "🟡 MODERATE";

                    let sky = "Clear";
                    if (cloud >= 20 && cloud <= 50) sky = "Partly Cloudy";
                    else if (cloud > 50 && cloud <= 80) sky = "Cloudy";
                    else if (cloud > 80) sky = "Overcast";

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
                } 
                
                // --- OPTION 2: NEXT 6 HOURS FORECAST ---
                else if (text.startsWith('/forecast')) {
                    if (!data.hourly) {
                        throw new Error("Invalid forecast response");
                    }

                    msg += `📅 *6-Hour Weather Forecast*\n`;
                    msg += `━━━━━━━━━━━━━━━━━━━━\n`;

                    const now = new Date();
                    
                    // Locate the upcoming hour index in the API array
                    let startIndex = data.hourly.time.findIndex(t => new Date(t) >= now);
                    if (startIndex === -1) startIndex = 0;

                    // Parse and display the next 6 chronological hours
                    for (let i = startIndex; i < startIndex + 6 && i < data.hourly.time.length; i++) {
                        const time = new Date(data.hourly.time[i]);
                        const formattedTime = time.toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });

                        const temp = data.hourly.temperature_2m[i];
                        const feels = data.hourly.apparent_temperature[i];
                        const rain = data.hourly.precipitation_probability[i];
                        const cloud = data.hourly.cloud_cover[i];
                        const gust = Math.round(data.hourly.wind_gusts_10m[i]);
                        const humidity = data.hourly.relative_humidity_2m[i];

                        // Detailed contextual risk engine per hour
                        let score = 0;
                        if (rain >= 30) score += 20;
                        if (rain >= 50) score += 25;
                        if (rain >= 70) score += 30;
                        if (gust >= 30) score += 15;
                        if (gust >= 50) score += 25;
                        if (humidity >= 80) score += 15;
                        if (cloud >= 80) score += 15;

                        let risk = "🟢 LOW";
                        if (score >= 80) risk = "🔴 EXTREME";
                        else if (score >= 60) risk = "🟠 SEVERE";
                        else if (score >= 40) risk = "🟡 MODERATE";

                        msg += `⏰ *${formattedTime}*\n`;
                        msg += `🌡️ Temp: ${temp}°C (Feels: ${feels}°C)\n`;
                        msg += `🌧️ Rain: ${rain}% | ☁️ Clouds: ${cloud}%\n`;
                        msg += `⚠️ Risk: ${risk}\n`;
                        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
                    }
                    
                    msg += `🧠 ECMWF Forecast AI`;
                }

                // Send generated payload back to Telegram client
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
