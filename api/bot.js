// api/bot.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('OK');
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
    const body = req.body;

    if (body.message && body.message.text) {
        const text = body.message.text;
        const chatId = body.message.chat.id;

        if (text.startsWith('/weather')) {
            const LAT = '22.9238'; 
            const LON = '87.0427';
            
            // We changed this from 'weather' to 'forecast' so we can see the Rain Chance!
            const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${WEATHER_API_KEY}&units=metric`;

            try {
                const response = await fetch(forecastUrl);
                const data = await response.json();
                
                // Get the data for the next 3 hours
                const forecast = data.list[0];
                const currentTemp = forecast.main.temp;
                const desc = forecast.weather[0].description;
                const rainChance = Math.round((forecast.pop || 0) * 100); 
                
                // Convert wind speed from m/s to km/h
                const windSpeed = Math.round(forecast.wind.speed * 3.6); 

                const replyText = `📍 *Bikrampur Weather Outlook:*\n🌡️ Temp: ${currentTemp}°C\n☁️ Condition: ${desc.toUpperCase()}\n🌧️ Rain Chance: ${rainChance}%\n💨 Wind: ${windSpeed} km/h`;

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
                console.error("Error:", error);
            }
        }
    }
    return res.status(200).send('OK');
}
