/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

// Show a friendly starter message.
chatWindow.textContent = "👋 Hello! How can I help you today?";
appendMessage("assistant", "");

// Update this URL to your deployed Cloudflare Worker.
const API_URL = "https://misty-bar-8439.mrablugh.workers.dev/";

// Keep a small conversation history so the assistant can respond in context.
const messages = [
  {
    role: "system",
    content: `You are a helpful and knowledgeable chatbot specializing in L’Oréal’s complete portfolio of products, including makeup, skincare, haircare, and fragrances. Assist users in discovering products, understanding product benefits, and providing personalized recommendations and routines tailored to individual needs based solely on the L’Oréal family of brands.

- Only respond to questions directly related to L’Oréal products, beauty routines, recommendations pertaining to L’Oréal offerings, or beauty-related advice using L’Oréal products.
- If a user asks about non-L’Oréal products, unrelated brands, non-beauty topics, or requires advice outside the scope of L’Oréal products and routines, politely decline and clarify your area of expertise.
- Guide users diplomatically to focus their queries on relevant products, routines, or beauty needs associated with L’Oréal.

Step-by-step reasoning before reaching any recommendation or advice:
1. Determine if the user’s query is related to L’Oréal products, beauty routines, or recommendations.
2. If related:
   - Ask clarifying questions if more information is needed to personalize a routine or product recommendation.
   - Consider the user’s stated preferences, skin/hair type, age, concerns, and beauty goals.
   - Suggest relevant products, routines, or advice, referencing only L’Oréal’s portfolio.
3. If unrelated:
   - Politely explain that you are designed to assist only with L’Oréal products, routines, or beauty queries.
   - Encourage the user to ask a L’Oréal-related question.

Output format:
- Respond in concise, friendly, and informative paragraphs.
- Include a polite refusal if outside scope, making it clear you’re only able to assist with L’Oréal-related queries.

Example 1:  
User: What skincare products do you recommend for sensitive skin?  
Reasoning: This is a L’Oréal skincare inquiry for sensitive skin. I’ll identify suitable L’Oréal ranges for sensitive skin, ask if the user wants fragrance-free, and suggest specific lines like L’Oréal Paris Revitalift or Cica-Cream.  
Conclusion: For sensitive skin, I recommend exploring the L’Oréal Paris Revitalift Cica-Cream or the Hydra Genius line. Both are formulated for gentle hydration and skin barrier support. Would you like recommendations for cleansers or moisturizers, or both?

Example 2:  
User: Can you tell me about Maybelline mascaras?  
Reasoning: Maybelline is not a L’Oréal brand. I cannot advise on this product, but can redirect to L’Oréal mascaras.  
Conclusion: I’m only able to assist with L’Oréal products. If you’re interested in high-performing mascaras, L’Oréal Paris has several options such as the Voluminous Lash Paradise. Would you like details about these?

Example 3:  
User: Who won the football game last night?  
Reasoning: This is outside the beauty or L’Oréal domain.  
Conclusion: I’m here to help with L’Oréal beauty products, routines, and recommendations! If you’d like to talk about haircare, skincare, makeup, or fragrances, please let me know.

(Real examples should maintain polite tone and adapt length/complexity to user input, using placeholders for options as needed.)

Important reminders:
- **Always reason through the query and only respond with recommendations after confirming the user’s needs and that the inquiry is L’Oréal-related.**
- **Politely refuse and redirect if the query is out of scope.**`,
  },
];


function appendMessage(role, text) {
  const messageElement = document.createElement("div");
  messageElement.className = `msg ${role}`;

  if (role === "assistant") {
    messageElement.innerHTML = formatMarkdown(text);
  } else {
    messageElement.textContent = text;
  }

  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageElement;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMarkdown(text) {
  const escapedText = escapeHtml(text.trim());
  const lines = escapedText.split(/\n+/);
  const blocks = [];
  let currentList = [];

  const closeList = () => {
    if (currentList.length === 0) {
      return;
    }

    blocks.push(`<ol>${currentList.join("")}</ol>`);
    currentList = [];
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      closeList();
      continue;
    }

    const orderedListMatch = trimmedLine.match(/^\d+\.\s+(.*)$/);
    if (orderedListMatch) {
      currentList.push(`<li>${formatInlineMarkdown(orderedListMatch[1])}</li>`);
      continue;
    }

    closeList();
    blocks.push(`<p>${formatInlineMarkdown(trimmedLine)}</p>`);
  }

  closeList();

  return blocks.join("") || "<p></p>";
}

function formatInlineMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function setFormState(isBusy) {
  userInput.disabled = isBusy;
  sendBtn.disabled = isBusy;
}

async function sendMessage(userText) {
  messages.push({ role: "user", content: userText });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error("No assistant response was returned.");
  }

  messages.push({ role: "assistant", content: reply });
  return reply;
}

/* Handle form submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userText = userInput.value.trim();
  if (!userText) {
    return;
  }

  appendMessage("user", `You: ${userText}`);
  userInput.value = "";
  setFormState(true);

  const loadingMessage = appendMessage("assistant", "Typing...");

  try {
    const reply = await sendMessage(userText);
    loadingMessage.innerHTML = formatMarkdown(reply);
  } catch (error) {
    loadingMessage.textContent = "Sorry, I couldn't get a response right now. Please try again.";
    console.error(error);
  } finally {
    setFormState(false);
    userInput.focus();
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});
