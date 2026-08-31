const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


export async function sendMessage(
  message,
  location = {}
) {

  const response = await fetch(
    `${API_BASE_URL}/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({

        message,

        latitude:
          location?.latitude ?? null,

        longitude:
          location?.longitude ?? null,

        location_error:
          location?.location_error ?? null,

      }),
    }
  );


  if (!response.ok) {

    throw new Error(
      "تعذر الاتصال بالخادم"
    );

  }


  const data =
    await response.json();


  return data;
}