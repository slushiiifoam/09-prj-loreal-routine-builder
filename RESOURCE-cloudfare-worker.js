// Copy this code into your Cloudflare Worker script.
// This worker accepts a POST body like:
// {
//   messages: [{ role: "system" | "user" | "assistant", content: "..." }]
// }

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      const apiKey = env.OPENAI_API_KEY;

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing OPENAI_API_KEY in Worker secrets" }),
          { status: 500, headers: corsHeaders },
        );
      }

      const apiUrl = "https://api.openai.com/v1/chat/completions";
      const userInput = await request.json();
      const incomingMessages = Array.isArray(userInput.messages)
        ? userInput.messages
        : [];

      const requestBody = {
        model: "gpt-4o-search-preview",
        messages: incomingMessages,
        max_tokens: 800,
        temperature: 0.7,
      };

      requestBody.web_search_options = {};

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: corsHeaders,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Worker request failed",
          details: String(error),
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
  },
};
