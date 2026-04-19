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
            // alerts=yes pulls active government data
            const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${LAT},${LON}&days=1&alerts=yes`;

            try {
                const response = await fetch(url);
                const data = await response.json();
                
                const temp = data.current.temp_c;
                const condition = data.current.condition.text;
                const wind = data.current.wind_kph; // WeatherAPI gives wind in km/h automatically
                const rainChance = data.forecast.forecastday[0].day.daily_chance_of_rain;
                
                let replyText = `📍 *Bikrampur Weather Outlook:*\n🌡️ Temp: ${temp}°C\n☁️ Condition: ${condition.toUpperCase()}\n🌧️ Today's Rain Chance: ${rainChance}%\n💨 Wind: ${wind} km/h\n`;

                // Add official alerts to the command reply if they exist
                if (data.alerts && data.alerts.alert && data.alerts.alert.length > 0) {
                    replyText += `\n⚠️ *ACTIVE ALERTS:*\n`;
                    data.alerts.alert.forEach(alert => {
                        replyText += `• ${alert.event}\n`;
                    });
                } else {
                    replyText += `\n✅ No official warnings active.`;
                }

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

