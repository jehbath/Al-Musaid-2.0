const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function sendMessage(message, location = null) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  });

  if (!response.ok) {
    throw new Error("تعذر الاتصال بالخادم");
  }

  const data = await response.json();
  return data.response;
}