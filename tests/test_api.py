import requests

response = requests.post("http://127.0.0.1:8000/chat", json={"message": "كم رصيدي؟"})

print("Status code:")
print(response.status_code)

print("\nResponse:")
print(response.json())
