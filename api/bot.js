// api/bot.js
export default async function handler(req, res) {
    // Only accept POST requests from Telegram
    if (req.method !== 'POST') {
        return res.status(200).send('OK');
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
    const body = req.body;

    // Check if the message contains text
    if (body.message && body.message.text) {
        const text = body.message.text;
        const chatId = body.message.chat.id;

        // If someone types /weather
        if (text === '/weather' || text === '/weather@YOUR_BOT_USERNAME') {
            
            // Bikrampur Coordinates
            const LAT = '22.9238'; 
            const LON = '87.0427';
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${WEATHER_API_KEY}&units=metric`;

            try {
                const response = await fetch(weatherUrl);
                const data = await response.json();
                
                const currentTemp = data.main.temp;
                const desc = data.weather[0].description;
                const replyText = `📍 *Current Weather in Bikrampur:*\n🌡️ Temp: ${currentTemp}°C\n☁️ Condition: ${desc}`;

                // Send reply to Telegram
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
    
    // Always return 200 OK to Telegram
    return res.status(200).send('OK');
}
