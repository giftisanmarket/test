export async function sendDiscordInquiryNotification(name: string, email: string, message: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("Discord webhook URL is not configured.");
    return { success: false, error: "Webhook URL missing" };
  }

  const payload = {
    username: "Giftisan Contact Bot",
    avatar_url: "https://giftisan.com/icon.png",
    embeds: [
      {
        title: "New Contact Form Inquiry",
        color: 0xda7b5a, // Terracotta accent color (#da7b5a)
        fields: [
          {
            name: "Name",
            value: name || "N/A",
            inline: true,
          },
          {
            name: "Email",
            value: email || "N/A",
            inline: true,
          },
          {
            name: "Message",
            value: message ? (message.length > 1024 ? message.substring(0, 1021) + "..." : message) : "No message provided",
            inline: false,
          },
        ],
        footer: {
          text: "Giftisan Support",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Discord webhook post failed:", res.status, errorText);
      return { success: false, error: `Discord response status ${res.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending Discord webhook notification:", error);
    return { success: false, error };
  }
}
