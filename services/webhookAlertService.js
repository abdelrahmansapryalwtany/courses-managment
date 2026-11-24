export const sendWebhookAlert = async ({
  title,
  message,
  color = 2466283,
  fields = [],
}) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const payload = {
    embeds: [
      {
        title,
        description: message,
        color,
        fields: fields.map((f) => ({
          name: f.label,
          value: String(f.value),
          inline: true,
        })),
        footer: { text: "E-Commerce Backend Engine" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("Webhook failed:", res.statusText);
    else console.log("✅ Alert sent successfully!");
  } catch (err) {
    console.error("Webhook notification error:", err.message);
  }
};
